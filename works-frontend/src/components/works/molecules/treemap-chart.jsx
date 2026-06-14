import { cn } from '@/lib/utils';

// Molecule — treemap of [{ label, value }] (proportional tiles) and funnel (descending
// stages). Domain-free (CLAUDE.md §4.19), token classes only (§4.2); each tile/stage prints
// its label + value so meaning never relies on colour or size alone (§4.17, RB-30 §6).

const TILE_COLORS = [
  'bg-brand-navy',
  'bg-brand-navy-tint',
  'bg-semantic-success',
  'bg-brand-amber',
  'bg-brand-orange',
  'bg-semantic-warning',
  'bg-semantic-danger',
  'bg-neutral-400',
];

export function TreemapChart({ data = [], className }) {
  const items = (data || []).filter((d) => (d.value || 0) > 0).sort((a, b) => b.value - a.value);
  const total = items.reduce((sum, d) => sum + d.value, 0);

  if (total === 0) {
    return <p className="text-xs text-neutral-600 dark:text-neutral-400">No data yet.</p>;
  }
  const summary = items.map((d) => `${d.label} ${d.value}`).join(', ');

  return (
    <div className={cn('flex flex-wrap gap-1', className)} role="img" aria-label={`Treemap: ${summary}`}>
      {items.map((d, i) => {
        const pct = (d.value / total) * 100;
        // Bucket the flex-basis into proportional tiles; min width keeps tiny tiles legible.
        const basis = Math.max(20, Math.round(pct));
        return (
          <div key={d.label}
            className={cn('flex min-h-12 flex-col justify-between rounded-md p-2 text-white', TILE_COLORS[i % TILE_COLORS.length])}
            style={{ flex: `${basis} 1 0%` }}>
            <span className="truncate text-2xs font-medium opacity-90">{d.label}</span>
            <span className="text-sm font-bold">{d.value}</span>
          </div>
        );
      })}
    </div>
  );
}

export function FunnelChart({ data = [], className }) {
  const items = (data || []).filter((d) => d && d.label != null);

  if (items.length === 0) {
    return <p className="text-xs text-neutral-600 dark:text-neutral-400">No data yet.</p>;
  }
  const max = Math.max(1, ...items.map((d) => d.value || 0));
  const summary = items.map((d) => `${d.label} ${d.value}`).join(', ');

  return (
    <div className={cn('space-y-1', className)} role="img" aria-label={`Funnel: ${summary}`}>
      {items.map((d, i) => {
        const pct = ((d.value || 0) / max) * 100;
        const conv = i > 0 && items[i - 1].value ? Math.round(((d.value || 0) / items[i - 1].value) * 100) : null;
        return (
          <div key={d.label} className="flex items-center gap-2">
            <span className="w-24 flex-shrink-0 truncate text-2xs text-neutral-700 dark:text-neutral-300">{d.label}</span>
            <div className="flex-1">
              <div className="mx-auto flex h-6 items-center justify-center rounded-sm bg-brand-navy-tint text-2xs font-semibold text-white" style={{ width: `${Math.max(pct, 8)}%` }}>
                {d.value}
              </div>
            </div>
            <span className="w-10 flex-shrink-0 text-right text-2xs text-neutral-500 dark:text-neutral-400">{conv == null ? '' : `${conv}%`}</span>
          </div>
        );
      })}
    </div>
  );
}
