"""Exercise the real sample registry, worker, and cached results through HTTP."""
import time

from fastapi.testclient import TestClient

from backend import jobs
from backend.main import app


def test_all_real_samples(tmp_path, monkeypatch):
    monkeypatch.setattr(jobs, 'JOBS_DIR', tmp_path)
    with TestClient(app) as client:
        for sample_id in ('kpn_kpc', 'eco_ctxm', 'eco_k12'):
            response = client.post('/api/jobs', data={'sample_id': sample_id})
            assert response.status_code == 202, response.text
            job_id = response.json()['job_id']
            deadline = time.monotonic() + 30
            while time.monotonic() < deadline:
                response = client.get('/api/jobs/' + job_id)
                assert response.status_code == 200, response.text
                job = response.json()
                if job['status'] in ('done', 'failed'):
                    break
                time.sleep(.1)
            assert job['status'] == 'done', job
            result = job['result']
            if sample_id == 'kpn_kpc':
                assert 'Carbapenem-resistant' in result['summary']['headline']
            elif sample_id == 'eco_ctxm':
                assert result['summary']['headline'] == 'ESBL-producer (CTX-M-15)'
            else:
                assert result['summary']['fail'] == 0
            assert all('origin' in hit for hit in result['hits'])
            assert all(call['reason'].strip() for call in result['calls']
                       if call['status'] == 'NO_KNOWN')
