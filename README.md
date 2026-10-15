# Genome Firewall

Upload an assembled bacterial DNA genome or choose a public sample. Follow genome QC, gene calling, CARD protein search, and a 16-antibiotic evidence dashboard. Predictions distinguish **Likely to fail**, **Uncertain**, and **No known resistance found**. Intrinsic homologs are shown separately from acquired markers used for calls.

**Decision support only — confirm with lab AST. Absence of known genes does not prove susceptibility.** Point mutations, expression changes, and additional resistance mechanisms are not comprehensively assessed.

## Setup on the shared Mac

CORE owns `backend/`, `scripts/`, and local `data/` in `~/chaos`. UI owns `frontend/` in the existing `~/chaos-ui` git worktree, branch `ui` tracking `origin/main`. Do not run two backend workers against the same data directory.

From `~/chaos`:

```sh
brew install blast
python3 -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements.txt
scripts/setup_data.sh
scripts/get_samples.sh
scripts/make_demo_inputs.sh
backend/.venv/bin/python scripts/precompute.py
```

Downloads require internet. Once setup and precomputation finish, analysis runs locally. CARD data, genomes, generated jobs and cached results stay under ignored `data/`; do not commit them. Scripts preserve the original CARD archive/license and sample download URLs/checksums. Sample assemblies include plasmids. Public samples: KPNIH1 (`GCA_000281535.2`, KPC-3), EC958 (`GCA_000285655.3`, CTX-M-15), K-12 MG1655 (`GCF_000005845.2`), plus a deliberately incomplete chromosome-only assembly.

The real pipeline takes about 16–40 seconds on this Mac. Cached sample jobs take about 2 seconds and expose `cached:true`. Cache keys combine SHA-256 of the submitted bytes with `backend.jobs.RULES_VERSION`; bump the version and rerun precompute after changing prediction rules. Set `DATA_DIR` to override the backend data root.

## Run in two terminals

CORE, in `~/chaos`:

```sh
backend/.venv/bin/python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

UI, in `~/chaos-ui/frontend`:

```sh
npm install
npm run dev -- --host localhost --port 5173 --strictPort
```

Open http://localhost:5173. UI defaults to http://localhost:8000; `VITE_API_BASE` overrides it. UI mock mode: http://localhost:5173/?mock. Keep UI files in its lane. CORE sync: `git pull --rebase && git push`; UI sync: `git pull --rebase origin main && git push origin HEAD:main`.

## Verify and demonstrate

From `~/chaos`:

```sh
backend/.venv/bin/python -m pytest backend/tests -q
backend/.venv/bin/python scripts/run_samples.py
curl --max-time 5 http://localhost:8000/api/health
curl --max-time 5 'http://localhost:8000/api/jobs?limit=10'
```

From `~/chaos-ui`: `npm --prefix frontend run build`.

`POST /api/jobs` accepts multipart `file` or form `sample_id`. Poll `GET /api/jobs/{id}` for progress/results. `GET /api/samples` lists available files; `GET /api/jobs?limit=10` lists recent analyses newest first. Jobs persist atomically as `data/jobs/<id>/job.json`. Restarted queued/running jobs become `INTERRUPTED`, with retry available through `POST /api/jobs/{id}/retry`.

Demo checks: KPNIH1 → Meropenem FAIL with KPC-3 evidence; EC958 → Ceftriaxone FAIL and Meropenem not FAIL; K-12 → zero FAIL despite intrinsic gene hits; incomplete sample → poor QC and zero NO_KNOWN calls. See [demo_inputs/README.md](demo_inputs/README.md) for invalid-upload fixtures. Form `simulate=blast_timeout` bypasses cache and deliberately fails the BLAST step; Retry removes simulation. Real BLAST timeout is 300 seconds. Upload limit is 25 MiB, gzip expansion limit 100 MiB.

See [PLAN.md](PLAN.md) for exact interfaces and [HANDOFF.md](HANDOFF.md) for measurements and review notes. The initial health-check/frontend boilerplate is declared in [DECLARED.md](DECLARED.md).
