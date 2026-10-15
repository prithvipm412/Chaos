import os
from pathlib import Path

DATA_DIR = Path(os.environ.get('DATA_DIR', Path(__file__).resolve().parents[1] / 'data'))
CARD_DIR = DATA_DIR / 'card'
SAMPLES_DIR = DATA_DIR / 'samples'
JOBS_DIR = DATA_DIR / 'jobs'
CACHE_DIR = DATA_DIR / 'cache'
BLAST_DB = CARD_DIR / 'card_proteins'
MAX_UPLOAD_BYTES = 25 * 1024 * 1024
BLAST_TIMEOUT_S = 300
BLAST_THREADS = 6
