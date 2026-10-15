import React, { useState } from 'react';
import { useJobPolling } from '../hooks/useJobPolling';
import PipelineProgress from './PipelineProgress';
import SummaryBar from './SummaryBar';
import AntibiogramGrid from './AntibiogramGrid';
import EvidenceDrawer from './EvidenceDrawer';
import QcPanel from './QcPanel';

export default function JobScreen({ jobId }) {
  const { job, error, connectionLost } = useJobPolling(jobId);
  const [selectedCall, setSelectedCall] = useState(null);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">
      {/* Connection Lost Banner */}
      {connectionLost && (
        <div
          role="status"
          aria-live="polite"
          className="sticky top-16 z-20 p-3.5 rounded-xl bg-uncertain-bg border border-uncertain-border text-uncertain text-sm flex items-center justify-between backdrop-blur-md shadow-md"
        >
          <div className="flex items-center gap-2.5">
            <svg className="w-4 h-4 animate-spin text-uncertain" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="font-semibold">Connection lost — retrying...</span>
          </div>
          <span className="text-xs text-uncertain font-medium">Retrying every 5s</span>
        </div>
      )}

      {/* Terminal Error (e.g. 404) */}
      {error && (
        <section className="rounded-2xl border border-fail-border bg-white p-8 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-fail-bg border border-fail-border flex items-center justify-center text-fail mx-auto">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-text">This analysis no longer exists</h2>
          <p className="text-sm text-text-secondary max-w-md mx-auto">
            {error.message || 'Job was not found or has expired from the server.'}
          </p>
          <div className="pt-2">
            <a
              href="#/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white font-medium text-sm hover:bg-blue-700 transition-all shadow-xs"
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
          <section className="rounded-2xl border border-border bg-white p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-bg-surface text-text font-medium border border-border">
                    {jobId}
                  </span>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-semibold border capitalize ${
                      job?.status === 'done'
                        ? 'bg-noknown-bg border-noknown-border text-noknown'
                        : job?.status === 'failed'
                        ? 'bg-fail-bg border-fail-border text-fail'
                        : 'bg-accent-subtle border-blue-200 text-accent'
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
                <div className="text-xs text-text-secondary font-mono sm:text-right">
                  <div>Started</div>
                  <div className="text-text font-medium">{new Date(job.created_at).toLocaleTimeString()}</div>
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
            <section className="rounded-2xl border border-fail-border bg-fail-bg/40 p-6 shadow-xs space-y-3">
              <div className="flex items-center gap-3 text-fail font-semibold text-base">
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Pipeline Error ({job.error?.code || 'FAILED'})</span>
              </div>
              <p className="text-sm text-fail leading-relaxed font-medium">
                {job.error?.message || 'The pipeline encountered an unrecoverable error during execution.'}
              </p>
            </section>
          )}

          {/* Results section */}
          {job?.status === 'done' && job?.result && (
            <div id="results-container" className="space-y-8">
              <SummaryBar summary={job.result.summary} />

              {/* Genome QC Panel */}
              <QcPanel qc={job.result.qc} genesCalled={job.result.genes_called} />

              {/* Incomplete Genome Banner for Poor Grade */}
              {job.result.qc?.grade === 'poor' && (
                <div
                  role="alert"
                  className="p-4 rounded-xl bg-fail-bg border border-fail-border text-fail text-sm flex items-start gap-3 shadow-2xs"
                >
                  <svg className="w-5 h-5 text-fail shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="font-semibold text-fail">
                      Incomplete genome — results are less certain; green calls were downgraded.
                    </p>
                    <p className="text-xs text-text-secondary mt-0.5">
                      The assembly does not meet minimum quality criteria (total length or N50). Negative resistance calls cannot be ruled out with confidence.
                    </p>
                  </div>
                </div>
              )}

              <AntibiogramGrid
                calls={job.result.calls}
                disclaimer={job.result.disclaimer}
                onSelect={(call) => setSelectedCall(call)}
              />
            </div>
          )}

          {/* Evidence Drawer */}
          {selectedCall && (
            <EvidenceDrawer
              call={selectedCall}
              hits={job?.result?.hits || []}
              onClose={() => setSelectedCall(null)}
            />
          )}
        </div>
      )}
    </div>
  );
}
