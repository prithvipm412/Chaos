#!/usr/bin/env python3
"""Run real sample pipelines and populate the versioned, raw-input SHA-256 cache."""
import argparse
import sys
import time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.jobs import STEPS, execute_pipeline, write_cache, cache_key
from backend.samples import available_samples


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--sample', help='Only precompute this sample id (default: every available sample)')
    args=parser.parse_args()
    samples=[s for s in available_samples() if not args.sample or s['id']==args.sample]
    if not samples:
        parser.error('No matching sample files. Run get_samples.sh / make_demo_inputs.sh first.')
    failures=0
    for sample in samples:
        steps=[dict(id=i,label=l,status='pending',elapsed_s=0,detail='') for i,l in STEPS]
        def update(index,status,elapsed,detail):
            steps[index].update(status=status,elapsed_s=round(elapsed,3),detail=detail)
        started=time.monotonic()
        try:
            data=sample['path'].read_bytes()
            result=execute_pipeline(data,update)
            if not write_cache(data,result,steps):
                raise OSError('Unable to write cache')
            print(f"{sample['id']}: {result['summary']['headline']} ({time.monotonic()-started:.2f}s); cache={cache_key(data)}",flush=True)
        except Exception as exc:
            failures+=1
            print(f"FAILED {sample['id']}: {exc}",file=sys.stderr,flush=True)
    return 1 if failures else 0


if __name__=='__main__':
    sys.exit(main())
