import React, { useState } from 'react';

const TIER_BADGE = {
  exact: 'bg-blue-50 border-blue-200 text-blue-700',
  strict: 'bg-purple-50 border-purple-200 text-purple-700',
  partial: 'bg-amber-50 border-amber-200 text-amber-700',
};

function BarCell({ value, max = 100 }) {
  const pct = Math.min(100, Math.max(0, value));
  const colour = pct >= 98 ? 'bg-noknown' : pct >= 80 ? 'bg-accent' : 'bg-uncertain';
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-1.5 rounded-full bg-bg-surface overflow-hidden">
        <div
          className={`h-full rounded-full ${colour}`}
          style={{ width: `${pct}%` }}
          aria-hidden="true"
        />
      </div>
      <span className="text-xs font-mono text-text-secondary tabular-nums w-10 text-right">
        {pct.toFixed(1)}%
      </span>
    </div>
  );
}

function HitsTable({ hits, caption }) {
  if (hits.length === 0) return null;
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-xs border-collapse">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-border bg-bg-surface">
            <th scope="col" className="text-left px-3 py-2 font-semibold text-text-secondary">Gene</th>
            <th scope="col" className="text-left px-3 py-2 font-semibold text-text-secondary hidden sm:table-cell">Family</th>
            <th scope="col" className="text-left px-3 py-2 font-semibold text-text-secondary">Identity</th>
            <th scope="col" className="text-left px-3 py-2 font-semibold text-text-secondary">Coverage</th>
            <th scope="col" className="text-left px-3 py-2 font-semibold text-text-secondary">Tier</th>
            <th scope="col" className="text-left px-3 py-2 font-semibold text-text-secondary hidden md:table-cell">Contig</th>
            <th scope="col" className="text-left px-3 py-2 font-semibold text-text-secondary hidden lg:table-cell">Rule / classification</th>
          </tr>
        </thead>
        <tbody>
          {hits.map((hit, i) => (
            <tr
              key={hit.hit_id}
              className={`border-b border-border last:border-0 transition-colors hover:bg-bg-surface/60 ${
                i % 2 === 0 ? '' : 'bg-bg-surface/30'
              }`}
            >
              <td className="px-3 py-2.5 font-semibold text-text font-mono">{hit.gene}</td>
              <td className="px-3 py-2.5 text-text-secondary hidden sm:table-cell leading-snug max-w-[180px]">
                {hit.family}
              </td>
              <td className="px-3 py-2.5">
                <BarCell value={hit.identity} />
              </td>
              <td className="px-3 py-2.5">
                <BarCell value={hit.coverage} />
              </td>
              <td className="px-3 py-2.5">
                <span
                  className={`inline-flex items-center px-1.5 py-0.5 rounded border text-xs font-medium capitalize ${
                    TIER_BADGE[hit.tier] || 'bg-bg-surface border-border text-text-secondary'
                  }`}
                >
                  {hit.tier}
                </span>
              </td>
              <td className="px-3 py-2.5 font-mono text-text-secondary hidden md:table-cell text-xs">
                {hit.contig}
              </td>
              <td className="px-3 py-2.5 text-text-secondary hidden lg:table-cell">
                {hit.rule || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function GenesTable({ hits = [] }) {
  const [open, setOpen] = useState(false);

  const acquired = hits.filter((h) => h.used_for_calls);
  const intrinsic = hits.filter((h) => !h.used_for_calls);

  if (hits.length === 0) return null;

  return (
    <section className="rounded-2xl border border-border bg-white shadow-xs overflow-hidden">
      {/* Collapsible header */}
      <button
        type="button"
        id="genes-table-toggle"
        aria-expanded={open}
        aria-controls="genes-table-body"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-bg-surface transition-colors group"
      >
        <div className="flex items-center gap-3">
          <svg
            className="w-4 h-4 text-text-secondary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <h3 className="text-sm font-semibold text-text">All resistance genes detected</h3>
          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
            <span className="px-1.5 py-0.5 rounded bg-fail-bg border border-fail-border text-fail font-medium">
              {acquired.length} used
            </span>
            {intrinsic.length > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-bg-surface border border-border text-text-secondary font-medium">
                {intrinsic.length} intrinsic
              </span>
            )}
          </div>
        </div>

        <svg
          className={`w-4 h-4 text-text-secondary transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Body */}
      {open && (
        <div id="genes-table-body" className="border-t border-border divide-y divide-border/60">
          {/* Used for predictions */}
          {acquired.length > 0 && (
            <div className="p-4 space-y-2">
              <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider px-1">
                Used for predictions ({acquired.length})
              </h4>
              <HitsTable hits={acquired} caption="Genes used for antibiotic resistance predictions" />
            </div>
          )}

          {/* Intrinsic / not used */}
          {intrinsic.length > 0 && (
            <div className="p-4 space-y-2">
              <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider px-1">
                Intrinsic — informational
              </h4>
              <p className="text-xs text-text-secondary px-1 leading-relaxed">
                Efflux pumps and chromosomal genes found in normal strains of this species. The engine deliberately excludes these from resistance calls.
              </p>
              <HitsTable hits={intrinsic} caption="Intrinsic genes not used for predictions" />
            </div>
          )}

          {/* Footer disclaimer */}
          <div className="px-5 py-3 bg-bg-surface">
            <p className="text-xs text-text-secondary leading-relaxed">
              Identity and coverage are reported against the CARD reference sequence. Tier: <strong>exact</strong> ≥98% id &amp; ≥90% cov · <strong>strict</strong> ≥80% id &amp; cov · <strong>partial</strong> ≥50% id &amp; cov.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
