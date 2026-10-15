# HANDOFF.md — shared memory between agents. Append only, newest at bottom.

## Current state (lead rewrites this block at each review)
- Milestone: CORE done through M2.5 (T01-T29 all checked, incl. T28/T29). UI at T11 done, T12 next. Freeze 16:30.
- Works: full real pipeline (QC→genes→BLAST→predict) on all 3 real samples, cached, retry/interrupted recovery, input
  hardening, demo fixtures, ranked "remaining options". UI shell + grid + QC panel against mocks.
- Broken / risks: was broken, now fixed — EC958 headline named CMY-23 (AmpC) instead of CTX-M-15 (the real ESBL),
  fixed in predict.py and pinned as a regression test in T28. DESIGN CHANGE at 14:00: dropping navy for a light
  theme — see FIX F1/F2 at the top of TASKS.md and PLAN.md "Style". T21 and T27 retagged [UI]→[CORE] (see log) —
  Codex now also has frontend cards; checks still run `npm --prefix frontend run build` from ~/chaos.
- Next 3 cards: UI T12 (switch off mocks) → T14 → T17; CORE F1 (light theme tokens, do first) → F2 → T21 (clean, no file overlap)
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

T29 done: all 16 drugs ranked narrowest/first-line to last-resort, NO_KNOWN options sorted and exact PLAN options_note added; 52 backend tests pass. Added backend/jobs.py to card for required cache version bump (v1-options-3); all four sample caches regenerated. All CORE cards complete.

### Lead, 14:00 review follow-up: lane rebalance + theme change
- Rebalance: UI lane is now the critical path (CORE finished T01-T29 early). Asked to retag 2 of the last
  unstarted [UI] cards to [CORE]. Checked actual file overlap against every still-open UI card first:
  - T21 (useJobPolling.js, ConnectionBanner.jsx, App.jsx) → retagged [UI]→[CORE]. Zero overlap with any other
    open card (UI or CORE) — safe to start immediately.
  - T24 (printable report) was the user's other named example, but its files (JobScreen.jsx, index.css) are
    shared with FOUR other still-open UI cards (T12, T14, T17, F2) plus F1/T25 on index.css — retagging it would
    put CORE and UI editing the same file at the same time, the exact thing this ask is meant to avoid. Substituted
    **T27** (recent analyses list) instead: still shares UploadScreen.jsx/api.js with T12, T19, T25 and the new F2,
    so it is retagged [UI]→[CORE] but with an explicit `Depends on: T26, T12, T19, T25, F2` — Codex must not start
    it until all of those are merged to main. This keeps the two lanes' edits sequential on shared files instead
    of concurrent, which is the real risk "no overlap" is protecting against.
  - Both retagged cards note that Codex runs the frontend build check from `~/chaos` (same repo, main branch) and
    that the UI worktree picks up the result on its next `git pull --rebase origin main`.
