import React from 'react';
import { useJobPolling } from '../hooks/useJobPolling';
import PipelineProgress from './PipelineProgress';

export default function JobScreen({ jobId }) {
  const { job, error, connectionLost } = useJobPolling(jobId);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">
      {/* Connection Lost Banner */}
      {connectionLost && (
        <div
          role="status"
          aria-live="polite"
          className="sticky top-16 z-20 p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-sm flex items-center justify-between backdrop-blur-md shadow-lg"
        >
          <div className="flex items-center gap-2.5">
            <svg className="w-4 h-4 animate-spin text-amber-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="font-medium">Connection lost — retrying...</span>
          </div>
          <span className="text-xs text-amber-300/70">Retrying every 5s</span>
        </div>
      )}

      {/* Terminal Error (e.g. 404) */}
      {error && (
        <section className="rounded-2xl border border-red-500/40 bg-navy-900 p-8 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-text">This analysis no longer exists</h2>
          <p className="text-sm text-text/60 max-w-md mx-auto">
            {error.message || 'Job was not found or has expired from the server.'}
          </p>
          <div className="pt-2">
            <a
              href="#/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white font-medium text-sm hover:brightness-110 transition-all shadow-md"
            >
              Start new analysis
            </a>
          </div>
        </section>
      )}

      {/* Job Content */}
      {!error && (
        <div className="space-y-8">
          {/* Header Card */}
          <section className="rounded-2xl border border-navy-800 bg-navy-900 p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-navy-800">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-navy-800 text-text/70 border border-navy-800">
                    {jobId}
                  </span>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium border capitalize ${
                      job?.status === 'done'
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                        : job?.status === 'failed'
                        ? 'bg-red-500/15 border-red-500/40 text-red-300'
                        : 'bg-accent/15 border-accent/40 text-accent'
                    }`}
                  >
                    {job?.status || 'Loading...'}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-text tracking-tight mt-1">
                  {job?.label || 'Bacterial Genome Analysis'}
                </h2>
              </div>

              {job?.created_at && (
                <div className="text-xs text-text/50 font-mono sm:text-right">
                  <div>Started</div>
                  <div>{new Date(job.created_at).toLocaleTimeString()}</div>
                </div>
              )}
            </div>

            {/* Pipeline progress */}
            <PipelineProgress
              steps={job?.steps}
              progress={job?.progress || 0}
              status={job?.status || 'running'}
            />
          </section>

          {/* Job Failed Alert */}
          {job?.status === 'failed' && (
            <section className="rounded-2xl border border-red-500/40 bg-red-950/20 p-6 shadow-xl space-y-3">
              <div className="flex items-center gap-3 text-red-400 font-semibold text-base">
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Pipeline Error ({job.error?.code || 'FAILED'})</span>
              </div>
              <p className="text-sm text-red-200/90 leading-relaxed">
                {job.error?.message || 'The pipeline encountered an unrecoverable error during execution.'}
              </p>
            </section>
          )}

          {/* Results section placeholder (filled in by T06) */}
          {job?.status === 'done' && (
            <section
              id="results-container"
              className="rounded-2xl border border-navy-800 bg-navy-900 p-6 sm:p-8 shadow-xl space-y-6"
            >
              <div className="flex items-center justify-between pb-4 border-b border-navy-800">
                <h3 className="text-xl font-bold text-text">Results ready</h3>
                {job.cached && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300">
                    Cached result
                  </span>
                )}
              </div>

              {job.result?.summary?.headline && (
                <div className="p-4 rounded-xl bg-navy-950 border border-navy-800/80">
                  <p className="text-xs uppercase tracking-wider text-text/50 font-semibold mb-1">Headline</p>
                  <p className="text-lg font-bold text-text">{job.result.summary.headline}</p>
                </div>
              )}

              <p className="text-sm text-text/70">
                Analysis complete. Antibiogram predictions and evidence will render here.
              </p>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
