import { cn } from '@/lib/utils';

// Molecule — compact column chart for a short daily series (e.g. hours logged per
// day). Takes pre-aggregated [{ label, value }] data and carries no domain
// knowledge (CLAUDE.md §4.19). A single navy fill keeps it calm with the final
// column (today) carrying the one orange accent (CLAUDE.md §4.2); every non-zero
// column shows its value as text, so meaning never relies on size alone (§4.17).

export function DayBars({ data = [], unit = '', highlightLast = true, className }) {
  if (data.length === 0) {
    return <p className="text-xs text-neutral-600 dark:text-neutral-400">No data yet.</p>;
  }

  const max = Math.max(1, ...data.map((d) => d.value || 0));
  const summary = data.map((d) => `${d.label} ${d.value || 0}${unit}`).join(', ');

  return (
    <div className={cn('flex items-end gap-2', className)} role="img" aria-label={`Daily values: ${summary}`}>
      {data.map((d, i) => {
        const value = d.value || 0;
        const isLast = highlightLast && i === data.length - 1;
        return (
          <div key={`${d.label}-${i}`} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <span className="h-4 text-2xs font-semibold text-neutral-700 dark:text-neutral-300">
              {value > 0 ? `${value}${unit}` : ''}
            </span>
            <div className="flex h-16 w-full items-end overflow-hidden rounded bg-neutral-50 dark:bg-neutral-900">
              <div
                className={cn('w-full rounded transition-all duration-base', isLast ? 'bg-brand-orange' : 'bg-brand-navy')}
                style={{ height: `${value > 0 ? Math.max(8, Math.round((value / max) * 100)) : 2}%` }} />
            </div>
            <span className="text-2xs text-neutral-500">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}
