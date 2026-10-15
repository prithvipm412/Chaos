import React, { useState, useRef, useCallback } from 'react';

const TIER_STYLES = {
  exact: {
    fill: '#2563eb',       // accent blue — solid
    stroke: '#2563eb',
    strokeDasharray: null,
    strokeWidth: 2,
    opacity: 1,
    label: 'Exact match',
  },
  strict: {
    fill: 'transparent',   // outline only
    stroke: '#7c3aed',     // purple
    strokeDasharray: null,
    strokeWidth: 2,
    opacity: 1,
    label: 'Strict match',
  },
  partial: {
    fill: 'transparent',
    stroke: '#b45309',     // amber
    strokeDasharray: '4 3',
    strokeWidth: 2,
    opacity: 1,
    label: 'Partial match',
  },
};

const INTRINSIC_STYLE = {
  fill: '#9ca3af',
  stroke: '#9ca3af',
  strokeDasharray: null,
  strokeWidth: 1.5,
  opacity: 0.7,
  label: 'Intrinsic (informational)',
};

function getHitStyle(hit) {
  if (!hit.used_for_calls) return INTRINSIC_STYLE;
  return TIER_STYLES[hit.tier] || TIER_STYLES.partial;
}

// Find the first call whose evidence array includes this hit_id
function findCallForHit(hitId, calls = []) {
  return calls.find((c) => Array.isArray(c.evidence) && c.evidence.includes(hitId)) || null;
}

