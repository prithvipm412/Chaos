# PLAN.md — Genome Firewall (lead-owned; executors read, never edit)

## User + problem (from SCOPE.md)
A microbiologist or doctor at an Indian district hospital, treating a serious infection. Lab antibiotic
tests (AST) take 2–3 days, so patients get broad antibiotics by guesswork. We read the bacterium's
assembled genome in about 1–2 minutes and show which antibiotics are likely to fail, with evidence.

## 90-second demo story
1. Pick sample "K. pneumoniae (ICU blood culture)". Pipeline steps light up: QC → genes → BLAST → predict.
2. Antibiogram grid: carbapenems + all beta-lactams LIKELY TO FAIL (red). Headline: "Carbapenem-resistant".
   Click Meropenem → evidence drawer: KPC-3, 100% identity, 100% coverage, plasmid CP008830.1:15984–16865.
3. The E. coli K-12 reference has chromosomal ampC/efflux hits, and we still don't flag it red, because
   intrinsic genes are deliberately not used for calls. Shows the engine is engineered, not a lookup.
4. Failure demos: (a) upload a protein FASTA → "This is a protein file, upload the assembled DNA genome".
   (b) "partial genome" sample → QC grade POOR → greens become UNCERTAIN, never a false "safe".
   (c) Refresh mid-run → the run resumes. (d) `?simulate=blast_timeout` → job fails with a reason → Retry works.
5. Print report with the "decision support only — confirm with lab AST" disclaimer.

## Architecture
React (Vite, Tailwind) ──poll──> FastAPI ──> one worker thread ──> pipeline:
`qc.parse_and_qc` → `genes.call_genes` (pyrodigal) → `blast.run_blastp` (CARD protein homolog DB)
→ `predict.predict` (our rules engine) → result. Job state = JSON files on disk (survives refresh and
restart). The spike measured ~30–40 s per genome. Results are cached by input sha256, so samples run instantly. No LLM. No chat.

## Lanes, folders, git (ONE Mac)
- [CORE] Codex in `~/chaos` owns: `backend/**`, `scripts/**`, `demo_inputs/**`, `data/` (gitignored).
- [UI] Antigravity in `~/chaos-ui` (git worktree, branch `ui`) owns: `frontend/**` only.
- UI lane pushes with: `git pull --rebase origin main && git push origin HEAD:main`.
- Backend: from `~/chaos`: `backend/.venv/bin/python -m uvicorn backend.main:app --port 8000`
- Frontend: from `~/chaos-ui/frontend`: `npm install` (once), then `npm run dev -- --port 5173 --strictPort`
- Python imports are absolute: `from backend.qc import parse_and_qc`. Tests: `backend/.venv/bin/python -m pytest backend/tests -q`
```
backend/main.py     routes only            backend/jobs.py   job store, worker thread, cache, retry
backend/qc.py       FASTA parse/validate/QC backend/genes.py  pyrodigal wrapper
backend/blast.py    blastp subprocess+parse backend/card.py   aro_index.tsv loader
backend/rules.py    antibiotic panel+rules  backend/predict.py the engine
backend/samples.py  sample registry         backend/tests/    pytest
data/card/ data/samples/ data/jobs/<id>/{input.fasta,job.json} data/cache/<sha256>.json
frontend/src/api.js  frontend/src/mock/*.json  frontend/src/hooks/  frontend/src/components/
```

## HTTP interface (all errors: `{"error":{"code":str,"message":str,"hint":str}}`)
- `GET  /api/health` → `{"ok":true}`
- `GET  /api/samples` → `[{"id":"kpn_kpc","label":"K. pneumoniae (ICU blood culture)","organism":"Klebsiella pneumoniae","note":"carbapenemase expected"}]`
  ids: `kpn_kpc`, `eco_ctxm`, `eco_k12`, `kpn_kpc_partial`
