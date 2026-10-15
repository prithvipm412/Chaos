#!/usr/bin/env bash
# Whole assemblies, including plasmids; accession versions pinned for reproducibility.
set -euo pipefail
cd "$(dirname "$0")/.."
trap 'echo "Sample download failed (line $LINENO); rerun after checking network." >&2' ERR
mkdir -p data/samples
printf 'sample\tassembly\turl\n' > data/samples/sources.tsv
download() {
  local name="$1" accession="$2" path="$3" assembly="$4"
  local url="https://ftp.ncbi.nlm.nih.gov/genomes/all/$path/$assembly/${assembly}_genomic.fna.gz"
  curl --fail --location --silent --show-error --connect-timeout 15 --max-time 180 --retry 2 \
    "$url" -o "data/samples/$name.fna.gz.part"
  gzip -dc "data/samples/$name.fna.gz.part" > "data/samples/$name.fasta.part"
  [[ "$(head -c 1 "data/samples/$name.fasta.part")" == '>' ]]
  mv "data/samples/$name.fna.gz.part" "data/samples/$name.fna.gz"
  mv "data/samples/$name.fasta.part" "data/samples/$name.fasta"
  printf '%s\t%s\t%s\n' "$name" "$accession" "$url" >> data/samples/sources.tsv
  echo "Ready: $name ($accession)"
}
download kp_kpc GCA_000281535.2 GCA/000/281/535 GCA_000281535.2_ASM28153v2
download ecoli_ctxm GCA_000285655.3 GCA/000/285/655 GCA_000285655.3_EC958.v1
download ecoli_k12 GCF_000005845.2 GCF/000/005/845 GCF_000005845.2_ASM584v2
shasum -a 256 data/samples/*.fasta > data/samples/checksums.sha256
