#!/usr/bin/env bash
# Latest CARD release; original archive, metadata and download provenance stay local.
set -euo pipefail
cd "$(dirname "$0")/.."
trap 'echo "CARD setup failed (line $LINENO); check network, tar and BLAST installation." >&2' ERR
command -v makeblastdb >/dev/null || { echo 'Install BLAST: brew install blast' >&2; exit 1; }
mkdir -p data/card
curl --fail --location --silent --show-error --connect-timeout 15 --max-time 180 --retry 2 \
  https://card.mcmaster.ca/latest/data -o data/card/card-data.tar.bz2.part
tar -tjf data/card/card-data.tar.bz2.part >/dev/null
mv data/card/card-data.tar.bz2.part data/card/card-data.tar.bz2
tar -xjf data/card/card-data.tar.bz2 -C data/card
test -s data/card/protein_fasta_protein_homolog_model.fasta
test -s data/card/aro_index.tsv
makeblastdb -in data/card/protein_fasta_protein_homolog_model.fasta -dbtype prot \
  -out data/card/card_proteins > data/card/makeblastdb.log 2>&1
{ date -u '+downloaded_utc=%Y-%m-%dT%H:%M:%SZ';
  echo 'source=https://card.mcmaster.ca/latest/data';
  shasum -a 256 data/card/card-data.tar.bz2;
  blastp -version | head -1;
} > data/card/provenance.txt
echo 'CARD ready: data/card/card_proteins (protein homolog models only)'
