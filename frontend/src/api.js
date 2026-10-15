import mockSamples from './mock/samples.json';
import mockJobDone from './mock/job_done.json';
import mockJobFailed from './mock/job_failed.json';

export class ApiError extends Error {
  constructor(status, code, message, hint = '') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.hint = hint;
  }
}

export const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE) || 'http://localhost:8000';

export function isMockMode() {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MOCK === '1') {
    return true;
  }
  if (typeof window !== 'undefined' && window.location) {
    return window.location.search.includes('mock') || window.location.hash.includes('mock');
  }
  return false;
}

const mockJobs = {};

async function fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(0, 'NETWORK', err.message || 'Network request failed', 'Check your connection or backend server.');
  } finally {
    clearTimeout(timer);
  }
}

async function handleResponse(res) {
  let data = null;
  try {
    data = await res.json();
  } catch {
    if (!res.ok) {
      throw new ApiError(res.status, 'HTTP_' + res.status, res.statusText || 'Request failed', '');
    }
    return null;
  }
  if (!res.ok) {
    const errorObj = data?.error || {};
    throw new ApiError(
      res.status,
      errorObj.code || 'HTTP_' + res.status,
      errorObj.message || res.statusText || 'Request failed',
      errorObj.hint || ''
    );
  }
  return data;
}

export async function listSamples() {
  if (isMockMode()) {
    return mockSamples;
  }
  const res = await fetchWithTimeout(`${API_BASE}/api/samples`, { method: 'GET' }, 5000);
  return await handleResponse(res);
}

export async function createJob({ file, sampleId, simulate } = {}) {
  if (isMockMode()) {
    const filename = file?.name || '';
    if (filename.toLowerCase().includes('protein') || (typeof sampleId === 'string' && sampleId.toLowerCase().includes('protein'))) {
      throw new ApiError(
        400,
        'PROTEIN_FASTA',
        'This looks like a protein file.',
        'Upload the assembled DNA genome (contigs FASTA).'
      );
    }
    const jobId = 'j_mock01';
    const isFail = Boolean(
      (sampleId && sampleId.includes('fail')) ||
      (filename && filename.includes('fail')) ||
      simulate === 'blast_timeout'
    );
    let label = 'K. pneumoniae (ICU blood culture)';
    if (sampleId) {
      const match = mockSamples.find((s) => s.id === sampleId);
      if (match) label = match.label;
      else label = sampleId;
    } else if (filename) {
      label = filename;
    }
    mockJobs[jobId] = {
      jobId,
      createdAt: Date.now(),
      sampleId,
      filename,
      simulate,
      isFail,
      label,
    };
    return { job_id: jobId, status: 'queued' };
  }

  const formData = new FormData();
  if (file) formData.append('file', file);
  if (sampleId) formData.append('sample_id', sampleId);
  if (simulate) formData.append('simulate', simulate);

  const res = await fetchWithTimeout(`${API_BASE}/api/jobs`, {
    method: 'POST',
    body: formData,
  }, 60000);
  return await handleResponse(res);
}