export default function ContigMap({ contigs = [], hits = [], calls = [], onSelectCall }) {
  const [tooltip, setTooltip] = useState(null); // { x, y, text }
  const svgRef = useRef(null);

  const maxLength = Math.max(...contigs.map((c) => c.length), 1);

  // Layout constants
  const TRACK_HEIGHT = 10;
  const TRACK_GAP = 28;
  const LABEL_W = 100;
  const MARKER_H = 14;
  const MARKER_MIN_W = 4;
  const SVG_PADDING = { top: 8, bottom: 16, left: 8, right: 16 };
  const totalHeight =
    SVG_PADDING.top +
    contigs.length * (TRACK_HEIGHT + TRACK_GAP) -
    (contigs.length > 0 ? TRACK_GAP - TRACK_HEIGHT : 0) +
    SVG_PADDING.bottom;

  // Width is determined by viewBox; we use 100% width in CSS
  const VIEW_W = 700;
  const TRACK_W = VIEW_W - LABEL_W - SVG_PADDING.left - SVG_PADDING.right;

  const handleMarkerEnter = useCallback((e, hit) => {
    const rect = svgRef.current?.getBoundingClientRect();
    const svgX = e.clientX - (rect?.left || 0);
    const svgY = e.clientY - (rect?.top || 0);
    const style = getHitStyle(hit);
    setTooltip({
      x: svgX,
      y: svgY,
      gene: hit.gene,
      tier: style.label,
      contig: hit.contig,
      start: hit.start,
      end: hit.end,
      usedForCalls: hit.used_for_calls,
    });
  }, []);

  const handleMarkerLeave = useCallback(() => setTooltip(null), []);

  const handleMarkerClick = useCallback(
    (hit) => {
      if (!onSelectCall) return;
      const call = findCallForHit(hit.hit_id, calls);
      if (call) onSelectCall(call);
    },
    [calls, onSelectCall],
  );

  if (contigs.length === 0) return null;

  return (
    <section
      className="rounded-2xl border border-border bg-white p-5 shadow-xs space-y-4"
      aria-label="Contig map"
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-sm font-semibold text-text">Contig map</h3>

        {/* Legend */}
        <div className="flex items-center gap-4 flex-wrap">
          {Object.entries(TIER_STYLES).map(([tier, s]) => (
            <div key={tier} className="flex items-center gap-1.5">
              <svg width="14" height="10" aria-hidden="true">
                <rect
                  x="1"
                  y="2"
                  width="12"
                  height="6"
                  rx="1"
                  fill={s.fill}
                  stroke={s.stroke}
                  strokeWidth={s.strokeWidth}
                  strokeDasharray={s.strokeDasharray || '0'}
                />
              </svg>
              <span className="text-xs text-text-secondary capitalize">{tier}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <svg width="14" height="10" aria-hidden="true">
              <rect x="1" y="2" width="12" height="6" rx="1" fill="#9ca3af" stroke="#9ca3af" strokeWidth="1.5" />
            </svg>
            <span className="text-xs text-text-secondary">Intrinsic</span>
          </div>
        </div>
      </div>

      {/* SVG map */}
      <div className="relative overflow-x-auto">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEW_W} ${totalHeight}`}
          className="w-full"
          style={{ minHeight: totalHeight, maxHeight: 320 }}
          aria-hidden="true"
        >
          {contigs.map((contig, i) => {
            const y = SVG_PADDING.top + i * (TRACK_HEIGHT + TRACK_GAP);
            const barX = LABEL_W + SVG_PADDING.left;
            const barW = (contig.length / maxLength) * TRACK_W;

            // Hits on this contig
            const contigHits = hits.filter((h) => h.contig === contig.id);

            return (
              <g key={contig.id}>
                {/* Contig label */}
                <text
                  x={LABEL_W - 4}
                  y={y + TRACK_HEIGHT / 2 + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="var(--text-secondary, #6b7280)"
                  fontFamily="ui-monospace, monospace"
                  className="select-none"
                >
                  {contig.id.length > 12 ? contig.id.slice(0, 10) + '…' : contig.id}
                </text>

                {/* Contig bar (background track) */}
                <rect
                  x={barX}
                  y={y}
                  width={TRACK_W}
                  height={TRACK_HEIGHT}
                  rx="3"
                  fill="var(--bg-surface, #f5f6f8)"
                  stroke="var(--border, #e5e7eb)"
                  strokeWidth="0.5"
                />

                {/* Contig bar (filled portion) */}
                <rect
                  x={barX}
                  y={y}
                  width={Math.max(barW, 2)}
                  height={TRACK_HEIGHT}
                  rx="3"
                  fill="var(--border-strong, #d1d5db)"
                />

                {/* Length label */}
                <text
                  x={barX + Math.max(barW, 2) + 4}
                  y={y + TRACK_HEIGHT / 2 + 4}
                  fontSize="9"
                  fill="var(--text-secondary, #6b7280)"
                  fontFamily="ui-monospace, monospace"
                >
                  {(contig.length / 1e6).toFixed(2)} Mb
                </text>

                {/* Hit markers */}
                {contigHits.map((hit) => {
                  const style = getHitStyle(hit);
                  const markerX = barX + (hit.start / contig.length) * barW;
                  const markerW = Math.max(
                    MARKER_MIN_W,
                    ((hit.end - hit.start) / contig.length) * barW,
                  );
                  const markerY = y - (MARKER_H - TRACK_HEIGHT) / 2;

                  const isClickable = hit.used_for_calls && !!findCallForHit(hit.hit_id, calls);

                  return (
                    <rect
                      key={hit.hit_id}
                      x={markerX}
                      y={markerY}
                      width={markerW}
                      height={MARKER_H}
                      rx="2"
                      fill={style.fill}
                      stroke={style.stroke}
                      strokeWidth={style.strokeWidth}
                      strokeDasharray={style.strokeDasharray || '0'}
                      opacity={style.opacity}
                      style={{ cursor: isClickable ? 'pointer' : 'default' }}
                      onMouseEnter={(e) => handleMarkerEnter(e, hit)}
                      onMouseLeave={handleMarkerLeave}
                      onClick={() => handleMarkerClick(hit)}
                      role={isClickable ? 'button' : undefined}
                      aria-label={isClickable ? `View evidence for ${hit.gene}` : `${hit.gene} (intrinsic)`}
                      tabIndex={isClickable ? 0 : undefined}
                      onKeyDown={isClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') handleMarkerClick(hit); } : undefined}
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>

        {/* Tooltip (DOM, not SVG, so it can overflow and be styled easily) */}
        {tooltip && (
          <div
            role="tooltip"
            className="pointer-events-none absolute z-50 bg-text text-white text-xs rounded-lg px-3 py-2 shadow-xl max-w-xs space-y-0.5"
            style={{ left: tooltip.x + 10, top: tooltip.y - 10, transform: 'translateY(-100%)' }}
          >
            <div className="font-semibold">{tooltip.gene}</div>
            <div className="text-white/70 font-mono">{tooltip.contig}:{tooltip.start.toLocaleString()}–{tooltip.end.toLocaleString()}</div>
            <div className="text-white/70">{tooltip.tier}</div>
            {!tooltip.usedForCalls && (
              <div className="text-white/50 italic">Intrinsic — not used in calls</div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
