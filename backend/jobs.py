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


def run_job(job):
    job['status'] = 'running'
    for index, step in enumerate(job['steps']):
        step['status'] = 'running'
        save_job(job)
        time.sleep(2)
        step.update(status='done', elapsed_s=2.0, detail='Demo data')
        job['progress'] = (index + 1) / 4
        save_job(job)
    hit = dict(hit_id='h1', gene='KPC-3', aro='ARO:3002312', family='KPC beta-lactamase', drug_classes=['carbapenem'],
               mechanism='antibiotic inactivation', identity=100.0, coverage=100.0, tier='exact', contig='CP008830.1',
               start=15984, end=16865, strand='+', used_for_calls=True, rule='carbapenemase')
    calls = [dict(antibiotic=name, group='Carbapenems' if name != 'Ceftriaxone' else 'Cephalosporins', status='FAIL',
                  confidence='high', evidence=['h1'], reason='KPC-3 carbapenemase (100% id, 100% cov)')
             for name in ['Meropenem', 'Imipenem', 'Ceftriaxone']]
    job['result'] = dict(qc=dict(total_length=5766615, n_contigs=4, n50=5394056, longest_contig=5394056,
                                  gc_percent=57.2, n_percent=0.01, grade='good', warnings=[]), genes_called=5547,
                         contigs=[dict(id='CP008830.1', length=113105)], hits=[hit], calls=calls,
                         summary=dict(fail=3, uncertain=0, no_known=0, headline='Carbapenem-resistant (KPC-3)', options=[]),
                         disclaimer=DISCLAIMER)
    job.update(status='done', progress=1.0)
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