export async function getJob(jobId) {
  if (isMockMode()) {
    if (!mockJobs[jobId]) {
      mockJobs[jobId] = {
        jobId,
        createdAt: Date.now() - 10000,
        isFail: jobId.includes('fail'),
        label: 'K. pneumoniae (ICU blood culture)',
      };
    }
    const job = mockJobs[jobId];
    const elapsed = (Date.now() - job.createdAt) / 1000;

    if (job.isFail) {
      if (elapsed < 2) {
        return {
          job_id: jobId,
          status: 'running',
          created_at: new Date(job.createdAt).toISOString(),
          label: job.label,
          steps: [
            { id: 'qc', label: 'Genome QC', status: 'running', elapsed_s: Math.round(elapsed * 10) / 10, detail: 'Assessing assembly...' },
            { id: 'genes', label: 'Gene calling', status: 'pending', elapsed_s: 0.0, detail: '' },
            { id: 'blast', label: 'Resistance gene search', status: 'pending', elapsed_s: 0.0, detail: '' },
            { id: 'predict', label: 'Antibiotic prediction', status: 'pending', elapsed_s: 0.0, detail: '' },
          ],
          progress: 0.1,
          cached: false,
          error: null,
          result: null,
        };
      }
      if (elapsed < 4) {
        return {
          job_id: jobId,
          status: 'running',
          created_at: new Date(job.createdAt).toISOString(),
          label: job.label,
          steps: [
            { id: 'qc', label: 'Genome QC', status: 'done', elapsed_s: 0.4, detail: '4 contigs, 5.77 Mb' },
            { id: 'genes', label: 'Gene calling', status: 'running', elapsed_s: Math.round((elapsed - 2) * 10) / 10, detail: 'Calling ORFs...' },
            { id: 'blast', label: 'Resistance gene search', status: 'pending', elapsed_s: 0.0, detail: '' },
            { id: 'predict', label: 'Antibiotic prediction', status: 'pending', elapsed_s: 0.0, detail: '' },
          ],
          progress: 0.35,
          cached: false,
          error: null,
          result: null,
        };
      }
      if (elapsed < 5) {
        return {
          job_id: jobId,
          status: 'running',
          created_at: new Date(job.createdAt).toISOString(),
          label: job.label,
          steps: [
            { id: 'qc', label: 'Genome QC', status: 'done', elapsed_s: 0.4, detail: '4 contigs, 5.77 Mb' },
            { id: 'genes', label: 'Gene calling', status: 'done', elapsed_s: 9.8, detail: '5,123 genes' },
            { id: 'blast', label: 'Resistance gene search', status: 'running', elapsed_s: Math.round((elapsed - 4) * 10) / 10, detail: 'Searching CARD database...' },
            { id: 'predict', label: 'Antibiotic prediction', status: 'pending', elapsed_s: 0.0, detail: '' },
          ],
          progress: 0.65,
          cached: false,
          error: null,
          result: null,
        };
      }
      return {
        ...mockJobFailed,
        job_id: jobId,
        label: job.label,
        created_at: new Date(job.createdAt).toISOString(),
      };
    }

    if (elapsed < 2) {
      return {
        job_id: jobId,
        status: 'running',
        created_at: new Date(job.createdAt).toISOString(),
        label: job.label,
        steps: [
          { id: 'qc', label: 'Genome QC', status: 'running', elapsed_s: Math.round(elapsed * 10) / 10, detail: 'Assessing assembly...' },
          { id: 'genes', label: 'Gene calling', status: 'pending', elapsed_s: 0.0, detail: '' },
          { id: 'blast', label: 'Resistance gene search', status: 'pending', elapsed_s: 0.0, detail: '' },
          { id: 'predict', label: 'Antibiotic prediction', status: 'pending', elapsed_s: 0.0, detail: '' },
        ],
        progress: 0.1,
        cached: false,
        error: null,
        result: null,
      };
    }
    if (elapsed < 4) {
      return {
        job_id: jobId,
        status: 'running',
        created_at: new Date(job.createdAt).toISOString(),
        label: job.label,
        steps: [
          { id: 'qc', label: 'Genome QC', status: 'done', elapsed_s: 0.4, detail: '4 contigs, 5.77 Mb' },
          { id: 'genes', label: 'Gene calling', status: 'running', elapsed_s: Math.round((elapsed - 2) * 10) / 10, detail: 'Calling ORFs...' },
          { id: 'blast', label: 'Resistance gene search', status: 'pending', elapsed_s: 0.0, detail: '' },
          { id: 'predict', label: 'Antibiotic prediction', status: 'pending', elapsed_s: 0.0, detail: '' },
        ],
        progress: 0.35,
        cached: false,
        error: null,
        result: null,
      };
    }
    if (elapsed < 7) {
      return {
        job_id: jobId,
        status: 'running',
        created_at: new Date(job.createdAt).toISOString(),
        label: job.label,
        steps: [
          { id: 'qc', label: 'Genome QC', status: 'done', elapsed_s: 0.4, detail: '4 contigs, 5.77 Mb' },
          { id: 'genes', label: 'Gene calling', status: 'done', elapsed_s: 9.8, detail: '5,123 genes' },
          { id: 'blast', label: 'Resistance gene search', status: 'running', elapsed_s: Math.round((elapsed - 4) * 10) / 10, detail: 'Searching CARD database...' },
          { id: 'predict', label: 'Antibiotic prediction', status: 'pending', elapsed_s: 0.0, detail: '' },
        ],
        progress: 0.7,
        cached: false,
        error: null,
        result: null,
      };
    }
    return {
      ...mockJobDone,
      job_id: jobId,
      label: job.label,
      created_at: new Date(job.createdAt).toISOString(),
    };
  }

  const res = await fetchWithTimeout(`${API_BASE}/api/jobs/${encodeURIComponent(jobId)}`, { method: 'GET' }, 5000);
  return await handleResponse(res);
}

export async function retryJob(jobId) {
  if (isMockMode()) {
    if (!mockJobs[jobId]) {
      mockJobs[jobId] = { jobId, createdAt: Date.now(), isFail: false, label: 'K. pneumoniae (ICU blood culture)' };
    } else {
      mockJobs[jobId].createdAt = Date.now();
      mockJobs[jobId].isFail = false;
      mockJobs[jobId].simulate = null;
    }
    return { job_id: jobId, status: 'queued' };
  }
  const res = await fetchWithTimeout(`${API_BASE}/api/jobs/${encodeURIComponent(jobId)}/retry`, {
    method: 'POST',
  }, 5000);
  return await handleResponse(res);
}

export async function listJobs(limit = 10) {
  if (isMockMode()) {
    const list = [
      {
        job_id: 'j_mock01',
        status: 'done',
        created_at: '2026-10-15T14:02:11Z',
        label: 'K. pneumoniae (ICU blood culture)',
      },
      {
        job_id: 'j_mock02',
        status: 'done',
        created_at: '2026-10-15T13:45:00Z',
        label: 'E. coli (ESBL)',
      },
    ];
    return list.slice(0, limit);
  }
  const res = await fetchWithTimeout(`${API_BASE}/api/jobs?limit=${limit}`, { method: 'GET' }, 5000);
  return await handleResponse(res);
}
