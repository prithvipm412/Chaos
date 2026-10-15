import React from 'react';

const GRADE_CONFIG = {
  good: {
    label: 'Good Quality',
    badgeClass: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
    dot: 'bg-emerald-400',
  },
  fair: {
    label: 'Fair Quality',
    badgeClass: 'bg-amber-500/20 border-amber-500/40 text-amber-300',
    dot: 'bg-amber-400',
  },
  poor: {
    label: 'Poor Quality',
    badgeClass: 'bg-red-500/20 border-red-500/40 text-red-300',
    dot: 'bg-red-400',
  },
};

function formatBp(bp) {
  if (bp == null) return '—';
  if (bp >= 1_000_000) return (bp / 1_000_000).toFixed(2) + ' Mb';
  if (bp >= 1_000) return (bp / 1_000).toFixed(1) + ' kb';
  return `${bp} bp`;
}

export default function QcPanel({ qc, genesCalled }) {
  if (!qc) return null;

  const {
    total_length,
    n_contigs,
    n50,
    longest_contig,
    gc_percent,
    n_percent,
    grade = 'good',
    warnings = [],
  } = qc;

  const gradeInfo = GRADE_CONFIG[grade] || GRADE_CONFIG.good;

  return (
    <section className="rounded-2xl border border-navy-800 bg-navy-900 p-6 shadow-xl space-y-5">
      {/* Header with Title and Grade Badge */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-navy-800/80">
        <div className="space-y-0.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">Assembly Quality</span>
          <h3 className="text-lg font-bold text-text">Genome QC</h3>
        </div>

        <span
          className={`text-xs font-semibold px-3 py-1 rounded-full border flex items-center gap-1.5 capitalize ${gradeInfo.badgeClass}`}
        >
          <span className={`w-2 h-2 rounded-full ${gradeInfo.dot}`} />
          <span>{gradeInfo.label}</span>
        </span>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="p-3 rounded-xl bg-navy-950/60 border border-navy-800/80 space-y-1">
          <p className="text-[11px] text-text/50 font-medium">Total Length</p>
          <p className="text-sm font-bold font-mono text-text">{formatBp(total_length)}</p>
        </div>

        <div className="p-3 rounded-xl bg-navy-950/60 border border-navy-800/80 space-y-1">
          <p className="text-[11px] text-text/50 font-medium">Contigs</p>
          <p className="text-sm font-bold font-mono text-text">{n_contigs ?? '—'}</p>
        </div>

        <div className="p-3 rounded-xl bg-navy-950/60 border border-navy-800/80 space-y-1">
          <p className="text-[11px] text-text/50 font-medium">N50</p>
          <p className="text-sm font-bold font-mono text-text">{formatBp(n50)}</p>
        </div>

        <div className="p-3 rounded-xl bg-navy-950/60 border border-navy-800/80 space-y-1">
          <p className="text-[11px] text-text/50 font-medium">Longest</p>
          <p className="text-sm font-bold font-mono text-text">{formatBp(longest_contig)}</p>
        </div>

        <div className="p-3 rounded-xl bg-navy-950/60 border border-navy-800/80 space-y-1">
          <p className="text-[11px] text-text/50 font-medium">GC Content</p>
          <p className="text-sm font-bold font-mono text-text">
            {gc_percent != null ? `${gc_percent.toFixed(1)}%` : '—'}
          </p>
        </div>

        <div className="p-3 rounded-xl bg-navy-950/60 border border-navy-800/80 space-y-1">
          <p className="text-[11px] text-text/50 font-medium">N Bases</p>
          <p className="text-sm font-bold font-mono text-text">
            {n_percent != null ? `${n_percent.toFixed(2)}%` : '—'}
          </p>
        </div>

        <div className="p-3 rounded-xl bg-navy-950/60 border border-navy-800/80 space-y-1">
          <p className="text-[11px] text-text/50 font-medium">Genes Called</p>
          <p className="text-sm font-bold font-mono text-text">
            {genesCalled != null ? genesCalled.toLocaleString() : '—'}
          </p>
        </div>
      </div>

      {/* Warnings List if any */}
      {warnings && warnings.length > 0 && (
        <div className="pt-3 border-t border-navy-800/80 space-y-2">
          <p className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Quality Warnings</span>
          </p>
          <ul className="space-y-1 pl-5 text-xs text-text/75 list-disc">
            {warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
