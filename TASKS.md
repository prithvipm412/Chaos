# TASKS.md — written by the lead
Executors: take the first unchecked card in your lane. [CORE] = Codex. [UI] = Antigravity.

<!-- CARD FORMAT (lead copies this for every card)
- [ ] T00 [LANE] Title
  Files: path/one, path/two
  Do: 2–5 lines, concrete.
  Interface: exact signatures/routes/JSON from PLAN.md
  Depends on: T00 (or "none"; [UI] uses mock data until then)
  Done when: a runnable check
-->

## M0 — Skeleton (example card, lead replaces)
- [ ] T01 [CORE] Health route
  Files: backend/main.py
  Do: Add GET /api/health returning {"ok": true}. Enable CORS for the frontend dev port.
  Interface: GET /api/health -> {"ok": true}
  Depends on: none
  Done when: `curl -s localhost:8000/api/health` prints {"ok":true}

## M1 — Happy path

## M2 — Engineered core

## M3 — Robustness

## M4 — Polish

## FIX — lead puts urgent fixes here (do these first)
