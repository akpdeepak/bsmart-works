import { cn } from '@/lib/utils';

// Molecule — per-row comparison of two related measures (e.g. committed vs
// delivered story points per sprint). Takes pre-aggregated [{ label, a, b }]
// data and carries no domain knowledge (CLAUDE.md §4.19). The `a` baseline
// renders neutral and `b` navy — token classes only (§4.2) — and each row also
// states both values as text, so meaning never relies on colour alone (§4.17).

export function PairedBars({ data = [], aLabel = 'Planned', bLabel = 'Done', className }) {
  const items = data.filter((d) => (d.a || 0) > 0 || (d.b || 0) > 0);

  if (items.length === 0) {
    return <p className="text-xs text-neutral-600 dark:text-neutral-400">No data yet.</p>;
  }

  const max = Math.max(1, ...items.flatMap((d) => [d.a || 0, d.b || 0]));

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-4 text-2xs text-neutral-500">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-neutral-200 dark:bg-neutral-600" />
          {aLabel}
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-brand-navy" />
          {bLabel}
        </span>
      </div>
      {items.map((d) => (
        <div key={d.label} role="img"
          aria-label={`${d.label}: ${aLabel} ${d.a || 0}, ${bLabel} ${d.b || 0}`}>
          <div className="mb-1 flex items-center justify-between gap-2 text-xs">
            <span className="truncate text-neutral-700 dark:text-neutral-300">{d.label}</span>
            <span className="flex-shrink-0 font-semibold text-neutral-900 dark:text-neutral-100">
              {d.b || 0}<span className="font-normal text-neutral-500"> / {d.a || 0}</span>
            </span>
          </div>
          <div className="space-y-0.5">
            <div className="h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-600"
              style={{ width: `${((d.a || 0) / max) * 100}%` }} />
            <div className="h-1.5 rounded-full bg-brand-navy"
              style={{ width: `${((d.b || 0) / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
