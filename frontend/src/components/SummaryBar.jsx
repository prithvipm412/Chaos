import React from 'react';

export default function SummaryBar({ summary, calls = [] }) {
  if (!summary) return null;

  const { fail = 0, uncertain = 0, no_known = 0, headline = '', options = [] } = summary;

  return (
    <section className="rounded-2xl border border-border bg-white p-6 sm:p-7 shadow-xs space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Headline */}
        <div className="space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">Clinical Summary</span>
          <h2 className="text-xl sm:text-2xl font-bold text-text tracking-tight">{headline}</h2>
        </div>

        {/* Status Chips */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-fail-bg border border-fail-border text-fail shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-fail" />
            <span>{fail} Likely to fail</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-uncertain-bg border border-uncertain-border text-uncertain shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-uncertain" />
            <span>{uncertain} Uncertain</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-noknown-bg border border-noknown-border text-noknown shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-noknown" />
            <span>{no_known} No known resistance</span>
          </div>
        </div>
      </div>

      {/* Recommended / Potential Options */}
      <div className="pt-4 border-t border-border flex flex-wrap items-center gap-2 text-xs">
        <span className="text-text-secondary font-medium">Options with no known resistance:</span>
        {options && options.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {options.map((opt) => (
              <span
                key={opt}
                className="px-2.5 py-0.5 rounded-md bg-noknown-bg border border-noknown-border text-noknown font-mono text-[11px] font-medium"
              >
                <span className="block">{opt}</span>
                {calls.find((call) => call.antibiotic === opt)?.tags?.includes('urinary_tract_only') && (
                  <span className="block text-[10px] font-sans">UTI only</span>
                )}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-text-secondary italic">None identified in tested panel</span>
        )}
      </div>
    </section>
  );
}
