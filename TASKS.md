# TASKS.md — written by the lead
Executors: take the first unchecked card in your lane. [CORE] = Codex (~/chaos). [UI] = Antigravity (~/chaos-ui).
Every card: read PLAN.md first, since the JSON shapes there are the contract. Touch only the listed files.
CORE checks run from `~/chaos`. UI checks run from `~/chaos-ui`. UI build check = `npm --prefix frontend run build`.
UI pushes with `git pull --rebase origin main && git push origin HEAD:main`.

## FIX — lead puts urgent fixes here (do these first)

## M0 — Skeleton end to end with fake data (target 14:00)
- [x] T01 [CORE] Job API skeleton with a fake runner
  Files: backend/main.py, backend/jobs.py, backend/config.py, backend/requirements.txt
  Do: Add python-multipart, httpx, pytest, pyrodigal, biopython to requirements.txt and install them in backend/.venv.
  config.py: DATA_DIR (env DATA_DIR, default <repo>/data), CARD_DIR, SAMPLES_DIR, JOBS_DIR, CACHE_DIR,
  BLAST_DB = DATA_DIR/card/card_proteins (built by scripts/setup_data.sh), MAX_UPLOAD_BYTES=25 MB, BLAST_TIMEOUT_S=300, BLAST_THREADS=6.
  jobs.py: `create_job(fasta_bytes: bytes|None, sample_id: str|None, label: str, simulate: str|None) -> str`,
  `get_job(job_id) -> dict|None`. Job saved at JOBS_DIR/<id>/job.json, written atomically (tmp file + os.replace).
  One daemon worker thread pulls from a queue.Queue. The FAKE runner walks the 4 steps (2 s each), then sets a result:
  a hardcoded dict matching the PLAN.md Job JSON (1 KPC-3 hit, 3 calls).
  main.py: routes POST /api/jobs, GET /api/jobs/{id}, GET /api/samples (static list of the 4 ids in PLAN.md, inline for now).
  CORS allows GET+POST from http://localhost:5173 and http://127.0.0.1:5173. Errors use the PLAN.md error shape.
  Interface: PLAN.md "HTTP interface" + "Job JSON". Job ids look like `j_` + 6 hex chars.
  Depends on: none
  Done when: backend/tests/test_api_skeleton.py (create it; that is the 5th file and is allowed) uses TestClient: POST sample_id=kpn_kpc
  → 202, poll GET until status=done within 15 s, result.calls non-empty. `python -m pytest backend/tests -q` passes.

