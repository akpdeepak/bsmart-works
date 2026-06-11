import { cn } from '@/lib/utils';

// Molecule — single stacked horizontal bar showing a categorical composition.
// Takes pre-aggregated [{ label, value }] data and carries no domain knowledge
// (CLAUDE.md §4.19). Colour comes from token `text-*` classes via `bg-current`,
// so no raw hex or gray-* ever appears (CLAUDE.md §4.2; guardrails). The legend
// carries label + value, so meaning never relies on colour alone (CLAUDE.md §4.17).

const SEGMENT_COLORS = [
  'text-brand-navy',
  'text-brand-navy-tint',
  'text-brand-orange',
  'text-semantic-success',
  'text-semantic-warning',
  'text-semantic-danger',
  'text-brand-amber',
  'text-neutral-400',
];

export function SegmentBar({ data = [], className }) {
  const items = data.filter((d) => (d.value || 0) > 0);
  const total = items.reduce((sum, d) => sum + (d.value || 0), 0);

  if (total === 0) {
    return <p className="text-xs text-neutral-600 dark:text-neutral-400">No matching items.</p>;
  }

  const summary = items.map((d) => `${d.label} ${d.value}`).join(', ');

  return (
    <div className={cn('space-y-2.5', className)} role="img" aria-label={`Composition: ${summary}`}>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-700">
        {items.map((d, i) => (
          <div key={d.label}
            className={cn('h-full bg-current', SEGMENT_COLORS[i % SEGMENT_COLORS.length])}
            style={{ width: `${(d.value / total) * 100}%` }} />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        {items.map((d, i) => (
          <li key={d.label} className="flex items-center gap-1.5 text-xs">
            <span aria-hidden="true"
              className={cn('inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full bg-current', SEGMENT_COLORS[i % SEGMENT_COLORS.length])} />
            <span className="text-neutral-700 dark:text-neutral-300">{d.label}</span>
            <span className="font-semibold text-neutral-900 dark:text-neutral-100">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
