import pytest
from backend.qc import InputError, parse_and_qc


@pytest.mark.parametrize('data,code', [(b'', 'EMPTY_FILE'), (b'  \n', 'EMPTY_FILE'),
    (b'plain text', 'NOT_FASTA'), (b'>header\n', 'NOT_FASTA'),
    (b'>one\nACGT\n>two\n', 'NOT_FASTA'), (b'>protein\nMELKPEPTIDE'*100, 'PROTEIN_FASTA'),
    (b'>tiny\nACGT', 'TOO_SHORT')])
def test_invalid(data, code):
    with pytest.raises(InputError) as error:
        parse_and_qc(data)
    assert error.value.code == code


def test_good():
    contigs, qc = parse_and_qc(b'>genome\n' + b'ACGT' * 500_000)
    assert qc == dict(total_length=2_000_000, n_contigs=1, n50=2_000_000, longest_contig=2_000_000,
                      gc_percent=50, n_percent=0, grade='good', warnings=[])
    assert contigs[0][0] == 'genome'


def test_n50_and_poor():
    _, qc = parse_and_qc(b'>a\n' + b'A'*6000 + b'\n>b\n' + b'N'*3000 + b'\n>c\n' + b'G'*1000)
    assert qc['n50'] == 6000 and qc['n_contigs'] == 3
    assert qc['n_percent'] == 30 and qc['gc_percent'] == 10
    assert qc['grade'] == 'poor' and qc['warnings']


def test_gzip_and_windows():
    import gzip
    data=b'>dna\r\n'+b'acgt'*500+b'\r\n'
    contigs,qc=parse_and_qc(gzip.compress(data))
    assert contigs==[('dna','ACGT'*500)]
    assert qc['total_length']==2000


@pytest.mark.parametrize('data,code', [(b'\x1f\x8bcorrupt','BAD_GZIP'),(b'\xff\xfe','NOT_FASTA'),
    (b'>dna\nACGT\x00','NOT_FASTA')])
def test_binary_and_corrupt(data,code):
    with pytest.raises(InputError) as error:
        parse_and_qc(data)
    assert error.value.code==code


def test_gzip_expansion_cap(monkeypatch):
    import gzip
    from backend import qc
    monkeypatch.setattr(qc,'MAX_DECOMPRESSED_BYTES',1000)
    with pytest.raises(InputError) as error:
        parse_and_qc(gzip.compress(b'>dna\n'+b'A'*2000))
    assert error.value.code=='TOO_LARGE'


def test_upload_errors():
    from fastapi.testclient import TestClient
    from backend.main import app
    from backend.config import MAX_UPLOAD_BYTES
    with TestClient(app) as client:
        r=client.post('/api/jobs',files={'file':('huge.fasta',b'A'*(MAX_UPLOAD_BYTES+1))})
        assert r.status_code==413 and r.json()['error']['code']=='TOO_LARGE'
        r=client.post('/api/jobs')
        assert r.status_code==400 and r.json()['error']['code']=='NO_INPUT'
        r=client.post('/api/jobs',data={'sample_id':'missing'})
        assert r.status_code==400 and r.json()['error']['code']=='UNKNOWN_SAMPLE'
        r=client.post('/api/jobs',files={'file':('bad.gz',b'\x1f\x8bcorrupt')})
        assert r.status_code==400 and r.json()['error']['code']=='BAD_GZIP'