- [x] T02 [UI] API client + mock fixtures
  Files: frontend/src/api.js, frontend/src/mock/samples.json, frontend/src/mock/job_done.json, frontend/src/mock/job_failed.json
  Do: job_done.json = the full PLAN.md Job JSON, extended to all 16 antibiotics (9 FAIL, 2 UNCERTAIN, 5 NO_KNOWN), 4 hits
  (KPC-3 exact, TEM-1 exact, aac(6')-Ib-cr strict, acrB origin:intrinsic used_for_calls:false; every hit has `origin`) and 5 contigs. job_failed.json = failed at
  the blast step, error BLAST_TIMEOUT retryable:true, result null. samples.json = the 4 PLAN.md samples.
  api.js exports: `listSamples()`, `createJob({file, sampleId, simulate})`, `getJob(id)`, `retryJob(id)`, `listJobs(limit)`,
  `class ApiError {status, code, message, hint}`. API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'.
  Every fetch has an AbortController timeout: 5 s, or 60 s for createJob. Network failure or timeout → ApiError code 'NETWORK'.
  MOCK = VITE_MOCK==='1' or the URL has ?mock. Mock mode: createJob returns {job_id:'j_mock01'}. getJob builds the job
  from the time since creation (0–2 s qc running, 2–4 s genes, 4–7 s blast, then the done fixture). If the sampleId/filename
  contains "fail" → the failed fixture at 5 s. Filename containing "protein" → throw ApiError 400 PROTEIN_FASTA.
  Depends on: none (mocks)
  Done when: build passes and `grep -c '"antibiotic"' frontend/src/mock/job_done.json` prints 16.

- [x] T03 [UI] App shell, hash routing, upload screen
  Files: frontend/src/App.jsx, frontend/src/components/UploadScreen.jsx
  Do: Hash router: `#/` → UploadScreen, `#/job/<id>` → placeholder "Job <id>" (T04 replaces it). Header "Genome Firewall"
  + subtitle "Antibiotic resistance from a bacterial genome, in minutes". UploadScreen: drag-and-drop zone + file
  button (.fa .fasta .fna .gz), sample cards from listSamples(), "Analyze". Client-side checks before upload: empty
  file, file larger than 25 MB, wrong extension → inline message. On success: localStorage.lastJobId = id, go to #/job/<id>.
  Remove the boilerplate health card. Navy palette from index.css.
  Depends on: T02
  Done when: http://localhost:5173/?mock#/ shows the samples; clicking one routes to #/job/j_mock01.

- [x] T04 [UI] Job screen with live pipeline progress
  Files: frontend/src/components/JobScreen.jsx, frontend/src/components/PipelineProgress.jsx, frontend/src/hooks/useJobPolling.js, frontend/src/App.jsx
  Do: `useJobPolling(jobId) -> {job, error, connectionLost}` polls getJob every 1500 ms while queued/running, then stops.
  PipelineProgress: the 4 steps, each with an icon state (pending/running spinner/done check/failed cross), label, detail,
  elapsed_s, plus an overall progress bar. JobScreen shows the label, the progress, and when done "Results ready"
  (T06 fills this in). Reloading the page on #/job/<id> resumes polling.
  Depends on: T03
  Done when: ?mock flow shows the steps advancing, then done. Refresh mid-run keeps the same job on screen.

## M1 — Happy path on real genomes (target 14:50)
- [x] T05 [CORE] FASTA parsing + genome QC
  Files: backend/qc.py, backend/tests/test_qc.py
  Do: `class InputError(Exception): code, message, hint`. `parse_and_qc(data: bytes) -> tuple[list[tuple[str,str]], dict]`
  returns (contigs [(id, seq)], qc dict). The qc dict has exactly the PLAN.md result.qc keys. Grade rules and warnings follow PLAN.md.
  Raise EMPTY_FILE (no bytes or only whitespace), NOT_FASTA (no '>' header first, or a header without sequence),
  PROTEIN_FASTA (>10% of residues outside ACGTN plus IUPAC DNA codes), TOO_SHORT (total < 1000 bp).
  Messages are for a doctor, e.g. "This looks like a protein file. Upload the assembled DNA genome (contigs FASTA)."
  Depends on: none
  Done when: pytest covers good DNA, empty, plain text, protein, header-only, a tiny genome graded poor, N50 on a known example. All pass.

- [x] T06 [UI] Antibiogram grid + summary bar
  Files: frontend/src/components/AntibiogramGrid.jsx, frontend/src/components/SummaryBar.jsx, frontend/src/components/JobScreen.jsx
  Do: SummaryBar: the headline, counts (fail/uncertain/no_known) as chips, "Options with no known resistance: …".
  Grid: calls grouped by `group`, one tile per antibiotic. Tile colours: FAIL red "Likely to fail", UNCERTAIN amber "Uncertain",
  NO_KNOWN teal "No known resistance found". Each tile shows the confidence and a one-line reason. Never use the word "susceptible".
  The disclaimer is always visible under the grid. A tile click calls `onSelect(call)` (T08 adds the drawer).
  Depends on: T04 (mock data)
  Done when: the mock done job shows 16 tiles in 6 groups, and the headline reads correctly.

- [x] T07 [CORE] Gene calling + BLAST wrappers (port from the spike)
  Files: backend/genes.py, backend/blast.py, backend/tests/test_blast_parse.py
  Do: Move the working logic from backend/pipeline_spike.py (leave the spike file as is).
  `call_genes(contigs) -> list[dict]` with {orf_id, contig, start, end, strand, protein}, using pyrodigal meta mode
  (`GeneFinder(meta=True)`). `run_blastp(orfs, db_path, timeout_s, threads) -> list[dict]` writes the query FASTA to a temp dir and
  runs the spike's exact blastp command/outfmt via `subprocess.run(..., timeout=timeout_s)`. Returns ALL hits with id≥50 and cov≥50
  as {orf_id, aro, ref_name, identity, coverage, bitscore}, where coverage = min(query cov, ref cov) as in the spike (best-per-ORF is done in T15). Raise `BlastError(code, message)` with BLAST_TIMEOUT or BLAST_FAILED.
  Depends on: setup spike (HANDOFF.md)
  Done when: test parses a 3-line canned outfmt-6 string (put the parser in `parse_outfmt6(text)`), and a quick manual run on
  eco_k12 returns >0 hits (record the timing in HANDOFF).

- [ ] T08 [UI] Evidence drawer
  Files: frontend/src/components/EvidenceDrawer.jsx, frontend/src/components/JobScreen.jsx
  Do: A slide-over from the right (it animates and closes with Esc or the backdrop). It shows the antibiotic, the status and the reason,
  then one card per evidence hit_id (gene, family, identity %, coverage % as small bars, tier badge, contig:start–end,
  strand, mechanism). For NO_KNOWN: "No known resistance genes for this drug were found in this genome," plus the reason.
  Depends on: T06
  Done when: clicking Meropenem in mock mode shows the KPC-3 evidence card.

- [x] T09 [CORE] CARD index + panel + prediction v0
  Files: backend/card.py, backend/rules.py, backend/predict.py, backend/tests/test_predict.py
  Do: card.py: `load_card_index(card_dir) -> dict[aro, {name, family, drug_classes: list[str], mechanism}]` from
  aro_index.tsv (split Drug Class on ';', lowercase it, and strip " antibiotic"). Cache it in a module global.
  rules.py: `PANEL = [{"antibiotic","group","classes":[CARD drug classes]}]` for the 16 PLAN.md drugs.
  predict.py v0: `predict(hits: list[dict], qc: dict) -> {"calls": [...], "summary": {...}}`. Only a strict/exact hit with
  mechanism "antibiotic inactivation" whose drug_classes cover the drug → FAIL. All other mechanisms (efflux, regulator, etc.) → set
  origin "intrinsic" and used_for_calls false, and never use them for a call. A partial hit → UNCERTAIN. Otherwise NO_KNOWN. Apply the QC guard. Calls/summary use the exact
  PLAN.md shape and include the disclaimer. (T15 replaces the logic and keeps the signature.)
  Depends on: T07
  Done when: test with a fake KPC-3 hit gives Meropenem FAIL; an empty hit list with poor QC gives no NO_KNOWN at all.

- [x] T10 [CORE] Wire the real pipeline into the worker + sample registry
  Files: backend/jobs.py, backend/samples.py, backend/main.py
  Do: samples.py: `SAMPLES = [{id, label, organism, note, path}]` for the 4 ids (paths: kpn_kpc→data/samples/kp_kpc.fasta,
  eco_ctxm→ecoli_ctxm.fasta, eco_k12→ecoli_k12.fasta; kpn_kpc_partial→kpn_kpc_partial.fasta from T23. List only files that exist). /api/samples returns them without the path.
  The worker replaces the fake runner: qc → genes → blast → annotate hits with card index + tier + contig coords
  (hit_id h1..hN; origin + used_for_calls from predict) → predict → result (contigs = 30 longest + any with a hit).
  Each step sets running/done, elapsed_s and detail strings like PLAN.md. Exceptions → status failed with an error code
  (BlastError code, GENE_CALLING_FAILED, otherwise INTERNAL), and the job never hangs. QC InputError on upload → 400 in POST
  (run QC synchronously in the route before queueing).
  Depends on: T05, T07, T09
  Done when: TestClient test (extend test_api_skeleton.py, that is allowed) on eco_ctxm reaches done in < 180 s with a Ceftriaxone FAIL.
  Post total timings to HANDOFF.

- [ ] T11 [UI] Genome QC panel
  Files: frontend/src/components/QcPanel.jsx, frontend/src/components/JobScreen.jsx
  Do: A compact card: total length (Mb), contigs, N50, longest contig, GC %, N %, genes called, and a grade badge
  (good teal / fair amber / poor red), with the warnings listed. When the grade is poor, add a banner over the grid: "Incomplete genome —
  results are less certain; green calls were downgraded."
  Depends on: T06
  Done when: the mock shows the panel. Temporarily editing the mock grade to poor shows the banner (revert it after).

- [ ] T12 [UI] Integrate with the real backend
  Files: frontend/src/api.js, frontend/src/components/UploadScreen.jsx, frontend/src/components/JobScreen.jsx
  Do: Run without ?mock against the backend on :8000. Fix any shape mismatches in the UI only. If the backend is wrong
  versus PLAN.md, write a FIX note in HANDOFF.md instead of working around it. Uploading a real .fasta file works.
  Depends on: T10
  Done when: picking the eco_ctxm sample on http://localhost:5173/#/ ends on a real grid with Ceftriaxone red.

## M2 — Engineered core (target 15:35)
- [x] T13 [CORE] Resistance rule table
  Files: backend/rules.py, backend/tests/test_rules.py
  Do: Add `RULES = [{"name","match": compiled regex on gene name or family,"fail":[drugs],"uncertain":[drugs]}]` exactly as
  in PLAN.md "Rule table". Also add `INTRINSIC` (efflux / permeability / regulator mechanisms; EC-* and chromosomal ampC names) and
  `classify(gene, family, mechanism) -> ("acquired", rule) | ("intrinsic", None) | ("unclassified", None)`, checking INTRINSIC first.
  Keep PANEL. See PLAN.md "Acquired vs intrinsic".
  Depends on: T09
  Done when: tests cover KPC-3→carbapenemase, NDM-1, OXA-48, OXA-1→narrow, CTX-M-15→ESBL, TEM-1→narrow, SHV-12→ESBL,
  SHV-1→narrow, CMY-2→AmpC, armA, mcr-1, acrB→intrinsic, EC-5→intrinsic.

- [ ] T14 [UI] Contig map
  Files: frontend/src/components/ContigMap.jsx, frontend/src/components/JobScreen.jsx
  Do: An SVG with one horizontal bar per contig in result.contigs (length scaled to the longest), and hit markers at start/end
  coloured by tier (exact solid, strict outline, partial dashed). Markers with used_for_calls:false are grey. Hover shows a tooltip
  (gene, coords). Clicking a marker opens the EvidenceDrawer for the first call that cites it.
  Depends on: T08
  Done when: the mock shows 5 contigs with 4 markers and a working tooltip.

- [x] T15 [CORE] Prediction engine v1
  Files: backend/predict.py, backend/jobs.py, backend/tests/test_predict.py
  Do: Implement PLAN.md "Engineered core" steps 1–6 exactly. This covers best hit per ORF by bitscore (do it in jobs.py annotation),
  tiers, rule effects, origin via rules.classify (intrinsic → used_for_calls:false + rule "intrinsic"; only acquired can FAIL; unclassified → at most UNCERTAIN), allele caution
  (SHV/TEM non-exact → UNCERTAIN), the sul+dfrA pairing, the combine logic, confidence, the QC guard, mutation notes, headline and options.
  Set the hit's `rule` field to the rule name. `reason` names the gene with its id/cov.
  Depends on: T13
  Done when: tests pass for KPC → all 8 beta-lactams FAIL plus a carbapenem headline; CTX-M-15 only → Meropenem NO_KNOWN and Ceftriaxone FAIL;
  acrB only → all NO_KNOWN; sul1 alone → Co-trimoxazole UNCERTAIN; poor QC → zero NO_KNOWN; the real K-12 hits loaded from data/spike/ecoli_k12.hits.tsv → zero FAIL (skip the test if the file is missing).

- [x] T16 [CORE] Validate on the 3 real samples
  Files: scripts/run_samples.py, backend/rules.py
  Do: Known real markers (spike): kp_kpc KPC-3, SHV-11, TEM-1, FosA6, oqxAB, sul1, dfrA12;
  eco_ctxm CTX-M-15, CMY-23, OXA-1, TEM-1, sul1, tet(A); eco_k12 ampC + efflux only. The script runs the pipeline functions directly (no server) on each sample and prints a table of antibiotic × status,
  plus the hits used and ignored. Tune the RULES/INTRINSIC regexes only, until: kpn_kpc → Meropenem FAIL; eco_ctxm → Ceftriaxone FAIL
  and Meropenem not FAIL; eco_k12 → ZERO FAIL calls (hard requirement; fix INTRINSIC, never the threshold).
  Depends on: T15
  Done when: `backend/.venv/bin/python scripts/run_samples.py` meets those 3 checks. Paste the 3 headlines into HANDOFF.

- [ ] T17 [UI] "All genes detected" table
  Files: frontend/src/components/GenesTable.jsx, frontend/src/components/JobScreen.jsx
  Do: A collapsible table of all hits: gene, family, identity, coverage, tier, contig, rule. Two sections:
  "Used for predictions" and "Intrinsic — informational (efflux/chromosomal genes found in normal strains; not used for predictions)". This makes the
  engine's judgement visible to the judges.
  Depends on: T08
  Done when: the mock shows acrB in the "not used" section.

## M3 — Robustness + failure demos (target 16:10)
- [x] T18 [CORE] Input hardening
  Files: backend/qc.py, backend/main.py, backend/tests/test_qc.py
  Do: gzip detected by magic bytes 1f8b → decompress, with the decompressed size capped at 100 MB (BAD_GZIP if corrupt). Upload larger than
  MAX_UPLOAD_BYTES → 413 TOO_LARGE (check while reading, don't load unbounded data). No file and no sample → NO_INPUT. Unknown sample → UNKNOWN_SAMPLE.
  Non-UTF8 or binary bytes → NOT_FASTA. Windows line endings and lowercase bases work. Every error uses the PLAN.md error shape.
  Depends on: T10
  Done when: tests for gzip ok, corrupt gzip, binary junk, CRLF file, oversized upload (via TestClient) all pass.

- [ ] T19 [UI] Error states + retry
  Files: frontend/src/components/ErrorPanel.jsx, frontend/src/components/UploadScreen.jsx, frontend/src/components/JobScreen.jsx, frontend/src/api.js
  Do: ErrorPanel({title, message, hint, action}). Upload ApiError → panel under the drop zone with the backend message+hint
  (and a specific icon per code). Failed job → panel showing the failed step, error.message, and a "Retry" button if retryable
  (retryJob → resume polling the same id). 404 → "This analysis no longer exists" + "Start new". If the URL has
  ?simulate=blast_timeout, pass simulate to createJob.
  Depends on: T12 (mock "fail"/"protein" names work before that)
  Done when: mock "protein" upload shows the PROTEIN_FASTA panel; a mock "fail" sample shows Retry.

- [x] T20 [CORE] Failure handling: retry, interruption, simulated BLAST timeout
  Files: backend/jobs.py, backend/main.py, backend/tests/test_api_skeleton.py, backend/tests/test_qc.py
  Note: Test files added for reproducible recovery checks and isolated job stores during TestClient startup.
  Do: POST /api/jobs/{id}/retry: a failed job resets its steps to pending, clears the error, sets simulate=None, and is requeued (otherwise 409 NOT_RETRYABLE).
  On startup, every job.json with status queued/running → failed INTERRUPTED "Server restarted during analysis" retryable.
  simulate="blast_timeout" → after QC+genes, the blast step fails with BLAST_TIMEOUT (sleep 3 s first so it looks real).
  The job keeps input.fasta so retry can rerun.
  Depends on: T10
  Done when: TestClient test: simulate → failed BLAST_TIMEOUT → retry → done. Also a hand-written running job.json gets marked
  INTERRUPTED after calling the startup function.

- [ ] T21 [UI] Connection loss + refresh resilience
  Files: frontend/src/hooks/useJobPolling.js, frontend/src/components/ConnectionBanner.jsx, frontend/src/App.jsx
  Do: After 3 consecutive NETWORK errors, connectionLost=true → a sticky top banner "Connection lost — retrying…". Keep the last
  job shown and back off to a 5 s poll. When the connection recovers, the banner fades out. Opening `#/` while localStorage.lastJobId is
  running shows a "Resume analysis in progress" link.
  Depends on: T04
  Done when: stopping the backend mid-run shows the banner, and restarting it resumes to done (or to INTERRUPTED with Retry).

- [x] T22 [CORE] Result cache + precompute samples
  Files: backend/jobs.py, scripts/precompute.py
  Do: Cache key = sha256(fasta bytes) + RULES_VERSION (a constant in jobs.py). On a hit, the job still walks the 4 steps quickly
  (0.3 s each, details from the cache), with `cached:true`. precompute.py runs every sample through the same functions and fills
  data/cache. A cache file that fails to read is ignored.
  Depends on: T15
  Done when: after precompute, the kpn_kpc job reaches done in < 3 s.

- [x] T23 [CORE] Demo inputs: partial genome + bad files
  Files: scripts/make_demo_inputs.sh, demo_inputs/README.md, backend/samples.py
  Generated-file exception: commit demo_inputs/protein.fasta, empty.fasta, notes.txt, header_only.fasta, genome_small.fasta.gz, explicitly required below.
  Do: The script writes data/samples/kpn_kpc_partial.fasta: chop the kp_kpc chromosome (the longest contig) into 20 kb pieces and
  keep the first 60 (1.2 Mb), with no plasmids, so KPC-3 is gone. This is the "never a false safe" demo and small committed files in demo_inputs/: protein.fasta (3 CARD proteins), empty.fasta, notes.txt
  (plain text), header_only.fasta, genome_small.fasta.gz (gzip of 20 kb DNA). Register kpn_kpc_partial with
  label "K. pneumoniae — incomplete assembly (demo)". The README lists the expected error per file.
  Depends on: T18
  Done when: the partial sample's run gives QC grade poor and zero NO_KNOWN calls.

## M4 — Polish (cut first if behind)
- [ ] T24 [UI] Printable report
  Files: frontend/src/components/ReportHeader.jsx, frontend/src/components/JobScreen.jsx, frontend/src/index.css
  Do: A "Print report" button. @media print: white background, hide the nav, drawer and buttons; show ReportHeader (sample label, job id,
  date, QC grade), then the grid as a table and the hits used, with the disclaimer in bold at the bottom.
  Depends on: T17
  Done when: the browser print preview shows a clean 1–2 page report.

- [ ] T25 [UI] Visual polish
  Files: frontend/src/index.css, frontend/src/components/AntibiogramGrid.jsx, frontend/src/components/PipelineProgress.jsx, frontend/src/components/UploadScreen.jsx
  Do: Status colour tokens in index.css (--fail, --uncertain, --noknown), a staggered fade-in of the tiles, a pulse on the running step,
  a skeleton grid while running, and a hover lift on the sample cards. Respect prefers-reduced-motion. No layout changes.
  Depends on: T19
  Done when: build passes and the flow looks smooth in mock and real mode.

- [x] T26 [CORE] Recent jobs endpoint + README
  Files: backend/main.py, backend/jobs.py, README.md
  Do: GET /api/jobs?limit=10 → [{job_id,status,created_at,label}] newest first. README: setup (brew blast, setup_data.sh,
  get_samples.sh, make_demo_inputs.sh, precompute.py) and run commands for both lanes.
  Depends on: T22
  Done when: a TestClient test lists 2 created jobs, newest first.

- [ ] T27 [UI] Recent analyses list
  Files: frontend/src/components/UploadScreen.jsx, frontend/src/api.js
  Do: Under the samples, show the last 5 jobs from listJobs(5) (label, status chip, time) linking to #/job/<id>. Hide the list on error.
  Depends on: T26 (mock: return 2 fake rows)
  Done when: the list shows and the links open the job.
