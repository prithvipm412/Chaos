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
