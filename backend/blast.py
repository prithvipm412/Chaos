"""Bounded BLASTP execution and CARD homolog alignment parsing."""
import re
import subprocess
import tempfile
from pathlib import Path


class BlastError(Exception):
    def __init__(self, code, message):
        super().__init__(message)
        self.code, self.message = code, message


def parse_outfmt6(text) -> list[dict]:
    hits = []
    for line in text.splitlines():
        if not line.strip():
            continue
        try:
            query, subject, identity, length, qlen, slen, qs, qe, ss, se, evalue, score = line.split('\t')
            coverage = min(100 * (int(qe) - int(qs) + 1) / int(qlen),
                           100 * (int(se) - int(ss) + 1) / int(slen))
            identity = float(identity)
            aro = re.search(r'ARO:\d+', subject)
            if not aro:
                raise ValueError('No CARD ARO accession')
            if identity >= 50 and coverage >= 50:
                hits.append(dict(orf_id=query, aro=aro[0], ref_name=subject.split(aro[0], 1)[1].strip('|'),
                                 identity=identity, coverage=coverage, bitscore=float(score)))
        except (ValueError, ZeroDivisionError) as exc:
            raise BlastError('BLAST_FAILED', 'Resistance search returned invalid alignment data.') from exc
    return hits


def run_blastp(orfs, db_path, timeout_s, threads) -> list[dict]:
    if not orfs:
        return []
    with tempfile.TemporaryDirectory(prefix='genome-blast-') as directory:
        query, output = Path(directory) / 'proteins.faa', Path(directory) / 'hits.tsv'
        query.write_text(''.join(f">{o['orf_id']}\n{o['protein']}\n" for o in orfs))
        command = ['blastp', '-query', str(query), '-db', str(db_path), '-out', str(output),
                   '-num_threads', str(threads), '-evalue', '1e-10', '-max_target_seqs', '100', '-max_hsps', '1',
                   '-outfmt', '6 qseqid sseqid pident length qlen slen qstart qend sstart send evalue bitscore']
        try:
            subprocess.run(command, check=True, capture_output=True, text=True, timeout=timeout_s)
            return parse_outfmt6(output.read_text())
        except subprocess.TimeoutExpired as exc:
            raise BlastError('BLAST_TIMEOUT', f'Resistance search timed out after {timeout_s} s') from exc
        except (subprocess.CalledProcessError, OSError) as exc:
            raise BlastError('BLAST_FAILED', 'Resistance search failed. Check that BLAST and the CARD database are installed.') from exc
