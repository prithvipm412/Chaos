import json
import os
import queue
import secrets
import threading
import time
from datetime import datetime, timezone

from backend.config import JOBS_DIR

_QUEUE = queue.Queue()
_LOCK = threading.RLock()
STEPS = [('qc', 'Genome QC'), ('genes', 'Gene calling'), ('blast', 'Resistance gene search'), ('predict', 'Antibiotic prediction')]
DISCLAIMER = 'Decision support only — confirm with lab AST. Absence of known genes does not prove susceptibility.'


def save_job(job):
    directory = JOBS_DIR / job['job_id']
    directory.mkdir(parents=True, exist_ok=True)
    with _LOCK:
        temporary = directory / 'job.json.tmp'
        temporary.write_text(json.dumps(job))
        os.replace(temporary, directory / 'job.json')


def get_job(job_id):
    if not isinstance(job_id, str) or len(job_id) != 8 or not job_id.startswith('j_') or any(c not in '0123456789abcdef' for c in job_id[2:]):
        return None
    with _LOCK:
        try:
            return json.loads((JOBS_DIR / job_id / 'job.json').read_text())
        except (OSError, ValueError):
            return None


def create_job(fasta_bytes: bytes | None, sample_id: str | None, label: str, simulate: str | None) -> str:
    job_id = 'j_' + secrets.token_hex(3)
    directory = JOBS_DIR / job_id
    directory.mkdir(parents=True, exist_ok=False)
    (directory / 'input.fasta').write_bytes(fasta_bytes or b'')
    job = dict(job_id=job_id, status='queued', created_at=datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
               label=label, steps=[dict(id=i, label=l, status='pending', elapsed_s=0.0, detail='') for i, l in STEPS],
               progress=0.0, cached=False, error=None, result=None, sample_id=sample_id, simulate=simulate)
    save_job(job)
    _QUEUE.put(job_id)
    return job_id


def annotate_hits(alignments, orfs):
    from backend.card import load_card_index
    from backend.config import CARD_DIR
    index = load_card_index(CARD_DIR)
    positions = {orf['orf_id']: orf for orf in orfs}
    hits = []
    best = {}
    for alignment in alignments:
        if alignment['identity'] < 50 or alignment['coverage'] < 50:
            continue
        previous = best.get(alignment['orf_id'])
        rank = (alignment['bitscore'], alignment['identity'], alignment['coverage'])
        if previous is None or rank > (previous['bitscore'], previous['identity'], previous['coverage']):
            best[alignment['orf_id']] = alignment
    for alignment in best.values():
        annotation = index.get(alignment['aro'])
        if not annotation:
            raise ValueError('CARD annotation missing for ' + alignment['aro'])
        orf = positions[alignment['orf_id']]
        identity, coverage = alignment['identity'], alignment['coverage']
        tier = 'exact' if identity >= 98 and coverage >= 90 else 'strict' if identity >= 80 and coverage >= 80 else 'partial'
        hits.append(dict(alignment, hit_id=f'h{len(hits)+1}', gene=annotation['name'], family=annotation['family'],
                         drug_classes=annotation['drug_classes'], mechanism=annotation['mechanism'], tier=tier,
                         contig=orf['contig'], start=orf['start'], end=orf['end'], strand=orf['strand'],
                         used_for_calls=True, rule='class_match'))
    return hits


def execute_pipeline(data, update=None, simulate=None):
    from backend.qc import parse_and_qc
    from backend.genes import call_genes
    from backend.blast import run_blastp
    from backend.config import BLAST_DB, BLAST_TIMEOUT_S, BLAST_THREADS
    from backend.predict import predict

    def step(index, action, detail):
        if update:
            update(index, 'running', 0, '')
        started = time.monotonic()
        value = action()
        if update:
            update(index, 'done', time.monotonic() - started, detail(value))
        return value

    contigs, qc = step(0, lambda: parse_and_qc(data), lambda value: f"{value[1]['n_contigs']} contigs, {value[1]['total_length']/1e6:.2f} Mb")
    try:
        orfs = step(1, lambda: call_genes(contigs), lambda value: f'{len(value):,} genes')
    except Exception as exc:
        from backend.blast import BlastError
        raise BlastError('GENE_CALLING_FAILED', 'Gene calling failed. Please check the genome and retry.') from exc
    alignments = step(2, lambda: run_blastp(orfs, BLAST_DB, BLAST_TIMEOUT_S, BLAST_THREADS), lambda value: f'{len(value):,} alignments')
    hits = annotate_hits(alignments, orfs)
    prediction = step(3, lambda: predict(hits, qc), lambda value: f"{len(value['calls'])} antibiotics")
    selected = {name for name, seq in sorted(contigs, key=lambda c: len(c[1]), reverse=True)[:30]}
    selected.update(h['contig'] for h in hits)
    return dict(qc=qc, genes_called=len(orfs), contigs=[dict(id=name, length=len(seq)) for name, seq in contigs if name in selected],
                hits=hits, **prediction)


def run_job(job):
    from backend.blast import BlastError
    job['status'] = 'running'
    save_job(job)

    def update(index, status, elapsed, detail):
        job['steps'][index].update(status=status, elapsed_s=round(elapsed, 3), detail=detail)
        job['progress'] = sum(s['status'] == 'done' for s in job['steps']) / 4
        save_job(job)

    try:
        data = (JOBS_DIR / job['job_id'] / 'input.fasta').read_bytes()
        job['result'] = execute_pipeline(data, update, job.get('simulate'))
        job.update(status='done', progress=1.0)
    except Exception as exc:
        code = exc.code if isinstance(exc, BlastError) else 'INTERNAL'
        message = exc.message if isinstance(exc, BlastError) else 'Analysis failed. Please retry.'
        job.update(status='failed', error=dict(code=code, message=message, retryable=True))
        for step in job['steps']:
            if step['status'] == 'running':
                step['status'] = 'failed'
    save_job(job)


def _worker():
    while True:
        job_id = _QUEUE.get()
        job = get_job(job_id)
        try:
            if job:
                run_job(job)
        except Exception:
            if job:
                job.update(status='failed', error=dict(code='INTERNAL', message='Analysis failed. Please retry.', retryable=True))
                for step in job['steps']:
                    if step['status'] == 'running':
                        step['status'] = 'failed'
                save_job(job)
        finally:
            _QUEUE.task_done()


threading.Thread(target=_worker, name='genome-worker', daemon=True).start()
