# HANDOFF.md — shared memory between agents. Append only, newest at bottom.

## Current state (lead rewrites this block at each review)
- Milestone: M0 (plan written 13:45; freeze 16:30)
- Works: boilerplate; BLAST 2.17.0 installed via brew (lead); setup spike in progress (Codex)
- Broken / risks: CORE lane has 13 cards in ~165 min, so it is the bottleneck. BLAST runtime unknown until the spike reports it.
  K-12 intrinsic hits could make a naive engine overclaim (T13/T15/T16 handle this).
- Next 3 cards: CORE T01 (after the spike) → T05 → T07; UI T02 → T03 → T04

## Log

### CORE setup spike — 2026-10-15, ~13:28–13:35 IST
- Started before task cards; PLAN.md was absent at spike start. Authorized scope: `.gitignore`, `backend/requirements.txt`, `backend/pipeline_spike.py`, `scripts/setup_data.sh`, `scripts/get_samples.sh`, this log. No frontend files touched. One Mac: CORE in `~/chaos`; UI worktree `~/chaos-ui` on branch `ui` tracking `origin/main`. All data/results are local, ignored, and shared on this Mac via the CORE checkout; no need to download again in the UI worktree.
- Installation worked: Homebrew BLAST 2.17.0_2 already present (`blastp: 2.17.0+`); backend venv installed pyrodigal 3.7.1 and Biopython 1.88 (pinned in requirements). CARD latest endpoint returned release 4.0.2, timestamp 2026-08-11T13:01:48+00:00, 6,059 protein homolog sequences. `makeblastdb` completed in 0.038s. Initial 4.2-MiB CARD download took ~9.6s; entire spike stayed well within 25 minutes. Original archive, CARD README/license, SHA-256 and source URL retained under `data/card/`.
- Sample downloads worked, including plasmids: KPNIH1 `GCA_000281535.2` (4 contigs, 5,766,615 bp); E. coli EC958 `GCA_000285655.3` (3 contigs, 5,249,449 bp); E. coli K-12 MG1655 `GCF_000005845.2` (1 contig, 4,641,652 bp). Versioned NCBI HTTPS URLs recorded in `data/samples/sources.tsv`; FASTA checksums in `data/samples/checksums.sha256`. Samples are `kp_kpc.fasta`, `ecoli_ctxm.fasta`, `ecoli_k12.fasta`.
- Actual timings with all three jobs running concurrently, two BLAST threads each: KPNIH1 gene calling 13.097s + BLAST 24.536s = 37.640s, 5,547 proteins; EC958 9.590s + 22.881s = 32.475s, 4,925 proteins; K-12 8.468s + 20.679s = 29.150s, 4,319 proteins. These are spike measurements, not serialized production latency guarantees.
- Hits: one best homolog per predicted ORF, e-value <=1e-10, >=50% identity and reciprocal coverage; strict >=80% identity and coverage. KPNIH1: 81 total (52 strict, 29 partial), including KPC-3, SHV-11, TEM-1, FosA6, oqxA/B, sul1, dfrA12, aadA2. KPC-3 is 100% identity / 100% coverage on plasmid CP008830.1:15984–16865. EC958: 80 total (61 strict, 19 partial), including CTX-M-15, CMY-23, TEM-1, OXA-1, sul1, aadA5, tet(A). CTX-M-15 is 100% / 100% on plasmid HG941719.1:98937–99812. K-12: 65 total (50 strict, 15 partial), including ampC and numerous normal efflux/regulatory homologs, with NO KPC or CTX-M hits. Full per-ORF gene/identity/coverage/drug-class/coordinate tables: `data/spike/{sample}.hits.tsv`; raw BLAST, proteins and measured summary JSON adjacent.
- CRITICAL interpretation gotcha: even K-12 has many strict intrinsic homologs. Presence alone must NOT turn normal efflux/regulatory genes or ampC into blanket antibiotic failure predictions; gene/context rules or a conservative acquired-marker shortlist are needed in production. This is a BLAST feasibility spike, not validated CARD RGI or AST. CARD `aro_index.tsv` drug classes are broad annotations: CTX-M-15 includes azole/imidazole entries as well as beta-lactams; do not blindly map every listed class to a clinical antibiotic. Coverage here is min(query coordinate span / query length, reference coordinate span / reference length); coordinates are 1-based inclusive, strand +/-1. Meta-mode gene calling avoids training failures on individual plasmids/short contigs.
- Checks: shell syntax, Python compilation, exact KPC-3/CTX-M-15 assertions and K-12 negative assertions pass; empty/non-FASTA/protein input exits 1 with specific errors; a real BLAST run with `--timeout 1` exits 1 with `BLAST timed out after 1s`. BLAST has a default 180s subprocess deadline, bounded threads, handled missing-tool/missing-database/crash/timeout paths. Scripts use connect timeout 15s, per-attempt download timeout 180s, two retries and atomic `.part` downloads. Data and generated outputs are excluded from git.
- Exact reproduction commands, from `~/chaos`:
  ```sh
  brew install blast
  backend/.venv/bin/pip install pyrodigal==3.7.1 biopython==1.88
  scripts/setup_data.sh
  scripts/get_samples.sh
  mkdir -p data/spike
  backend/.venv/bin/python backend/pipeline_spike.py data/samples/kp_kpc.fasta > data/spike/kp_kpc.hits.tsv 2> data/spike/kp_kpc.run.log
  backend/.venv/bin/python backend/pipeline_spike.py data/samples/ecoli_ctxm.fasta > data/spike/ecoli_ctxm.hits.tsv 2> data/spike/ecoli_ctxm.run.log
  backend/.venv/bin/python backend/pipeline_spike.py data/samples/ecoli_k12.fasta > data/spike/ecoli_k12.hits.tsv 2> data/spike/ecoli_k12.run.log
  ```
