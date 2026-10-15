# HANDOFF.md — shared memory between agents. Append only, newest at bottom.

## Current state (lead rewrites this block at each review)
- Milestone: M2 complete on CORE (all 13 original cards done); UI mid-M1 (T02/T03/T04/T06 done, T08 in progress). Freeze 16:30.
- Works: full real pipeline (QC→genes→BLAST→predict) on all 3 real samples, cached, retry/interrupted recovery, input
  hardening, demo fixtures. UI shell + grid against mocks.
- Broken / risks: was broken, now fixed — EC958 headline named CMY-23 (AmpC) instead of CTX-M-15 (the real ESBL)
  because predict.py picked the first evidence hit by genome position, not by mechanism. Fixed directly (see log).
  UI lane is now the pace-setter: T08/T11/T12/T14/T17/T19/T21 before M3 robustness UI, then M4 polish.
- Next 3 cards: UI T08 (finish, in progress) → T11 → T12 (switch off mocks — CORE's real API is ready and sample ids match);
  CORE spare-capacity T28 → T29 (M2.5, non-blocking)

## Review notes — review-1, 2026-10-15 ~14:00
- CORE finished T01,T05,T07,T09,T10,T13,T15,T16,T18,T20,T22,T23,T26 — all of M0-M3's CORE cards, early.
- Bug found + fixed (lead, backend/predict.py, 9 lines): headline for a Cephalosporins FAIL picked
  `call['evidence'][0]` — whichever hit's gene happened to sit first in the genome — instead of the hit that is
  mechanistically an ESBL. EC958 carries both CMY-23 (plasmid AmpC) and CTX-M-15 (true ESBL); CMY-23's gene call
  landed first, so the headline wrongly said "ESBL-producer (CMY-23)". Fix: headline now ranks by rule name
  (carbapenemase > esbl > plasmid_ampc > narrow_beta_lactamase) across ALL fail-contributing hits, so CTX-M-15 wins
  whenever it's present. Verified against the real saved validation output: headline is now exactly
  "ESBL-producer (CTX-M-15)". Full suite: 50 passed. PLAN.md headline rule updated to match (added AmpC/narrow titles).
- Added CORE spare-capacity cards (M2.5, after M2 in TASKS.md): T28 end-to-end API test over all 3 real samples
  (also pins the headline fix as a regression guard), T29 "remaining options" sorted narrowest-spectrum-first with
  an `options_note` disclaimer (chose this over fluoroquinolone point-mutation calling — that needs CARD's protein
  variant model + reference SNP comparison, a bigger build than fits before 15:35, and the ranked-options panel
  serves the locked user — "what do I actually give instead" — more directly). PLAN.md summary JSON + engineered-core
  point 7 updated to match.
- UI: T02/T03/T04/T06 done, sample ids in frontend/src/mock/samples.json match backend/samples.py exactly (kpn_kpc,
  eco_ctxm, eco_k12, kpn_kpc_partial) — T12 has nothing blocking it. T08 was mid-card (EvidenceDrawer.jsx untracked,
  JobScreen.jsx modified) at review time — not touched, per AGENTS.md leave-it-to-the-agent-that-started-it rule.
- Risk watch for next review: UI lane (7 cards left before M4) is now the critical path, not CORE.

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
T16 done: all real-genome checks pass, outputs data/validation/*.json. Headlines/timings: kpn_kpc "Carbapenem-resistant (KPC-3)" 22.64s; eco_ctxm "ESBL-producer (CMY-23)" 19.29s; eco_k12 "No major acquired resistance found" 16.18s. K-12 has zero FAIL (one partial dfrA3 yields UNCERTAIN). Lead review note: PLAN headline rule currently labels any 3GC failure ESBL, so EC958 headline names its first evidence CMY-23 (AmpC), despite CTX-M-15 also present; prefer explicit ESBL evidence if refining this after review.
T13/T15 contract alignment done: picked up lead commit 4e25fd2 during sync; classify() now emits acquired/intrinsic/unclassified and all result hits expose origin; intrinsic classification takes priority, unclassified partials are not used. 31 focused checks pass including saved real K-12 evidence → zero FAIL. Ambiguity resolved: acquired mcr/armA/rmt are explicit target-alteration exceptions so their named PLAN rules still work; unknown target-alteration hits stay intrinsic. This supersedes the earlier oqxAB precedence note.
T18 done: chunk-bounded 25 MiB uploads, magic-byte gzip with 100 MiB expansion cap, corrupt/binary/UTF8 errors, lowercase and CRLF support; 15 QC/API input checks pass.
T03 done: app shell, hash routing (#/ and #/job/<id>), drag-and-drop upload zone with client-side validation, sample selection and analyze triggers.
T20 done: simulated BLAST timeout, same-id retry, startup INTERRUPTED recovery and atomic state reset; 2 real API recovery tests pass in 48.47s, 15 input tests pass. Added test_api_skeleton.py and test_qc.py to card file list for required recovery checks and test-store isolation.
T22 done: versioned SHA-256 result cache, corrupt-cache fallback and scripts/precompute.py; all 3 real samples cached (22.08s/20.26s/26.65s compute), cached KPNIH1 API completes in 1.688s with cached:true. Simulation bypasses cache; bump jobs.RULES_VERSION whenever prediction rules change.
T04 done: useJobPolling hook with 1500ms polling, PipelineProgress component with 4 step indicators and progress bar, and JobScreen with resume-on-refresh.
T23 done: deterministic demo fixture script, 5 committed small upload fixtures (generated-file exception documented on card), existing registry now exposes partial sample. Actual partial pipeline 5.99s, 1.2 Mb/60 contigs, QC poor, zero NO_KNOWN, no KPC-3; partial cache precomputed. All four bad-file errors and small gzip acceptance verified.
T26 done: recent analyses API returns exact four-field rows newest first with bounded limit; TestClient verifies two real cached jobs and limit=1. README now documents shared-Mac setup, data scripts, both lanes and failure demos. Final backend suite: 50 passed in 14.89s. All 13 CORE cards complete; UI files untouched by CORE. HANDOFF sync conflict resolved by keeping both T04 and T23 lines. Open lead review note remains: EC958 headline first evidence is CMY-23 rather than CTX-M-15.
T06 done: AntibiogramGrid grouped into 6 drug classes with 16 colored tiles, confidence and reasons, SummaryBar with headline and counts chips, and disclaimer.
T08 done: animated EvidenceDrawer slide-over with Esc/backdrop dismiss, hit cards with identity/coverage bars, genomic coords and mechanism, plus empty-evidence state for NO_KNOWN drugs.
T11 done: compact QcPanel displaying total length, contigs, N50, longest contig, GC%, N%, genes called, quality grade badge with warnings, and poor-grade incomplete genome banner.

T28 done: real API regression covers all 3 samples, origins and NO_KNOWN reasons; 51 tests pass. Added backend/jobs.py to card to bump cache version after detecting stale CMY-23 headlines; all four sample caches regenerated with correct CTX-M-15 headline.
