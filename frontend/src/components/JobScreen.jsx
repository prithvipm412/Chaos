import React, { useState } from 'react';
import { useJobPolling } from '../hooks/useJobPolling';
import { retryJob } from '../api';
import PipelineProgress from './PipelineProgress';
import SummaryBar from './SummaryBar';
import AntibiogramGrid from './AntibiogramGrid';
import EvidenceDrawer from './EvidenceDrawer';
import QcPanel from './QcPanel';
import ConnectionBanner from './ConnectionBanner';
import ContigMap from './ContigMap';
import GenesTable from './GenesTable';
import ErrorPanel from './ErrorPanel';
import ReportHeader from './ReportHeader';

function JobScreenContent({ jobId, onRetry }) {
  const { job, error, connectionLost } = useJobPolling(jobId);
  const [selectedCall, setSelectedCall] = useState(null);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState(null);

  const failedStep = job?.steps?.find((s) => s.status === 'failed');

  const handleRetry = async () => {
    try {
      setRetrying(true);
      setRetryError(null);
      await retryJob(jobId);
      if (onRetry) onRetry();
    } catch (err) {
      setRetryError(err.message || 'Retry failed');
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="job-screen w-full max-w-5xl mx-auto space-y-8">
      {job?.status === 'done' && job.result && <ReportHeader job={job} />}
      <ConnectionBanner connectionLost={connectionLost} />

      {/* Terminal Error (e.g. 404) */}
      {error && (
        <ErrorPanel
          code={error.code || (error.status === 404 ? 'NOT_FOUND' : 'ERROR')}
          title="This analysis no longer exists"
          message={error.message || 'The requested analysis was not found or has expired from the server.'}
          hint={error.hint || 'Check that the analysis ID in the URL is correct, or submit a new assembly.'}
          action={
            <a
              href="#/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white font-medium text-sm hover:bg-blue-700 active:scale-98 transition-all shadow-xs"
            >
              Start new analysis
            </a>
          }
        />
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

          {/* Job Failed Error Panel */}
          {job?.status === 'failed' && (
            <ErrorPanel
              code={job.error?.code || 'PIPELINE_ERROR'}
              step={failedStep?.label}
              title={`Analysis failed: ${failedStep?.label || job.error?.code || 'Pipeline error'}`}
              message={job.error?.message || 'The pipeline encountered an error during analysis.'}
              hint={job.error?.retryable ? 'This failure is recoverable. You can retry running the pipeline without re-uploading the genome.' : (job.error?.hint || '')}
              action={
                job.error?.retryable ? (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleRetry}
                      disabled={retrying}
                      className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-xs flex items-center gap-2 ${
                        retrying
                          ? 'bg-gray-100 text-gray-400 border border-border cursor-not-allowed'
                          : 'bg-fail text-white hover:bg-red-700 active:scale-98 cursor-pointer'
                      }`}
                    >
                      <svg className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      {retrying ? 'Retrying analysis...' : 'Retry analysis'}
                    </button>
                    {retryError && <span className="text-xs text-fail font-medium">{retryError}</span>}
                  </div>
                ) : null
              }
            />
          )}

          {/* Skeleton grid while running */}
          {(job?.status === 'running' || job?.status === 'queued') && (
            <AntibiogramGrid loading={true} />
          )}

          {/* Results section */}
          {job?.status === 'done' && job?.result && (
            <div id="results-container" className="space-y-8">
              <div className="flex justify-end">
                <button type="button" onClick={() => window.print()} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-bg-surface">Print report</button>
              </div>
              <SummaryBar summary={job.result.summary} calls={job.result.calls || []} />

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

              {/* Contig Map */}
              <ContigMap
                contigs={job.result.contigs || []}
                hits={job.result.hits || []}
                calls={job.result.calls || []}
                onSelectCall={(call) => setSelectedCall(call)}
              />

              {/* All genes detected table */}
              <GenesTable hits={job.result.hits || []} />

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

export default function JobScreen({ jobId }) {
  const [retrySeq, setRetrySeq] = useState(0);
  return (
    <JobScreenContent
      key={`${jobId}-${retrySeq}`}
      jobId={jobId}
      onRetry={() => setRetrySeq((s) => s + 1)}
    />
  );
}
