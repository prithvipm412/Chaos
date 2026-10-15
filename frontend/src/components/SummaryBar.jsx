import React from 'react';

export default function SummaryBar({ summary }) {
  if (!summary) return null;

  const { fail = 0, uncertain = 0, no_known = 0, headline = '', options = [] } = summary;

  return (
    <section className="rounded-2xl border border-navy-800 bg-navy-900 p-6 sm:p-7 shadow-xl space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Headline */}
        <div className="space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">Clinical Summary</span>
          <h2 className="text-xl sm:text-2xl font-bold text-text tracking-tight">{headline}</h2>
        </div>

        {/* Status Chips */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-500/15 border border-red-500/40 text-red-300 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-red-400" />
            <span>{fail} Likely to fail</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500/15 border border-amber-500/40 text-amber-300 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>{uncertain} Uncertain</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>{no_known} No known resistance</span>
          </div>
        </div>
      </div>

      {/* Recommended / Potential Options */}
      <div className="pt-4 border-t border-navy-800/80 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-text/70 font-medium">Options with no known resistance:</span>
        {options && options.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {options.map((opt) => (
              <span
                key={opt}
                className="px-2.5 py-0.5 rounded-md bg-navy-950 border border-emerald-500/30 text-emerald-300 font-mono text-[11px]"
              >
                {opt}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-text/40 italic">None identified in tested panel</span>
        )}
      </div>
    </section>
  );
}
