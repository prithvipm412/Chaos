import subprocess
import pytest
from backend.blast import BlastError, parse_outfmt6, run_blastp


def test_parse():
    lines = ['q1\tgb|ABC|ARO:3000001|gene\t100\t100\t100\t100\t1\t100\t1\t100\t1e-50\t200',
             'q2\tgb|DEF|ARO:3000002|other\t70\t80\t100\t200\t1\t80\t1\t80\t1e-20\t100',
             'q3\tgb|GHI|ARO:3000003|third\t60\t80\t100\t100\t1\t80\t1\t80\t1e-20\t100']
    hits = parse_outfmt6('\n'.join(lines))
    assert len(hits) == 2
    assert hits[0]['aro'] == 'ARO:3000001' and hits[0]['coverage'] == 100
    assert hits[1]['orf_id'] == 'q3' and hits[1]['coverage'] == 80


def test_timeout(monkeypatch):
    def timeout(*args, **kwargs):
        raise subprocess.TimeoutExpired('blastp', 1)
    monkeypatch.setattr(subprocess, 'run', timeout)
    with pytest.raises(BlastError) as caught:
        run_blastp([{'orf_id':'a','protein':'MPEPTIDE'}], 'missing', 1, 1)
    assert caught.value.code == 'BLAST_TIMEOUT'