- Sources: CARD automatic downloads `https://card.mcmaster.ca/latest/data`; KPNIH1 project `https://www.ncbi.nlm.nih.gov/bioproject/PRJNA73191`; EC958 reference paper `https://pmc.ncbi.nlm.nih.gov/articles/PMC4134206/`. Next: lead can plan around verified target markers and ~40s real pipeline runs; cached results remain local under ignored data/.

T01 done: persistent atomic JSON job API, one daemon queue worker, fake four-step result, sample list and CORS; TestClient roundtrip passes in 8.38s (1 test).
T05 done: FASTA validation, DNA/protein detection, N50/GC/N-content and quality guards; 9 QC tests pass. Invalid DNA characters below the protein threshold receive NOT_FASTA.
T07 done: meta-mode gene caller + bounded BLAST wrapper and outfmt parser; 2 tests pass, real K-12 check 4,319 ORFs / 230 alignments in 16.30s with 6 BLAST threads.
T09 done: cached CARD index loader, full 16-drug panel and prediction v0 with QC guard; 2 prediction tests pass. V0 is deliberately temporary; T13/T15 must replace naive class mapping before clinical interpretation/demo.
T10 done: real QC→genes→BLAST→prediction worker, existing-file sample registry, synchronous upload validation and annotated evidence; all 14 tests pass, EC958 API pipeline 17.776s with Ceftriaxone FAIL. UI T12 can integrate now; v0 class rules remain temporary until T15.
T13 done: acquired-marker RULES and intrinsic exclusions, 19 rule/panel checks pass; named oqxAB rule takes precedence over broad efflux mechanism so its specified effect is UNCERTAIN only.
T15 done: best-per-ORF annotation, conservative rule effects, intrinsic marking, partial/allele caution, sul+dfr pairing, QC guard, evidence reasons and headlines; full backend suite 41 passed in 18.58s, including real EC958 API.
T02 done: API client with timeout and mock fixtures for 16 antibiotics, 4 hits with origin, 5 contigs, and failed BLAST.
