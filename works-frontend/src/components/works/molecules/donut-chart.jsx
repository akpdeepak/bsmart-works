import { cn } from '@/lib/utils';

// Molecule — presentational donut/pie chart for a categorical distribution.
// Takes pre-aggregated [{ label, value }] data and carries no domain knowledge
// (CLAUDE.md §4.19). Colour comes from token `text-*` classes via stroke/bg
// `currentColor`, so no raw hex or gray-* ever appears (CLAUDE.md §4.2; guardrails).
// Every slice has a text label + value in the legend — meaning never relies on
// colour alone (CLAUDE.md §4.17). When `onSelect` is given, each legend row becomes
// a button so users can drill into the underlying items (CLAUDE.md iteration 6).

// Distinct brand/semantic hues, cycled by slice index. Navy leads so small charts
// stay calm; navy-tint and semantic.info share a hex, so only one is included.
const SLICE_COLORS = [
  'text-brand-navy',
  'text-brand-navy-tint',
  'text-semantic-success',
  'text-brand-amber',
  'text-brand-orange',
  'text-semantic-warning',
  'text-semantic-danger',
  'text-neutral-400',
];

const RADIUS = 16;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function DonutChart({ data = [], onSelect, className }) {
  const items = data.filter((d) => (d.value || 0) > 0);
  const total = items.reduce((sum, d) => sum + (d.value || 0), 0);

  if (total === 0) {
    return <p className="text-xs text-neutral-600 dark:text-neutral-400">No matching items.</p>;
  }

  const summary = items.map((d) => `${d.label} ${d.value}`).join(', ');
  const fractions = items.map((d) => d.value / total);
  // Cumulative fraction before slice i — kept pure (no render-time mutation) so the
  // react-hooks/immutability rule stays satisfied. Slice counts are tiny, so O(n²) is fine.
  const offsetBefore = (i) => fractions.slice(0, i).reduce((a, b) => a + b, 0);

  return (
    <div className={cn('flex items-center gap-4', className)}>
      <svg viewBox="0 0 40 40" className="h-24 w-24 flex-shrink-0 -rotate-90"
        role="img" aria-label={`Donut chart: ${summary}`}>
        <circle cx="20" cy="20" r={RADIUS} fill="none" strokeWidth="6"
          stroke="currentColor" className="text-neutral-200 dark:text-neutral-700" />
        {items.map((d, i) => (
          <circle key={d.label} cx="20" cy="20" r={RADIUS} fill="none" strokeWidth="6"
            stroke="currentColor" className={SLICE_COLORS[i % SLICE_COLORS.length]}
            strokeDasharray={`${fractions[i] * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            strokeDashoffset={-offsetBefore(i) * CIRCUMFERENCE} />
        ))}
      </svg>
      <ul className="min-w-0 flex-1 space-y-1">
        {items.map((d, i) => {
          const colorClass = SLICE_COLORS[i % SLICE_COLORS.length];
          const pct = Math.round((d.value / total) * 100);
          const row = (
            <>
              <span aria-hidden="true"
                className={cn('inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full bg-current', colorClass)} />
              <span className="min-w-0 flex-1 truncate text-neutral-700 dark:text-neutral-300">{d.label}</span>
              <span className="flex-shrink-0 font-semibold text-neutral-900 dark:text-neutral-100">{d.value}</span>
              <span className="w-9 flex-shrink-0 text-right text-neutral-600 dark:text-neutral-400">{pct}%</span>
            </>
          );
          return (
            <li key={d.label} className="text-xs">
              {onSelect ? (
                <button type="button" onClick={() => onSelect(d)}
                  aria-label={`${d.label}: ${d.value} — show items`}
                  className="flex w-full items-center gap-2 rounded px-1 py-0.5 text-left hover:bg-neutral-100 dark:hover:bg-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 transition-colors">
                  {row}
                </button>
              ) : (
                <div className="flex items-center gap-2 px-1 py-0.5">{row}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
