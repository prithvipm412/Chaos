#!/usr/bin/env bash
# Stop listeners on the two dedicated demo ports; safe to repeat.
set -euo pipefail
command -v lsof >/dev/null || { echo 'Missing required tool: lsof' >&2; exit 1; }
for port in 8000 5173; do
  pids=$(lsof -tiTCP:"$port" -sTCP:LISTEN || true)
  if [[ -n "$pids" ]]; then
    echo "Stopping listeners on port $port: $pids"
    kill $pids 2>/dev/null || true
    for ((attempt=0; attempt<50; attempt++)); do
      [[ -z "$(lsof -tiTCP:"$port" -sTCP:LISTEN || true)" ]] && break
      sleep 0.1
    done
    remaining=$(lsof -tiTCP:"$port" -sTCP:LISTEN || true)
    [[ -z "$remaining" ]] || kill -KILL $remaining 2>/dev/null || true
    [[ -z "$(lsof -tiTCP:"$port" -sTCP:LISTEN || true)" ]] || {
      echo "Could not free port $port" >&2; exit 1;
    }
  fi
done
echo 'Demo stopped; ports 8000 and 5173 are free.'
