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


def wait_for_job(client, job_id):
    deadline=time.monotonic()+180
    while time.monotonic()<deadline:
        job=client.get('/api/jobs/'+job_id).json()
        if job['status'] in ('done','failed'):
            return job
        time.sleep(.1)
    raise AssertionError('Job did not terminate')


def test_simulation_retry_and_interruption(tmp_path,monkeypatch):
    monkeypatch.setattr(jobs,'JOBS_DIR',tmp_path)
    with TestClient(app) as client:
        response=client.post('/api/jobs',data={'sample_id':'eco_k12','simulate':'blast_timeout'})
        assert response.status_code==202
        job_id=response.json()['job_id']
        failed=wait_for_job(client,job_id)
        assert failed['status']=='failed' and failed['error']['code']=='BLAST_TIMEOUT'
        assert failed['steps'][2]['status']=='failed'
        assert (tmp_path/job_id/'input.fasta').stat().st_size>0
        retry=client.post('/api/jobs/'+job_id+'/retry')
        assert retry.status_code==202 and retry.json()['job_id']==job_id
        done=wait_for_job(client,job_id)
        assert done['status']=='done' and done['simulate'] is None
        assert client.post('/api/jobs/'+job_id+'/retry').status_code==409
        assert client.post('/api/jobs/j_000000/retry').status_code==404
    done.update(status='running',job_id='j_abcdef')
    done['steps'][2]['status']='running'
    jobs.save_job(done)
    jobs.startup()
    interrupted=jobs.get_job('j_abcdef')
    assert interrupted['status']=='failed' and interrupted['error']['code']=='INTERRUPTED'
    assert interrupted['error']['retryable'] and interrupted['steps'][2]['status']=='failed'
