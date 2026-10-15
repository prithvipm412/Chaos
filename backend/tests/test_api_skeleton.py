import time
from fastapi.testclient import TestClient
from backend import jobs
from backend.main import app


def test_job_roundtrip(tmp_path, monkeypatch):
    monkeypatch.setattr(jobs, 'JOBS_DIR', tmp_path)
    with TestClient(app) as client:
        response = client.post('/api/jobs', data={'sample_id': 'eco_ctxm'})
        assert response.status_code == 202
        job_id = response.json()['job_id']
        deadline = time.monotonic() + 180
        while time.monotonic() < deadline:
            job = client.get('/api/jobs/' + job_id).json()
            if job['status'] in ('done', 'failed'):
                break
            time.sleep(.1)
        assert job['status'] == 'done', job
        assert next(c for c in job['result']['calls'] if c['antibiotic'] == 'Ceftriaxone')['status'] == 'FAIL'
        print('Real EC958 pipeline seconds:', sum(s['elapsed_s'] for s in job['steps']))
        assert (tmp_path / job_id / 'job.json').exists()
