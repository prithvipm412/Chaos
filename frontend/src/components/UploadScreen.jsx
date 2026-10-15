import React, { useState, useEffect, useRef } from 'react';
import { listSamples, createJob, ApiError } from '../api';
import ErrorPanel from './ErrorPanel';

const ALLOWED_EXTENSIONS = ['.fa', '.fasta', '.fna', '.gz'];
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

function isValidExtension(fileName) {
  const lower = fileName.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getSimulateParam() {
  if (typeof window === 'undefined') return undefined;
  const searchParams = new URLSearchParams(window.location.search);
  if (searchParams.has('simulate')) return searchParams.get('simulate') || undefined;
  if (window.location.hash.includes('?')) {
    const hashQuery = window.location.hash.split('?')[1];
    const hashParams = new URLSearchParams(hashQuery);
    if (hashParams.has('simulate')) return hashParams.get('simulate') || undefined;
  }
  return undefined;
}

export default function UploadScreen() {
  const [samples, setSamples] = useState([]);
  const [loadingSamples, setLoadingSamples] = useState(true);
  const [samplesError, setSamplesError] = useState(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    let active = true;
    async function fetchSamples() {
      try {
        setLoadingSamples(true);
        const data = await listSamples();
        if (active) {
          setSamples(data || []);
          setSamplesError(null);
        }
      } catch (err) {
        if (active) {
          setSamplesError(err.message || 'Failed to load sample library');
        }
      } finally {
        if (active) setLoadingSamples(false);
      }
    }
    fetchSamples();
    return () => {
      active = false;
    };
  }, []);

  const validateFile = (file) => {
    if (!file) return null;
    if (file.size === 0) {
      return {
        code: 'EMPTY_FILE',
        title: 'Empty file',
        message: 'The selected file contains no data.',
        hint: 'Upload the assembled DNA genome (contigs FASTA).',
      };
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return {
        code: 'TOO_LARGE',
        title: 'File too large',
        message: `File exceeds 25 MB limit (${formatBytes(file.size)}).`,
        hint: 'Upload an assembled genome file under 25 MB.',
      };
    }
    if (!isValidExtension(file.name)) {
      return {
        code: 'NOT_FASTA',
        title: 'Unsupported file format',
        message: 'Unsupported file extension.',
        hint: 'Please upload a .fa, .fasta, .fna, or .gz file.',
      };
    }
    return null;
  };

  const handleFileChange = (e) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const error = validateFile(file);
    if (error) {
      setUploadError(error);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } else {
      setSelectedFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setUploadError(null);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const error = validateFile(file);
    if (error) {
      setUploadError(error);
      setSelectedFile(null);
    } else {
      setSelectedFile(file);
    }
  };

  const triggerUpload = async (fileToUpload) => {
    if (!fileToUpload) return;
    const error = validateFile(fileToUpload);
    if (error) {
      setUploadError(error);
      return;
    }

    try {
      setSubmitting(true);
      setUploadError(null);
      const simulate = getSimulateParam();
      const res = await createJob({ file: fileToUpload, simulate });
      if (res?.job_id) {
        localStorage.setItem('lastJobId', res.job_id);
        window.location.hash = `#/job/${res.job_id}`;
      } else {
        throw new Error('Analysis could not be started');
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setUploadError({
          code: err.code,
          title: err.code === 'PROTEIN_FASTA' ? 'Protein sequence detected' : (err.code ? `Error: ${err.code}` : 'Upload failed'),
          message: err.message,
          hint: err.hint,
        });
      } else {
        setUploadError({
          code: 'UNKNOWN',
          title: 'Submission failed',
          message: err.message || 'Failed to submit analysis',
          hint: 'Please check your connection and try again.',
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectSample = async (sample) => {
    try {
      setSubmitting(true);
      setUploadError(null);
      const simulate = getSimulateParam();
      const res = await createJob({ sampleId: sample.id, simulate });
      if (res?.job_id) {
        localStorage.setItem('lastJobId', res.job_id);
        window.location.hash = `#/job/${res.job_id}`;
      } else {
        throw new Error('Analysis could not be started');
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setUploadError({
          code: err.code,
          title: err.code === 'PROTEIN_FASTA' ? 'Protein sequence detected' : (err.code ? `Error: ${err.code}` : 'Upload failed'),
          message: err.message,
          hint: err.hint,
        });
      } else {
        setUploadError({
          code: 'UNKNOWN',
          title: 'Submission failed',
          message: err.message || 'Failed to submit sample analysis',
          hint: 'Please check your connection and try again.',
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* Upload Box */}
      <section className="rounded-2xl border border-border bg-white p-6 sm:p-8 shadow-xs space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-text tracking-tight">Upload Assembled Genome</h2>
          <p className="text-sm text-text-secondary mt-1">
            Provide contigs in FASTA format (.fa, .fasta, .fna, or .gz up to 25 MB).
          </p>
        </div>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center p-8 sm:p-10 border-2 border-dashed rounded-xl transition-all cursor-pointer text-center ${
            isDragOver
              ? 'border-accent bg-accent-subtle'
              : selectedFile
              ? 'border-accent bg-accent-subtle/40'
              : 'border-border-strong bg-bg-surface hover:border-gray-400 hover:bg-gray-100/70'
          }`}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              fileInputRef.current?.click();
            }
          }}
          aria-label="Upload bacterial genome FASTA file"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".fa,.fasta,.fna,.gz"
            onChange={handleFileChange}
            className="hidden"
            aria-hidden="true"
          />

          <svg
            className={`w-12 h-12 mb-3 transition-colors ${selectedFile ? 'text-accent' : 'text-gray-400'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>

          {selectedFile ? (
            <div className="space-y-1">
              <p className="text-sm font-semibold text-text">{selectedFile.name}</p>
              <p className="text-xs text-text-secondary">{formatBytes(selectedFile.size)}</p>
              <p className="text-xs text-accent font-medium mt-2">Click or drop another file to change</p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-sm font-medium text-text">
                <span className="text-accent underline underline-offset-2">Click to select</span> or drag and drop
              </p>
              <p className="text-xs text-text-secondary">Supports .fasta, .fa, .fna, .gz (max 25 MB)</p>
            </div>
          )}
        </div>

        {uploadError && (
          <ErrorPanel
            code={uploadError.code}
            title={uploadError.title}
            message={uploadError.message}
            hint={uploadError.hint}
          />
        )}

        <div className="flex justify-end pt-2">
          <button
            type="button"
            disabled={!selectedFile || submitting || Boolean(uploadError)}
            onClick={() => triggerUpload(selectedFile)}
            className={`px-6 py-2.5 rounded-xl font-medium text-sm transition-all shadow-2xs ${
              selectedFile && !submitting && !uploadError
                ? 'bg-accent text-white hover:bg-blue-700 active:scale-98 cursor-pointer'
                : 'bg-gray-100 text-gray-400 border border-border cursor-not-allowed'
            }`}
          >
            {submitting ? 'Submitting...' : 'Analyze'}
          </button>
        </div>
      </section>

      {/* Preset Samples */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text tracking-tight">Or test with reference clinical samples</h2>
          <span className="text-xs text-text-secondary">Instant results</span>
        </div>

        {loadingSamples ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 rounded-xl border border-border bg-white animate-pulse p-4 shadow-2xs" />
            ))}
          </div>
        ) : samplesError ? (
          <div className="p-4 rounded-xl border border-fail-border bg-fail-bg text-fail text-sm">
            {samplesError}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {samples.map((sample) => (
              <article
                key={sample.id}
                onClick={() => !submitting && handleSelectSample(sample)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && !submitting) {
                    handleSelectSample(sample);
                  }
                }}
                className="group relative rounded-xl border border-border bg-white p-5 hover-lift hover:border-accent transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-text text-sm group-hover:text-accent transition-colors">
                      {sample.label}
                    </h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-bg-surface text-text-secondary border border-border shrink-0">
                      Sample
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary italic mt-1">{sample.organism}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
                  <span className="text-text-secondary font-mono text-[11px]">{sample.note}</span>
                  <span className="text-accent group-hover:translate-x-0.5 transition-transform font-medium">
                    Analyze →
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
