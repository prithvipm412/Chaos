"""DNA FASTA validation and assembly quality metrics."""
import gzip
import io
import zlib

MAX_DECOMPRESSED_BYTES = 100 * 1024 * 1024


class InputError(Exception):
    def __init__(self, code, message, hint='Upload an assembled bacterial genome in FASTA format.'):
        super().__init__(message)
        self.code, self.message, self.hint = code, message, hint


def parse_and_qc(data: bytes) -> tuple[list[tuple[str, str]], dict]:
    if data.startswith(b'\x1f\x8b'):
        try:
            with gzip.GzipFile(fileobj=io.BytesIO(data)) as stream:
                data = stream.read(MAX_DECOMPRESSED_BYTES + 1)
        except (OSError, EOFError, zlib.error) as exc:
            raise InputError('BAD_GZIP', 'The compressed genome file is damaged.', 'Download or export the FASTA gzip again.') from exc
        if len(data) > MAX_DECOMPRESSED_BYTES:
            raise InputError('TOO_LARGE', 'The decompressed genome exceeds 100 MB.', 'Upload a smaller bacterial assembly.')
    if not data or not data.strip():
        raise InputError('EMPTY_FILE', 'The genome file is empty.')
    try:
        text = data.decode('utf-8-sig').strip()
    except UnicodeDecodeError as exc:
        raise InputError('NOT_FASTA', 'This is not a text DNA FASTA file.') from exc
    if any(ord(char) < 32 and char not in '\n\r\t' for char in text):
        raise InputError('NOT_FASTA', 'This contains binary data, not a text DNA FASTA file.')
    if not text.startswith('>'):
        raise InputError('NOT_FASTA', 'The file must start with a FASTA sequence header (>).')
    contigs, parts, identifier = [], [], None
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        if line.startswith('>'):
            if identifier is not None:
                if not parts:
                    raise InputError('NOT_FASTA', 'A FASTA header has no DNA sequence.')
                contigs.append((identifier, ''.join(parts)))
            identifier = line[1:].split()[0] if line[1:].strip() else ''
            if not identifier:
                raise InputError('NOT_FASTA', 'A FASTA header is missing its sequence name.')
            parts = []
        else:
            parts.append(''.join(line.split()).upper())
    if not parts:
        raise InputError('NOT_FASTA', 'A FASTA header has no DNA sequence.')
    contigs.append((identifier, ''.join(parts)))
    if len({name for name, _ in contigs}) != len(contigs):
        raise InputError('NOT_FASTA', 'Contig names must be unique.')
    total = sum(len(seq) for _, seq in contigs)
    invalid = sum(sum(base not in 'ACGTNRYSWKMBDHV' for base in seq) for _, seq in contigs)
    if invalid / total > .1:
        raise InputError('PROTEIN_FASTA', 'This looks like a protein file. Upload the assembled DNA genome (contigs FASTA).')
    if invalid:
        raise InputError('NOT_FASTA', 'The sequence contains invalid DNA characters.')
    if total < 1000:
        raise InputError('TOO_SHORT', 'The DNA sequence is too short to analyze.', 'Upload at least 1,000 bases of assembled DNA.')
    lengths = sorted((len(seq) for _, seq in contigs), reverse=True)
    accumulated = 0
    for n50 in lengths:
        accumulated += n50
        if accumulated * 2 >= total:
            break
    n_percent = 100 * sum(seq.count('N') for _, seq in contigs) / total
    warnings = []
    poor = total < 2_000_000 or n50 < 5000
    fair = len(contigs) > 500 or n50 < 30_000 or n_percent > 2
    if total < 2_000_000:
        warnings.append('Genome is under 2 Mb and may be incomplete.')
    if n50 < 5000:
        warnings.append('Very fragmented assembly: N50 is under 5 kb.')
    elif n50 < 30_000:
        warnings.append('Fragmented assembly: N50 is under 30 kb.')
    if len(contigs) > 500:
        warnings.append('Assembly contains more than 500 contigs.')
    if n_percent > 2:
        warnings.append('More than 2% of bases are unknown (N).')
    qc = dict(total_length=total, n_contigs=len(contigs), n50=n50, longest_contig=lengths[0],
              gc_percent=round(100 * sum(seq.count('G') + seq.count('C') for _, seq in contigs) / total, 2),
              n_percent=round(n_percent, 2), grade='poor' if poor else 'fair' if fair else 'good', warnings=warnings)
    return contigs, qc
