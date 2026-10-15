import React, { useEffect } from 'react';

const STATUS_CONFIG = {
  FAIL: {
    label: 'Likely to fail',
    badgeClass: 'bg-fail-bg border-fail-border text-fail font-semibold',
    dot: 'bg-fail',
  },
  UNCERTAIN: {
    label: 'Uncertain',
    badgeClass: 'bg-uncertain-bg border-uncertain-border text-uncertain font-semibold',
    dot: 'bg-uncertain',
  },
  NO_KNOWN: {
    label: 'No known resistance found',
    badgeClass: 'bg-noknown-bg border-noknown-border text-noknown font-semibold',
    dot: 'bg-noknown',
  },
};

const TIER_CONFIG = {
  exact: 'bg-blue-50 border-blue-200 text-blue-700',
  strict: 'bg-purple-50 border-purple-200 text-purple-700',
  partial: 'bg-amber-50 border-amber-200 text-amber-700',
};

export default function EvidenceDrawer({ call, hits = [], onClose }) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!call) return null;

  const statusConfig = STATUS_CONFIG[call.status] || STATUS_CONFIG.UNCERTAIN;
  const evidenceHitIds = call.evidence || [];
  const evidenceHits = hits.filter((h) => evidenceHitIds.includes(h.hit_id));

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over panel */}
      <aside className="relative w-full max-w-lg bg-white border-l border-border shadow-2xl flex flex-col h-full z-10 overflow-y-auto animate-slide-in text-text">
        {/* Drawer Header */}
        <div className="p-6 border-b border-border bg-white/95 sticky top-0 z-20 backdrop-blur-md">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                {call.group || 'Antibiotic Panel'}
              </span>
              <h2 id="drawer-title" className="text-2xl font-bold text-text tracking-tight">
                {call.antibiotic}
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-text-secondary hover:text-text hover:bg-gray-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label="Close drawer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Status & Reason Summary */}
          <div className="mt-4 pt-4 border-t border-border space-y-2">
            <div className="flex items-center gap-2">
              <span
                className={`text-xs px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${statusConfig.badgeClass}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                <span>{statusConfig.label}</span>
              </span>
              {call.confidence && (
                <span className="text-xs font-mono text-text-secondary capitalize">
                  {call.confidence} confidence
                </span>
              )}
            </div>
            <p className="text-xs text-text leading-relaxed font-medium bg-bg-surface p-3 rounded-lg border border-border">
              {call.reason}
            </p>
          </div>
        </div>

        {/* Drawer Body: Evidence Cards */}
        <div className="p-6 space-y-6 flex-1">
          {evidenceHits.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Detected Resistance Evidence ({evidenceHits.length})
                </h3>
              </div>

              <div className="space-y-4">
                {evidenceHits.map((hit) => {
                  const tierStyle = TIER_CONFIG[hit.tier] || TIER_CONFIG.strict;

                  return (
                    <article
                      key={hit.hit_id}
                      className="rounded-xl border border-border bg-bg-surface p-5 shadow-2xs space-y-4"
                    >
                      {/* Hit Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-text text-lg">{hit.gene}</h4>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wider ${tierStyle}`}
                            >
                              {hit.tier}
                            </span>
                          </div>
                          <p className="text-xs text-text-secondary mt-0.5">{hit.family}</p>
                        </div>
                        {hit.aro && (
                          <span className="text-[11px] font-mono text-accent bg-accent-subtle px-2 py-0.5 rounded border border-blue-200">
                            {hit.aro}
                          </span>
                        )}
                      </div>

                      {/* Identity & Coverage Bars */}
                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-text-secondary">Identity</span>
                            <span className="text-text font-semibold">{hit.identity?.toFixed(1)}%</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-gray-200 overflow-hidden">
                            <div
                              className="h-full bg-accent rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(100, hit.identity || 0)}%` }}
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-text-secondary">Coverage</span>
                            <span className="text-text font-semibold">{hit.coverage?.toFixed(1)}%</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-gray-200 overflow-hidden">
                            <div
                              className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(100, hit.coverage || 0)}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Location & Mechanism Metadata */}
                      <div className="pt-3 border-t border-border space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-text-secondary">Genomic locus</span>
                          <span className="font-mono text-text text-[11px] font-medium">
                            {hit.contig}:{hit.start}–{hit.end} ({hit.strand})
                          </span>
                        </div>

                        {hit.mechanism && (
                          <div className="flex items-center justify-between">
                            <span className="text-text-secondary">Mechanism</span>
                            <span className="text-text capitalize font-medium">{hit.mechanism}</span>
                          </div>
                        )}

                        {hit.rule && (
                          <div className="flex items-center justify-between">
                            <span className="text-text-secondary">Rule fired</span>
                            <span className="text-accent font-mono text-[11px] font-medium">{hit.rule}</span>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-bg-surface p-6 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-noknown-bg border border-noknown-border flex items-center justify-center text-noknown mx-auto">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-text">
                No known resistance genes for this drug were found in this genome.
              </p>
              <p className="text-xs text-text-secondary leading-relaxed max-w-sm mx-auto">
                Absence of recognized acquired resistance mechanisms indicates this antibiotic remains an option to consider, subject to clinical judgment and standard AST confirmation.
              </p>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-border bg-white">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl border border-border bg-bg-surface hover:bg-gray-100 text-text font-medium text-xs transition-colors shadow-2xs"
          >
            Close Evidence
          </button>
        </div>
      </aside>
    </div>
  );
}
