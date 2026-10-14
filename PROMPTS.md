# PROMPTS.md — paste these as-is

## 1. 9:30 AM — start the 5-hour clock (every account)
Reply with just: ok

## 2. Lead, step A — right after the PS reveal (Claude Code)
Read CLAUDE.md. Here is our problem statement:
<paste PS>
Give me, in under 20 lines total:
(a) 3 candidate scoping statements (2 lines each: who the user is / what breaks for them today), narrow enough to demo;
(b) for each, a one-line product idea with a NON-CHAT surface and one failure case we'd visibly handle;
(c) your pick and why. Don't write files yet.

## 3. Lead, step B — after we paste the chosen lines into SCOPE.md
Read CLAUDE.md and SCOPE.md. Write PLAN.md, then TASKS.md (20–30 cards, M0–M4, lanes [CORE] and [UI]),
using the boilerplate already in this repo. Front-load M0 cards for both lanes so both executors can start
within 10 minutes. Commit both files. No feature code.

## 4. Executor — every new session or account switch
Codex:        Read AGENTS.md and follow it. Your lane is [CORE]. Start now.
Antigravity:  Read AGENTS.md and follow it. Your lane is [UI]. Start now.

## 5. Lead — review cycle
Review cycle: follow the Review loop in CLAUDE.md. Clock is now <HH:MM>, freeze at <HH:MM>.

## 6. Lead — a bug
Bug: I did <action> → expected <x> → got <y>. Error: <paste only the relevant lines>.
Find the cause with targeted reads. Fix it if small, otherwise write a FIX card.

## 7. Lead — code freeze
Code freeze. Write DEMO.md: a 90-second demo script for the locked user, the failure demo step by step,
and a 1-page architecture explainer for judge questions. Write DECLARED.md listing boilerplate and
libraries/APIs used. Commit.

## 8. Emergency — Claude Code out of weekly budget (paste into a Codex account)
You are now acting tech lead. Read CLAUDE.md and follow it instead of AGENTS.md.
Start with a Review cycle, then keep TASKS.md moving.
