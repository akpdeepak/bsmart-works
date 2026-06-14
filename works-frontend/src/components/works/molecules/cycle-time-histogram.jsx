import { cn } from '@/lib/utils';
import { formatDuration } from '@/lib/format';

// Molecule — cycle-time distribution histogram (Cap L, iteration 12; spec §3.7).
// Presentational: takes the backend KpiService.Distribution shape
// ({ median, p85, buckets, outliers }) and renders fixed-width duration buckets as
// vertical bars with median + P85 markers, plus an outlier list that drills into the
// underlying work items via `onSelectOutlier`. Tokens only (CLAUDE.md §4.2); meaning
// never rests on colour alone — every bar carries a text label + count, and the markers
// are labelled (§4.17, WCAG-AA).

// The backend bucketises completed-item ages on these hour edges: {24, 72, 168, 336}
// (1d, 3d, 1w, 2w) → five buckets. Labels mirror that contract.
const BUCKET_LABELS = ['≤ 1d', '1–3d', '3d–1w', '1w–2w', '> 2w'];

// Upper hour bound per bucket, used to place the median / P85 markers on the bucket axis.
const BUCKET_UPPER_HOURS = [24, 72, 168, 336, Infinity];

function markerIndex(hours) {
  if (hours == null || hours <= 0) return null;
  for (let i = 0; i < BUCKET_UPPER_HOURS.length; i += 1) {
    if (hours <= BUCKET_UPPER_HOURS[i]) return i;
  }
  return BUCKET_UPPER_HOURS.length - 1;
}

// hours → seconds for the shared duration formatter (never hand-format — CLAUDE.md §4.22).
const hoursLabel = (hours) => (hours > 0 ? formatDuration(Math.round(hours * 3600)) : '—');

export function CycleTimeHistogram({ distribution, onSelectOutlier, className }) {
  const buckets = Array.isArray(distribution?.buckets) ? distribution.buckets : [];
  const total = buckets.reduce((sum, n) => sum + (n || 0), 0);

  if (!distribution || total === 0) {
    return (
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        No completed items yet — finish work to see how cycle time is distributed.
      </p>
    );
  }

  const max = Math.max(1, ...buckets.map((n) => n || 0));
  const median = distribution.median || 0;
  const p85 = distribution.p85 || 0;
  const medianIdx = markerIndex(median);
  const p85Idx = markerIndex(p85);
  const outliers = Array.isArray(distribution.outliers) ? distribution.outliers : [];
  const colCount = BUCKET_LABELS.length;
  const summary = BUCKET_LABELS.map((l, i) => `${l}: ${buckets[i] || 0}`).join(', ');

  // Centre of a column as a percentage, for absolutely-positioned markers.
  const colCenterPct = (i) => ((i + 0.5) / colCount) * 100;

  return (
    <div className={cn('space-y-3', className)}>
      <div
        role="img"
        aria-label={`Cycle-time distribution. ${summary}. Median ${hoursLabel(median)}, P85 ${hoursLabel(p85)}.`}
      >
        {/* Marker legend */}
        <div className="mb-2 flex items-center gap-4 text-xs text-neutral-600 dark:text-neutral-400">
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block h-3 w-0.5 bg-brand-navy" />
            Median {hoursLabel(median)}
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block h-3 w-0.5 bg-brand-orange" />
            P85 {hoursLabel(p85)}
          </span>
        </div>

        {/* Bars + markers. The marker overlay shares the same column grid as the bars. */}
        <div className="relative">
          <div
            className="grid items-end gap-2"
            style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`, height: '7rem' }}
          >
            {BUCKET_LABELS.map((label, i) => {
              const value = buckets[i] || 0;
              const heightPct = (value / max) * 100;
              return (
                <div key={label} className="flex h-full flex-col items-center justify-end gap-1">
                  <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">{value}</span>
                  <div
                    className="w-full rounded-sm bg-brand-navy-tint"
                    style={{ height: `${heightPct}%`, minHeight: value > 0 ? '2px' : '0' }}
                  />
                </div>
              );
            })}
          </div>

          {/* Median / P85 markers — vertical rules over the matching bucket centre. */}
          {medianIdx != null && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-0 bottom-0 w-0.5 -translate-x-1/2 bg-brand-navy"
              style={{ left: `${colCenterPct(medianIdx)}%` }}
            />
          )}
          {p85Idx != null && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-0 bottom-0 w-0.5 -translate-x-1/2 bg-brand-orange"
              style={{ left: `${colCenterPct(p85Idx)}%` }}
            />
          )}
        </div>

        {/* Bucket axis labels */}
        <div
          className="mt-1 grid gap-2 text-center"
          style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}
        >
          {BUCKET_LABELS.map((label) => (
            <span key={label} className="text-xs text-neutral-600 dark:text-neutral-400">{label}</span>
          ))}
        </div>
      </div>

      {/* Outliers — items slower than P85; each drills to the underlying work item. */}
      {outliers.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-600">
            Outliers — slower than P85 ({outliers.length})
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {outliers.map((id) => (
              <li key={id}>
                {onSelectOutlier ? (
                  <button
                    type="button"
                    onClick={() => onSelectOutlier(id)}
                    aria-label={`Open outlier work item ${id}`}
                    className="rounded-sm border border-neutral-200 px-1.5 py-0.5 font-mono text-xs text-brand-navy-tint hover:bg-neutral-100 hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 dark:border-neutral-700 dark:hover:bg-neutral-800"
                  >
                    {id}
                  </button>
                ) : (
                  <span className="rounded-sm border border-neutral-200 px-1.5 py-0.5 font-mono text-xs text-neutral-700 dark:border-neutral-700 dark:text-neutral-300">
                    {id}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
