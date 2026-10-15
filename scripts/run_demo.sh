#!/usr/bin/env bash
# Run from any directory. Setup dependencies/data once as described in README.md.
set -euo pipefail
cd "$(dirname "$0")/.."
for tool in lsof curl node; do
  command -v "$tool" >/dev/null || { echo "Missing required tool: $tool" >&2; exit 1; }
done
[[ -x backend/.venv/bin/python && -f frontend/node_modules/vite/bin/vite.js ]] || {
  echo 'Install backend/.venv dependencies and frontend npm dependencies first (see README.md).' >&2; exit 1;
}
mkdir -p data/demo
scripts/stop_demo.sh
backend_pid='' frontend_pid=''
cleanup() {
  [[ -z "$backend_pid" ]] || kill "$backend_pid" 2>/dev/null || true
  [[ -z "$frontend_pid" ]] || kill "$frontend_pid" 2>/dev/null || true
  echo 'Demo startup failed. See data/demo/{backend,frontend}.log and README.md setup commands.' >&2
}
trap cleanup ERR
trap 'cleanup; exit 130' INT TERM
# New sessions keep servers alive after the launching terminal/tool exits.
backend_pid=$(backend/.venv/bin/python - <<'PYTHON'
import subprocess
with open('data/demo/backend.log', 'ab') as log:
    process = subprocess.Popen(['backend/.venv/bin/python', '-m', 'uvicorn', 'backend.main:app',
                                '--host', '127.0.0.1', '--port', '8000'],
                               stdin=subprocess.DEVNULL, stdout=log, stderr=log, start_new_session=True)
print(process.pid)
PYTHON
)
frontend_pid=$(backend/.venv/bin/python - <<'PYTHON'
import os
import subprocess
with open('data/demo/frontend.log', 'ab') as log:
    process = subprocess.Popen(['node', 'node_modules/vite/bin/vite.js', '--host', '127.0.0.1',
                                '--port', '5173', '--strictPort'], cwd='frontend',
                               env={**os.environ, 'VITE_API_BASE': 'http://127.0.0.1:8000', 'VITE_MOCK': '0'},
                               stdin=subprocess.DEVNULL, stdout=log, stderr=log, start_new_session=True)
print(process.pid)
PYTHON
)
wait_for_url() {
  local url="$1" pid="$2"
  for ((attempt=0; attempt<60; attempt++)); do
    kill -0 "$pid" 2>/dev/null || return 1
    if curl --fail --silent --connect-timeout 1 --max-time 2 "$url" >/dev/null; then return 0; fi
    sleep 0.5
  done
  echo "Timed out waiting for $url" >&2
  return 1
}
wait_for_url http://127.0.0.1:8000/api/health "$backend_pid"
wait_for_url http://127.0.0.1:5173/ "$frontend_pid"
echo 'Warming all four sample caches (first run may take a few minutes)...'
backend/.venv/bin/python - <<'PY'
import subprocess
import sys
from backend.jobs import read_cache
from backend.samples import available_samples
expected = {'kpn_kpc', 'eco_ctxm', 'eco_k12', 'kpn_kpc_partial'}
samples = available_samples()
if {sample['id'] for sample in samples} != expected:
    sys.exit('Missing samples: run scripts/get_samples.sh and scripts/make_demo_inputs.sh first.')
for sample in samples:
    try:
        if read_cache(sample['path'].read_bytes()) is None:
            subprocess.run([sys.executable, 'scripts/precompute.py', '--sample', sample['id']],
                           check=True, timeout=360)
        if read_cache(sample['path'].read_bytes()) is None:
            raise RuntimeError('cache verification failed')
        print(f"Ready: {sample['id']}", flush=True)
    except (OSError, RuntimeError, subprocess.SubprocessError) as exc:
        sys.exit(f"Unable to warm {sample['id']}: {exc}")
PY
curl --fail --silent --show-error --connect-timeout 2 --max-time 5 http://127.0.0.1:8000/api/health \
  | backend/.venv/bin/python -c 'import json,sys; assert json.load(sys.stdin).get("ok") is True'
kill -0 "$backend_pid" "$frontend_pid"
trap - ERR INT TERM
echo 'Demo ready: http://127.0.0.1:5173/#/'
echo 'Logs: data/demo/backend.log and data/demo/frontend.log'
echo 'Stop: scripts/stop_demo.sh'
