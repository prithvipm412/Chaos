import React from 'react';

const DEFAULT_STEPS = [
  { id: 'qc', label: 'Genome QC', status: 'pending', elapsed_s: 0, detail: '' },
  { id: 'genes', label: 'Gene calling', status: 'pending', elapsed_s: 0, detail: '' },
  { id: 'blast', label: 'Resistance gene search', status: 'pending', elapsed_s: 0, detail: '' },
  { id: 'predict', label: 'Antibiotic prediction', status: 'pending', elapsed_s: 0, detail: '' },
];

function StepIcon({ status }) {
  if (status === 'done') {
    return (
      <div className="w-8 h-8 rounded-full bg-noknown-bg border border-noknown-border flex items-center justify-center text-noknown shrink-0 shadow-2xs">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    );
  }
  if (status === 'running') {
    return (
      <div className="w-8 h-8 rounded-full bg-accent-subtle border border-accent flex items-center justify-center text-accent shrink-0 shadow-2xs">
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
    );
  }
  if (status === 'failed') {
    return (
      <div className="w-8 h-8 rounded-full bg-fail-bg border border-fail-border flex items-center justify-center text-fail shrink-0 shadow-2xs">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-bg-surface border border-border flex items-center justify-center text-text-secondary shrink-0">
      <div className="w-2 h-2 rounded-full bg-gray-400" />
    </div>
  );
}

export default function PipelineProgress({ steps = DEFAULT_STEPS, progress = 0, status = 'queued' }) {
  const displaySteps = steps && steps.length > 0 ? steps : DEFAULT_STEPS;
  const percent = Math.min(100, Math.max(0, Math.round(progress * 100)));

  return (
    <section className="w-full space-y-6">
      {/* Progress Header & Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-text-secondary">
          <span className="font-medium text-text">
            {status === 'done'
              ? 'Pipeline complete'
              : status === 'failed'
              ? 'Analysis stopped'
              : 'Pipeline running'}
          </span>
          <span className="font-mono">{percent}%</span>
        </div>

        <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden border border-border">
          <div
            className={`h-full transition-all duration-300 ease-out rounded-full ${
              status === 'failed'
                ? 'bg-fail'
                : status === 'done'
                ? 'bg-noknown'
                : 'bg-accent'
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* 4 Pipeline Steps */}
      <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {displaySteps.map((step, idx) => {
          const isDone = step.status === 'done';
          const isRunning = step.status === 'running';
          const isFailed = step.status === 'failed';

          return (
            <li
              key={step.id || idx}
              className={`rounded-xl border p-4 transition-all duration-200 flex flex-col justify-between ${
                isRunning
                  ? 'border-accent bg-accent-subtle/30 shadow-2xs ring-1 ring-accent/30'
                  : isDone
                  ? 'border-border bg-white shadow-2xs'
                  : isFailed
                  ? 'border-fail-border bg-fail-bg/20'
                  : 'border-border bg-bg-surface/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <StepIcon status={step.status} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <h3 className="text-sm font-semibold text-text truncate">{step.label}</h3>
                  </div>

                  <p className="text-xs text-text-secondary mt-0.5 truncate h-4">
                    {step.detail || (isRunning ? 'Processing...' : '')}
                  </p>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between text-[11px] font-mono text-text-secondary">
                <span className="capitalize">{step.status}</span>
                {step.elapsed_s > 0 && <span>{step.elapsed_s.toFixed(1)}s</span>}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