- `POST /api/jobs` multipart: `file` (FASTA, .fa/.fasta/.fna, optionally .gz) OR form `sample_id`;
  optional form `simulate` = `"blast_timeout"`. → 202 `{"job_id":"j_8f3a2c","status":"queued"}`
  400 codes: `NO_INPUT EMPTY_FILE NOT_FASTA PROTEIN_FASTA BAD_GZIP TOO_SHORT UNKNOWN_SAMPLE`; 413 `TOO_LARGE` (>25 MB).
- `GET  /api/jobs/{id}` → Job (below). 404 `JOB_NOT_FOUND`.
- `POST /api/jobs/{id}/retry` → 202 `{"job_id":"<same id>","status":"queued"}` (409 `NOT_RETRYABLE` unless failed)
- `GET  /api/jobs?limit=10` → `[{"job_id","status","created_at","label"}]` newest first (M4)

## Job JSON (exact; UI mocks must match)
```json
{"job_id":"j_8f3a2c","status":"done","created_at":"2026-10-15T14:02:11Z","label":"K. pneumoniae (ICU blood culture)",
 "steps":[{"id":"qc","label":"Genome QC","status":"done","elapsed_s":0.4,"detail":"4 contigs, 5.77 Mb"},
          {"id":"genes","label":"Gene calling","status":"done","elapsed_s":9.8,"detail":"5,123 genes"},
          {"id":"blast","label":"Resistance gene search","status":"done","elapsed_s":41.2,"detail":"38 hits"},
          {"id":"predict","label":"Antibiotic prediction","status":"done","elapsed_s":0.1,"detail":"16 antibiotics"}],
 "progress":1.0, "cached":false, "error":null,
 "result":{
  "qc":{"total_length":5766615,"n_contigs":4,"n50":5394056,"longest_contig":5394056,"gc_percent":57.2,
        "n_percent":0.01,"grade":"good","warnings":[]},
  "genes_called":5123,
  "contigs":[{"id":"CP008830.1","length":113105}],
  "hits":[{"hit_id":"h1","gene":"KPC-3","aro":"ARO:3002312","family":"KPC beta-lactamase",
           "drug_classes":["carbapenem","cephalosporin","penam"],"mechanism":"antibiotic inactivation",
           "identity":100.0,"coverage":100.0,"tier":"exact","contig":"CP008830.1","start":15984,"end":16865,
           "strand":"+","used_for_calls":true,"rule":"carbapenemase"}],
  "calls":[{"antibiotic":"Meropenem","group":"Carbapenems","status":"FAIL","confidence":"high",
            "evidence":["h1"],"reason":"KPC-3 carbapenemase (100% id, 100% cov)"}],
  "summary":{"fail":9,"uncertain":2,"no_known":5,"headline":"Carbapenem-resistant (KPC) — avoid carbapenems",
             "options":["Amikacin","Colistin","Tigecycline"]},
  "disclaimer":"Decision support only — confirm with lab AST. Absence of known genes does not prove susceptibility."}}
```
- Job `status`: `queued|running|done|failed`. Step `status`: `pending|running|done|failed`. Step `detail` can be `""`.
- `error` when failed: `{"code":"BLAST_TIMEOUT","message":"Resistance search timed out after 300 s","retryable":true}`.
  Job error codes: `BLAST_TIMEOUT BLAST_FAILED GENE_CALLING_FAILED INTERRUPTED INTERNAL`.
- Call `status`: `FAIL` (UI: "Likely to fail", red) | `UNCERTAIN` (amber) | `NO_KNOWN` (UI: "No known resistance found", green-teal; never say "susceptible").
  `confidence`: `high|medium|low`. QC `grade`: `good|fair|poor`. Hit `tier`: `exact|strict|partial`.
- `contigs` = 30 longest + any contig with a hit. `result` is null until done.

## Engineered core — `predict.predict(hits, qc) -> dict(calls, summary)` + `rules.py`
1. **Best hit per ORF** (highest bitscore). Coverage = min(query cov, ref cov), as in the spike.
   Tier: exact (id≥98 & cov≥90), strict (id≥80 & cov≥80), partial (id≥50 & cov≥50), else drop.
