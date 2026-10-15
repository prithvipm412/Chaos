"""Local feasibility spike, not clinical resistance calls or the production pipeline.

Usage: backend/.venv/bin/python backend/pipeline_spike.py data/samples/kp_kpc.fasta
Print one best CARD homolog hit per predicted ORF (>=50% identity/coverage).
Coverage is min(query and reference coverage); strict hits meet 80/80.
"""
import argparse
import csv
import json
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

import pyrodigal
from Bio import SeqIO

ROOT = Path(__file__).resolve().parents[1]


def run(fasta: Path, card: Path, out: Path, threads: int, timeout: int) -> None:
    started = time.monotonic()
    if not shutil.which("blastp"):
        raise ValueError("blastp missing; run brew install blast")
    if not fasta.is_file() or not 0 < fasta.stat().st_size <= 50_000_000:
        raise ValueError("Input must be a non-empty FASTA file <=50 MB")
    with fasta.open() as handle:
        if not handle.readline().startswith(">"):
            raise ValueError("Expected uncompressed DNA FASTA starting with >")
    records = list(SeqIO.parse(fasta, "fasta"))
    if not records or any(not r.seq or set(str(r.seq).upper()) - set("ACGTRYSWKMBDHVN") for r in records):
        raise ValueError("Empty sequence or invalid DNA alphabet (protein FASTA is unsupported)")
    if len({r.id for r in records}) != len(records):
        raise ValueError("FASTA contig IDs must be unique")
    if not (card / "card_proteins.pin").exists():
        raise ValueError("CARD database missing; run scripts/setup_data.sh")
    with (card / "aro_index.tsv").open() as handle:
        annotations = {r["ARO Accession"]: r for r in csv.DictReader(handle, delimiter="\t")}
    out.mkdir(parents=True, exist_ok=True)
    proteins = out / f"{fasta.stem}.proteins.faa"
    coordinates = {}
    finder = pyrodigal.GeneFinder(meta=True)
    with proteins.open("w") as handle:
        for contig_index, record in enumerate(records):
            for gene_index, gene in enumerate(finder.find_genes(bytes(record.seq))):
                query = f"c{contig_index}_g{gene_index}"
                coordinates[query] = (record.id, gene.begin, gene.end, gene.strand)
                handle.write(f">{query}\n{gene.translate().rstrip('*')}\n")
    called = time.monotonic()
    if not coordinates:
        raise ValueError("No protein-coding genes found")
    raw = out / f"{fasta.stem}.blast.tsv"
    command = ["blastp", "-query", str(proteins), "-db", str(card / "card_proteins"),
               "-out", str(raw), "-num_threads", str(threads), "-evalue", "1e-10",
               "-max_target_seqs", "100", "-max_hsps", "1", "-outfmt",
               "6 qseqid sseqid pident length qlen slen qstart qend sstart send evalue bitscore"]
    try:
        subprocess.run(command, check=True, capture_output=True, text=True, timeout=timeout)
    except subprocess.TimeoutExpired as exc:
        raise ValueError(f"BLAST timed out after {timeout}s") from exc
    except subprocess.CalledProcessError as exc:
        raise ValueError(f"BLAST failed: {exc.stderr[-1500:]}") from exc
    aligned = time.monotonic()
    best = {}
    for line in raw.read_text().splitlines():
        query, subject, identity, length, qlen, slen, qstart, qend, sstart, send, evalue, score = line.split("\t")
        query_coverage = 100 * (int(qend) - int(qstart) + 1) / int(qlen)
        subject_coverage = 100 * (int(send) - int(sstart) + 1) / int(slen)
        coverage = min(query_coverage, subject_coverage)
        if float(identity) < 50 or coverage < 50:
            continue
        match = re.search(r"ARO:\d+", subject)
        if not match or match[0] not in annotations:
            raise ValueError(f"CARD annotation missing for {subject}")
        annotation = annotations[match[0]]
        contig, start, end, strand = coordinates[query]
        hit = dict(query=query, gene=annotation["ARO Name"], aro=match[0],
                   identity_pct=float(identity), coverage_pct=round(coverage, 2),
                   query_coverage_pct=round(query_coverage, 2), reference_coverage_pct=round(subject_coverage, 2),
                   drug_class=annotation["Drug Class"], contig=contig, start=start, end=end,
                   strand=strand, tier="strict" if float(identity) >= 80 and coverage >= 80 else "partial",
                   bitscore=float(score))
        rank = (hit["bitscore"], hit["identity_pct"], coverage)
        if query not in best or rank > best[query][0]:
            best[query] = (rank, hit)
    fields = ["query", "gene", "aro", "identity_pct", "coverage_pct", "query_coverage_pct",
              "reference_coverage_pct", "drug_class", "contig", "start", "end", "strand", "tier", "bitscore"]
    writer = csv.DictWriter(sys.stdout, fieldnames=fields, delimiter="\t")
    writer.writeheader()
    writer.writerows(hit for _, hit in best.values())
    summary = dict(sample=fasta.name, contigs=len(records), bases=sum(len(r) for r in records),
                   proteins=len(coordinates), hits=len(best), strict=sum(h["tier"] == "strict" for _, h in best.values()),
                   gene_call_seconds=round(called - started, 3), blast_seconds=round(aligned - called, 3),
                   total_seconds=round(time.monotonic() - started, 3),
                   note="Best homolog per ORF; intrinsic genes are included. Not AST or validated CARD RGI calls.")
    (out / f"{fasta.stem}.summary.json").write_text(json.dumps(summary, indent=2) + "\n")
    print(json.dumps(summary), file=sys.stderr)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("fasta", type=Path)
    parser.add_argument("--card", type=Path, default=ROOT / "data/card")
    parser.add_argument("--out", type=Path, default=ROOT / "data/spike")
    parser.add_argument("--threads", type=int, default=2)
    parser.add_argument("--timeout", type=int, default=180)
    args = parser.parse_args()
    if not 1 <= args.threads <= 8 or not 1 <= args.timeout <= 600:
        parser.error("threads must be 1..8; timeout must be 1..600 seconds")
    try:
        run(args.fasta, args.card, args.out, args.threads, args.timeout)
    except (OSError, ValueError, csv.Error) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