- Design change: light theme replaces navy (team decision). Added FIX cards F1 and F2 at the top of TASKS.md
  (still [UI] — this is UI surface work, not retagged). Split into two because the full set of files using
  dark-tuned Tailwind shades (bg-red-950/*, text-*-300, etc. — tuned for the old dark navy backdrop, illegible on
  white) is 9 component files, over the 4-files-per-card limit: F1 covers index.css (the actual token values —
  App.jsx needs zero edits, it only ever used the token-bound classes) plus the 3 highest-visibility components
  (AntibiogramGrid, SummaryBar, PipelineProgress); F2 covers the remaining 4 (EvidenceDrawer, QcPanel, JobScreen,
  UploadScreen). PLAN.md gained a "Style" section documenting the override of CLAUDE.md's default navy instruction,
  with the exact hex values, as the authoritative source for this project.
- No lead edits to any frontend file itself — F1/F2/T21/T27 are task cards for the executors, per CLAUDE.md
  ("you do not write feature code").

T12 done: verified real backend integration against :8000; eco_ctxm sample completes with Ceftriaxone FAIL and accurate prediction payload.
F1 done: switched UI to clean light theme tokens in index.css and updated AntibiogramGrid, SummaryBar, PipelineProgress with accessible status tokens.
F2 done: replaced dark-tuned Tailwind shades in EvidenceDrawer, QcPanel, JobScreen, UploadScreen with light theme tokens; all UI components use tokens only.

### Lead: FIX F3 added — false "safe" headline on incomplete genome
- Confirmed live in the cached kpn_kpc_partial result: qc.grade=poor, no_known=0 (per-call QC downgrade to
  UNCERTAIN already works), but summary.headline is still "No major acquired resistance found" — reads as safe
  on a genome we know is incomplete. Root cause: predict.py's headline loop only looks at FAIL-rule hits and
  defaults to that string when there's no FAIL; it never checks qc['grade'], unlike the per-call guard a few lines
  above it which does. Added F3 [CORE] at the top of TASKS.md (above F1/F2, which are both done): on poor/fair QC
  with no FAIL call, headline becomes "Incomplete genome — results uncertain" / "Low-confidence genome — results
  uncertain"; a real FAIL still overrides, since a hit is a hit regardless of assembly quality.

T21 done: added fading token-based connection banner and running-job resume link; build and controlled polling check pass (3 NETWORK errors, retained job, 5s backoff, INTERRUPTED recovery). Added JobScreen.jsx to card to replace its inline banner; live browser stop/restart check unavailable. T27 remains gated on UI T12/T19/T25.

F3 done: poor/fair genomes without FAIL now show uncertainty headlines, while real FAIL retains its mechanism headline; 54 tests pass and all four sample caches regenerated. Added backend/jobs.py to card for required cache version bump v1-qc-headline-4; partial cache headline is now "Incomplete genome — results uncertain". T27 waits for T19/T25 to merge.
T14 done: SVG ContigMap with scaled contig bars, hit markers coloured by tier (exact=blue solid, strict=purple outline, partial=amber dashed), grey intrinsic markers, hover tooltip with gene/coords, click opens EvidenceDrawer via call lookup.
T17 done: collapsible GenesTable with "Used for predictions" and "Intrinsic — informational" sections, identity/coverage mini-bars, tier badges, rule column; acrB appears in intrinsic section.

### Lead: 4 user-testing issues → FIX F4/F5/F6 added at top of TASKS.md
- F4 [CORE]: confirmed live on the current kpn_kpc cache before writing the card — Ciprofloxacin, Colistin AND
  Tigecycline are all NO_KNOWN and all three sit in `options` (Ciprofloxacin literally recommended), because we
  don't detect point mutations and absence of an acquired gene was read as "no known resistance". Fix forces
  UNCERTAIN for these 3 unless an acquired gene is actually found; unchanged otherwise. Sequenced after F3 (same
  file, predict.py) to avoid both edits landing at once.
  Also quietly caught in passing: PLAN.md point 6 never got F3's headline fix reflected back into it (code was
  right, doc was stale) — fixed PLAN.md while touching this section, no code change needed.
- F5 [CORE]: Nitrofurantoin/Fosfomycin are UTI-only but T29's narrowest-first sort put them at the top of
  `options` for ANY infection, including the locked user's serious/systemic ones. Added a `tags` field per call
  (`["urinary_tract_only"]` for those two) and moved them to sort after all non-restricted NO_KNOWN options.
  Sequenced after F4 (same file).
- F6 [UI]: short status labels ("Likely to fail"/"Uncertain"/"No known" — the long "No known resistance found"
  was the one overflowing), an "UTI only" sub-label on tagged option chips (reads F5's tags), and the browser tab
  title "Genome Firewall" (was still "CHAOS boilerplate"). Depends on F5 for the tags field.
- PLAN.md updated: engineered-core points 6 (headline, now also documents F3's poor-QC case that was missing),
  7 (mutation-driven drugs), 8 (tags + urinary-only sort); Job JSON calls[] gained `tags`.


F4 done: Ciprofloxacin/Colistin/Tigecycline default to low-confidence UNCERTAIN when no gene evidence exists and leave options; acquired evidence and Nitrofurantoin handling retained. 56 tests pass; all four caches rebuilt with v1-mutation-5. Pre-existing frontend/package-lock.json metadata edits temporarily stashed for commit/sync isolation, to restore at session end.

F5 done: calls carry urinary_tract_only tags for Nitrofurantoin/Fosfomycin (empty tags elsewhere), and urinary-only options sort last. 57 tests pass; all four caches refreshed and checked. Added backend/jobs.py for cache version v1-urinary-6; PLAN.md already had the tags example. T27 remains gated on UI T19/T25; pre-existing lockfile edits will be restored unchanged after sync.

F6 done: short wrapping status badges, urinary-only option sub-labels, and Genome Firewall tab title; frontend build passes. Added JobScreen.jsx to pass calls into SummaryBar for tags; pre-existing package-lock.json edits preserved. T27 waits on unchecked T19/T25.
T19 done: ErrorPanel with per-code icons, UploadScreen error state, Analyze button disabled on validation error, single-sentence protein error, retryable failed job with retryJob and remounted polling, 404 state, URL simulate support; also ContigMap right-edge length label given breathing room.
