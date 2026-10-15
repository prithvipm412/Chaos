"""Meta-mode gene prediction; coordinates are 1-based inclusive."""
import pyrodigal


def call_genes(contigs) -> list[dict]:
    finder = pyrodigal.GeneFinder(meta=True)
    orfs = []
    for contig_index, (name, sequence) in enumerate(contigs):
        for index, gene in enumerate(finder.find_genes(sequence.encode('ascii'))):
            orfs.append(dict(orf_id=f'c{contig_index}_g{index}', contig=name, start=gene.begin, end=gene.end,
                             strand='+' if gene.strand == 1 else '-', protein=gene.translate().rstrip('*')))
    return orfs
