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
      <div className="w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-sm">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    );
  }
  if (status === 'running') {
    return (
      <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent flex items-center justify-center text-accent shrink-0 shadow-sm">
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
      <div className="w-8 h-8 rounded-full bg-red-500/15 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0 shadow-sm">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-navy-800/80 border border-navy-800 flex items-center justify-center text-text/40 shrink-0">
      <div className="w-2 h-2 rounded-full bg-text/30" />
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
        <div className="flex items-center justify-between text-xs text-text/70">
          <span className="font-medium">
            {status === 'done'
              ? 'Pipeline complete'
              : status === 'failed'
              ? 'Analysis stopped'
              : 'Pipeline running'}
          </span>
          <span className="font-mono">{percent}%</span>
        </div>

        <div className="w-full h-2 rounded-full bg-navy-950 overflow-hidden border border-navy-800/80">
          <div
            className={`h-full transition-all duration-300 ease-out rounded-full ${
              status === 'failed'
                ? 'bg-red-500'
                : status === 'done'
                ? 'bg-emerald-500'
                : 'bg-gradient-to-r from-accent to-blue-400'
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
                  ? 'border-accent/60 bg-navy-900/90 shadow-md ring-1 ring-accent/30'
                  : isDone
                  ? 'border-emerald-500/30 bg-navy-900/60'
                  : isFailed
                  ? 'border-red-500/40 bg-red-950/20'
                  : 'border-navy-800/80 bg-navy-900/40 opacity-75'
              }`}
            >
              <div className="flex items-start gap-3">
                <StepIcon status={step.status} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <h3 className="text-sm font-semibold text-text truncate">{step.label}</h3>
                  </div>

                  <p className="text-xs text-text/60 mt-0.5 truncate h-4">
                    {step.detail || (isRunning ? 'Processing...' : '')}
                  </p>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-navy-800/60 flex items-center justify-between text-[11px] font-mono text-text/50">
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
