import { cn } from '@/lib/utils';

// Molecule — presentational horizontal bar chart for a categorical distribution.
// Takes pre-aggregated [{ label, value }] data and carries no domain knowledge
// (CLAUDE.md §4.19). A single navy-tint fill keeps it calm (§4.2); each bar carries
// a text label + value so meaning never relies on colour alone (§4.17). When
// `onSelect` is given, each bar becomes a button so users can drill into the
// underlying items (CLAUDE.md iteration 6).
export function BarChart({ data = [], onSelect, className }) {
  const items = data.filter((d) => (d.value || 0) > 0);

  if (items.length === 0) {
    return <p className="text-xs text-neutral-600 dark:text-neutral-400">No matching items.</p>;
  }

  const max = Math.max(1, ...items.map((d) => d.value || 0));
  const summary = items.map((d) => `${d.label} ${d.value}`).join(', ');

  return (
    <div className={cn('space-y-1.5', className)}
      role={onSelect ? 'group' : 'img'} aria-label={`Bar chart: ${summary}`}>
      {items.map((d) => {
        const row = (
          <>
            <span className="w-24 flex-shrink-0 truncate text-xs text-neutral-700 dark:text-neutral-300">{d.label}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-700">
              <div className="h-full rounded-full bg-brand-navy-tint" style={{ width: `${(d.value / max) * 100}%` }} />
            </div>
            <span className="w-6 flex-shrink-0 text-right text-xs font-semibold text-neutral-700 dark:text-neutral-300">{d.value}</span>
          </>
        );
        return onSelect ? (
          <button key={d.label} type="button" onClick={() => onSelect(d)}
            aria-label={`${d.label}: ${d.value} — show items`}
            className="flex w-full items-center gap-2 rounded px-1 -mx-1 text-left hover:bg-neutral-100 dark:hover:bg-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 transition-colors">
            {row}
          </button>
        ) : (
          <div key={d.label} className="flex items-center gap-2">{row}</div>
        );
      })}
    </div>
  );
}
