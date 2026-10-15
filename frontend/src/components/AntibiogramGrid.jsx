import React from 'react';

const STATUS_CONFIG = {
  FAIL: {
    label: 'Likely to fail',
    badgeClass: 'bg-white border-fail-border text-fail shadow-2xs font-semibold',
    cardClass: 'border-fail-border bg-fail-bg/60 hover:bg-fail-bg hover:border-red-400 shadow-2xs',
    accentDot: 'bg-fail',
  },
  UNCERTAIN: {
    label: 'Uncertain',
    badgeClass: 'bg-white border-uncertain-border text-uncertain shadow-2xs font-semibold',
    cardClass: 'border-uncertain-border bg-uncertain-bg/60 hover:bg-uncertain-bg hover:border-amber-400 shadow-2xs',
    accentDot: 'bg-uncertain',
  },
  NO_KNOWN: {
    label: 'No known resistance found',
    badgeClass: 'bg-white border-noknown-border text-noknown shadow-2xs font-semibold',
    cardClass: 'border-noknown-border bg-noknown-bg/60 hover:bg-noknown-bg hover:border-emerald-400 shadow-2xs',
    accentDot: 'bg-noknown',
  },
};

const DEFAULT_DISCLAIMER =
  'Decision support only — confirm with lab AST. Absence of known genes does not prove susceptibility.';

export default function AntibiogramGrid({ calls = [], disclaimer = DEFAULT_DISCLAIMER, onSelect }) {
  // Group calls by group, preserving order of appearance
  const grouped = calls.reduce((acc, call) => {
    const groupName = call.group || 'Other';
    if (!acc[groupName]) {
      acc[groupName] = [];
    }
    acc[groupName].push(call);
    return acc;
  }, {});

  const groupNames = Object.keys(grouped);

  return (
    <section className="space-y-8" aria-label="Antibiogram prediction grid">
      <div className="space-y-8">
        {groupNames.map((groupName) => (
          <div key={groupName} className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <h3 className="text-sm font-semibold tracking-wide uppercase text-text-secondary">{groupName}</h3>
              <div className="flex-1 h-px bg-border" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {grouped[groupName].map((call) => {
                const config = STATUS_CONFIG[call.status] || STATUS_CONFIG.UNCERTAIN;

                return (
                  <article
                    key={call.antibiotic}
                    onClick={() => onSelect && onSelect(call)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ' ') && onSelect) {
                        onSelect(call);
                      }
                    }}
                    className={`group relative rounded-xl border p-4 transition-all duration-200 cursor-pointer flex flex-col justify-between ${config.cardClass}`}
                    aria-label={`${call.antibiotic}: ${config.label}`}
                  >
                    <div className="space-y-2.5">
                      {/* Card Header: Name & Status Badge */}
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-text text-base group-hover:text-black transition-colors">
                          {call.antibiotic}
                        </h4>
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-full border shrink-0 flex items-center gap-1.5 ${config.badgeClass}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${config.accentDot}`} />
                          <span>{config.label}</span>
                        </span>
                      </div>

                      {/* Reason line */}
                      <p className="text-xs text-text-secondary leading-relaxed line-clamp-2" title={call.reason}>
                        {call.reason || 'No specific gene mechanism flagged.'}
                      </p>
                    </div>

                    {/* Card Footer: Confidence & Evidence link */}
                    <div className="mt-3.5 pt-2.5 border-t border-black/5 flex items-center justify-between text-[11px]">
                      <span className="text-text-secondary capitalize font-mono">
                        {call.confidence ? `${call.confidence} conf.` : ''}
                      </span>
                      <span className="text-accent group-hover:underline flex items-center gap-1 font-medium">
                        <span>Evidence</span>
                        <span>→</span>
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Mandatory Clinical Disclaimer */}
      <footer className="p-4 rounded-xl border border-border bg-bg-surface text-xs text-text-secondary leading-relaxed flex items-start gap-3 shadow-2xs">
        <svg
          className="w-4 h-4 text-accent shrink-0 mt-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="font-medium text-text">{disclaimer || DEFAULT_DISCLAIMER}</p>
      </footer>
    </section>
  );
}
