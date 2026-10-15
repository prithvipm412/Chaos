from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.jobs import create_job, get_job

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=['http://localhost:5173', 'http://127.0.0.1:5173'],
                   allow_credentials=False, allow_methods=['GET', 'POST'], allow_headers=['*'])
SAMPLES = [dict(id=i, label=l, organism=o, note=n) for i, l, o, n in [
    ('kpn_kpc', 'K. pneumoniae (ICU blood culture)', 'Klebsiella pneumoniae', 'carbapenemase expected'),
    ('eco_ctxm', 'E. coli (ESBL)', 'Escherichia coli', 'ESBL expected'),
    ('eco_k12', 'E. coli K-12 MG1655', 'Escherichia coli', 'reference genome'),
    ('kpn_kpc_partial', 'K. pneumoniae — incomplete assembly (demo)', 'Klebsiella pneumoniae', 'incomplete genome')]]


def error_response(code, message, hint='', status=400):
    return JSONResponse(status_code=status, content={'error': dict(code=code, message=message, hint=hint)})


@app.get('/api/health')
def health():
    return {'ok': True}


@app.get('/api/samples')
def samples():
    return SAMPLES


@app.post('/api/jobs', status_code=202)
async def post_job(file: UploadFile | None = File(None), sample_id: str | None = Form(None), simulate: str | None = Form(None)):
    if file is None and not sample_id:
        return error_response('NO_INPUT', 'Choose a genome file or a sample.')
    if sample_id and sample_id not in {s['id'] for s in SAMPLES}:
        return error_response('UNKNOWN_SAMPLE', 'This sample is unavailable.')
    data = await file.read() if file else None
    label = file.filename if file else next(s['label'] for s in SAMPLES if s['id'] == sample_id)
    job_id = create_job(data, sample_id, label, simulate)
    return {'job_id': job_id, 'status': 'queued'}


@app.get('/api/jobs/{job_id}')
def job_status(job_id: str):
    job = get_job(job_id)
    return job if job else error_response('JOB_NOT_FOUND', 'This analysis no longer exists.', 'Start a new analysis.', 404)
