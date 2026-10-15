# SCOPE.md

## Problem statement
Genome Firewall — Antibiotic Resistance: build a system that uses a reconstructed bacterial genome
to predict whether antibiotics are likely to work or fail.

## Locked scoping statement (submitted)
- Who: A microbiologist or doctor at an Indian district hospital treating a serious bacterial infection.
- What breaks: Lab antibiotic tests take 2–3 days, so patients get broad antibiotics by guesswork while resistant infections spread.

## Product direction (team decision)
Non-chat surface: upload a genome FASTA (or pick a sample) → live pipeline progress → antibiogram dashboard.

Pipeline (our engineered core):
1. Genome QC: validate FASTA, DNA alphabet, size, contig count, total length, N50, GC%, N-content.
2. Gene calling with pyrodigal.
3. BLASTP predicted proteins vs CARD protein homolog model (makeblastdb at startup).
4. Our prediction engine: hits → genes → drug classes/antibiotics (CARD aro_index), with thresholds
   (strict: ≥80% identity & ≥80% coverage; partial: lower → "uncertain").
5. Three-state call per antibiotic, never overclaiming:
   - LIKELY TO FAIL (resistance gene found, with evidence)
   - NO KNOWN RESISTANCE FOUND (likely to work, not guaranteed; confidence lowered for poor assemblies)
   - UNCERTAIN (partial hits, low-quality genome)

Dashboard: antibiotic × status grid (colour-coded), evidence drawer per call (gene, identity, coverage,
contig, position), genome QC panel, contig map with hit locations, printable report,
"decision support only — confirm with lab AST" disclaimer.

Robustness (must demo live):
- Bad input: non-FASTA, protein FASTA, empty/truncated file, huge file, gzip → clear specific errors.
- Partial/poor genome → warnings + confidence downgraded, never a false "safe".
- No hits → "no known resistance found", not "susceptible".
- Pipeline failure/timeout (BLAST crash) → job marked failed with reason + retry button.
- Refresh mid-analysis → job ID persisted, UI resumes polling.
- Sample genomes precomputed + cached so the demo works even if a step is slow.

Architecture: FastAPI + background jobs (job state in SQLite or JSON files), POST /api/jobs (upload),
GET /api/jobs/{id} (status + step progress + results). React frontend polls.
No LLM required; no chat interface.

Demo samples: one carbapenem-resistant genome (e.g. K. pneumoniae with blaKPC), one ESBL
(E. coli with blaCTX-M), one susceptible reference (E. coli K-12 MG1655).

## Clock
- Code freeze: 16:30
- Repo submission: before demos begin (~17:00, confirm with organisers)
- Our demo slot: TBD

## Team
- Mac (lead): Claude Code + Codex rotation (cx1→cx2→cx3), lane CORE
- Second laptop: Antigravity, lane UI