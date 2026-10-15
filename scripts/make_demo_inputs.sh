#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
trap 'echo "Demo fixture setup failed; run setup_data.sh and get_samples.sh first." >&2' ERR
backend/.venv/bin/python - <<'PY'
import gzip
from pathlib import Path
from Bio import SeqIO

samples=Path('data/samples')
records=list(SeqIO.parse(samples/'kp_kpc.fasta','fasta'))
chromosome=max(records,key=lambda r:len(r.seq))
if len(chromosome.seq)<1_200_000:
    raise ValueError('KPNIH1 chromosome is too short for the 1.2 Mb partial demo')
partial=samples/'kpn_kpc_partial.fasta'
with partial.open('w') as handle:
    for index in range(60):
        handle.write(f'>{chromosome.id}_part{index+1:02d}\n{chromosome.seq[index*20000:(index+1)*20000]}\n')
directory=Path('demo_inputs')
directory.mkdir(exist_ok=True)
proteins=[]
for record in SeqIO.parse('data/card/protein_fasta_protein_homolog_model.fasta','fasta'):
    proteins.append(record)
    if len(proteins)==3:
        break
if len(proteins)!=3:
    raise ValueError('CARD protein FASTA missing or incomplete')
SeqIO.write(proteins,directory/'protein.fasta','fasta')
(directory/'empty.fasta').write_bytes(b'')
(directory/'notes.txt').write_text('Patient notes are not an assembled DNA genome.\n')
(directory/'header_only.fasta').write_text('>missing_sequence\n')
small=f'>{chromosome.id}_20kb\n{chromosome.seq[:20000]}\n'.encode()
(directory/'genome_small.fasta.gz').write_bytes(gzip.compress(small,mtime=0))
print('Demo inputs ready: partial genome = 60 contigs / 1,200,000 bp, no plasmids; 5 upload fixtures.')
PY