2. **Rule table** (`rules.RULES`, matched on CARD gene name/family, first match wins) → effect per antibiotic:
   carbapenemase (KPC, NDM, VIM, IMP, OXA-48/181/232/244) → FAIL all 8 beta-lactams ·
   ESBL (CTX-M, PER, VEB, SHV/TEM ESBL alleles) → FAIL Ampicillin, Ceftriaxone, Ceftazidime, Cefepime; UNCERTAIN Amox-clav, Pip-tazo ·
   plasmid AmpC (CMY, DHA, FOX, MOX) → FAIL Amp, Amox-clav, Ceftriaxone, Ceftazidime; UNCERTAIN Pip-tazo ·
   narrow bla (TEM-1, SHV-1/11, OXA-1, LAP) → FAIL Ampicillin; UNCERTAIN Amox-clav ·
   aac(6')-Ib → FAIL Amikacin (‑cr also UNCERTAIN Ciprofloxacin) · aac(3)-II/IV, ant(2'')-Ia → FAIL Gentamicin ·
   armA, rmtA–F → FAIL Gentamicin+Amikacin · qnr*, oqxAB → UNCERTAIN Ciprofloxacin ·
   sul* AND dfrA* → FAIL Co-trimoxazole (only one → UNCERTAIN) · mcr-* → FAIL Colistin · tet(X) → FAIL Tigecycline ·
   fosA3/4 → FAIL Fosfomycin, other fosA → UNCERTAIN.
   **Intrinsic/ignore**: mechanism efflux / permeability / regulator, chromosomal EC-*/ampC → `used_for_calls:false`.
   **Fallback**: unmatched inactivation gene → UNCERTAIN for panel drugs in its CARD drug class (never FAIL).
3. **Allele caution**: a SHV/TEM allele name is trusted only when tier=exact; otherwise ESBL-dependent drugs → UNCERTAIN.
4. **Combine** per antibiotic: FAIL from exact/strict wins; partial-tier FAIL → UNCERTAIN; else NO_KNOWN.
   Confidence: FAIL high (exact) / medium (strict); NO_KNOWN medium (good QC) / low (fair).
5. **QC guard**: grade poor → every NO_KNOWN becomes UNCERTAIN, reason "genome incomplete — cannot rule out".
   Ciprofloxacin, Nitrofurantoin NO_KNOWN reasons add "point mutations not assessed".
6. Headline: carbapenem FAIL → "Carbapenem-resistant (<gene>)"; elif 3GC FAIL → "ESBL-producer (<gene>)";
   else "No major acquired resistance found". `options` = NO_KNOWN antibiotics.
Panel (16, `group`): Penicillins: Ampicillin, Amoxicillin-clavulanate, Piperacillin-tazobactam ·
Cephalosporins: Ceftriaxone, Ceftazidime, Cefepime · Carbapenems: Meropenem, Imipenem ·
Fluoroquinolones: Ciprofloxacin · Aminoglycosides: Gentamicin, Amikacin · Other: Co-trimoxazole,
Nitrofurantoin, Fosfomycin, Colistin, Tigecycline.

QC grade: poor if total_length < 2 Mb or N50 < 5 kb; fair if n_contigs > 500, N50 < 30 kb or n_percent > 2; else good.
Warnings list the reasons in plain words.

## Robustness (M3, all demoable)
Input validation with specific codes (above) · gzip auto-detected by magic bytes · 25 MB cap ·
blastp subprocess timeout 300 s, `-num_threads 6` · atomic job.json writes (tmp+rename) · on startup, jobs
left `running` → failed `INTERRUPTED` (retryable) · retry endpoint · sha256 cache + `scripts/precompute.py` ·
UI: job id in URL hash `#/job/<id>` + localStorage, resumes polling after refresh; fetch timeout 5 s;
3 failed polls → "Connection lost — retrying" banner, keep last state, back off to 5 s.

## Clock (build start 13:30, freeze 16:30)
M0 14:00 skeleton E2E fake · M1 14:50 real pipeline on samples, grid shows · M2 15:35 rules engine ·
M3 16:10 robustness + failure demos · M4 16:30 polish. Behind? Cut M4, then shrink M2 to T08 only.
