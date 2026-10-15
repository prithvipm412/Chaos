#!/usr/bin/env python3
"""Verify real genomes without a server; display calls and all used/ignored markers."""
import json
import sys
import time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.config import DATA_DIR
from backend.jobs import execute_pipeline
from backend.samples import available_samples


def main():
    results = {}
    directory = DATA_DIR / 'validation'
    directory.mkdir(parents=True, exist_ok=True)
    for sample in available_samples():
        if sample['id'] == 'kpn_kpc_partial':
            continue
        started = time.monotonic()
        result = execute_pipeline(sample['path'].read_bytes())
        results[sample['id']] = result
        (directory / (sample['id'] + '.json')).write_text(json.dumps(result, indent=2))
        print(f"\n{sample['id']}: {result['summary']['headline']} ({time.monotonic()-started:.2f}s)")
        for call in result['calls']:
            print(f"  {call['antibiotic']:28s} {call['status']}")
        for used in (True, False):
            print(('Used: ' if used else 'Ignored: ') + ', '.join(h['gene'] for h in result['hits'] if h['used_for_calls'] == used))
    def status(sample, drug):
        return next(c['status'] for c in results[sample]['calls'] if c['antibiotic'] == drug)
    assert status('kpn_kpc', 'Meropenem') == 'FAIL'
    assert status('eco_ctxm', 'Ceftriaxone') == 'FAIL'
    assert status('eco_ctxm', 'Meropenem') != 'FAIL'
    assert all(c['status'] != 'FAIL' for c in results['eco_k12']['calls']), 'Unexpected K-12 failure: inspect acquired marker evidence'
    print('\nPASS: KPC / ESBL / K-12 acceptance checks')


if __name__ == '__main__':
    main()
