from contextlib import asynccontextmanager

from fastapi import FastAPI, File, Form, UploadFile, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from backend.config import MAX_UPLOAD_BYTES

from backend.jobs import create_job, get_job, retry_job, startup, list_jobs
from backend.samples import available_samples
from backend.qc import InputError, parse_and_qc

@asynccontextmanager
async def lifespan(app):
    startup()
    yield


app = FastAPI(lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=['http://localhost:5173', 'http://127.0.0.1:5173'],
                   allow_credentials=False, allow_methods=['GET', 'POST'], allow_headers=['*'])


def error_response(code, message, hint='', status=400):
    return JSONResponse(status_code=status, content={'error': dict(code=code, message=message, hint=hint)})


@app.get('/api/health')
def health():
    return {'ok': True}


@app.get('/api/samples')
def samples():
    return [{k: v for k, v in sample.items() if k != 'path'} for sample in available_samples()]


@app.post('/api/jobs', status_code=202)
async def post_job(file: UploadFile | None = File(None), sample_id: str | None = Form(None), simulate: str | None = Form(None)):
    if file is None and not sample_id:
        return error_response('NO_INPUT', 'Choose a genome file or a sample.')
    sample = next((s for s in available_samples() if s['id'] == sample_id), None)
    if file is None and sample is None:
        return error_response('UNKNOWN_SAMPLE', 'This sample is unavailable.')
    try:
        if file:
            chunks, size = [], 0
            while chunk := await file.read(1024 * 1024):
                size += len(chunk)
                if size > MAX_UPLOAD_BYTES:
                    return error_response('TOO_LARGE', 'The upload exceeds 25 MB.', 'Upload a smaller bacterial genome.', 413)
                chunks.append(chunk)
            data = b''.join(chunks)
        else:
            if sample['path'].stat().st_size > MAX_UPLOAD_BYTES:
                return error_response('TOO_LARGE', 'The sample exceeds 25 MB.', status=413)
            data = sample['path'].read_bytes()
        parse_and_qc(data)
    except InputError as exc:
        return error_response(exc.code, exc.message, exc.hint, 413 if exc.code == 'TOO_LARGE' else 400)
    except OSError:
        return error_response('UNKNOWN_SAMPLE', 'This sample could not be read.')
    label = file.filename if file else sample['label']
    job_id = create_job(data, sample_id, label, simulate)
    return {'job_id': job_id, 'status': 'queued'}


@app.get('/api/jobs/{job_id}')
def job_status(job_id: str):
    job = get_job(job_id)
    return job if job else error_response('JOB_NOT_FOUND', 'This analysis no longer exists.', 'Start a new analysis.', 404)


@app.exception_handler(RequestValidationError)
async def invalid_request(request, exc):
    return error_response('NO_INPUT', 'The request contains an invalid file or form field.', 'Choose a FASTA file or a sample.')


@app.post('/api/jobs/{job_id}/retry', status_code=202)
def retry(job_id: str):
    try:
        result = retry_job(job_id)
    except ValueError:
        return error_response('NOT_RETRYABLE', 'Only a failed analysis can be retried.', status=409)
    if result is None:
        return error_response('JOB_NOT_FOUND', 'This analysis no longer exists.', 'Start a new analysis.', 404)
    return {'job_id': result, 'status': 'queued'}


@app.get('/api/jobs')
def recent_jobs(limit: int = Query(10, ge=1, le=100)):
    return list_jobs(limit)
