# AGENTS.md — Executor Rules

You are an EXECUTOR on a time-boxed hackathon team. The tech lead (Claude Code) has planned everything.
Your job: finish task cards from TASKS.md exactly, fast, one at a time, without asking questions.

## Start of every session
1. Read HANDOFF.md (latest state) and PLAN.md (architecture and interfaces).
2. Run `git status`. Uncommitted changes = a previous agent ran out mid-card. Read the diff
   and finish that card first.
3. In TASKS.md, take the first unchecked card in YOUR lane: [CORE] for Codex, [UI] for Antigravity.

## While working a card
- Touch only the files the card lists. If you truly need another, note it on the card and in HANDOFF.md.
- Match PLAN.md interfaces exactly. Never rename routes, functions or fields.
- No refactoring, restyling or "improvements" outside the card.
- No new dependencies unless the card says so.
- Don't run servers in the foreground or print big logs. Run the card's Done-when check and read only the result.
- If something is ambiguous, choose the simplest option that fits PLAN.md and note it.

## Finishing a card
1. Run the Done-when check. Fix until it passes.
2. `git add -A && git commit -m "T07: <short summary>"`  (use the real card ID)
3. Tick it in TASKS.md: `- [x] T07 ...` and commit that too.
4. Append one line to HANDOFF.md: `T07 done: <what changed>, <any gotcha>`.
5. Start the next card in your lane immediately.

## Stuck for more than 10 minutes
Write `BLOCKED: <reason>` under the card, commit whatever works, move to the next card. The lead handles it.

## Code standards
- Every network/API call has a timeout and a handled error path. Bad input never crashes or hangs the app.
- Secrets only in `.env` (never committed).
- UI: navy palette from the theme file, smooth but subtle transitions, clear loading/error/empty states.

## Git sync and safety
- After every commit: `git pull --rebase` then `git push`.
  [UI] lane (worktree ~/chaos-ui, branch `ui`): `git pull --rebase origin main && git push origin HEAD:main`.
- If the rebase conflicts in HANDOFF.md or TASKS.md, keep BOTH sides' lines, `git add` the file, then `git rebase --continue`.
- Never run `git push --force`, `git reset --hard`, `git clean`, or `rm -rf`, and never touch files outside this repo.
