import { cn } from '@/lib/utils';

// Molecule — combo chart: bars for the first measure + an overlaid line for the second, over a
// shared category axis. Consumes [{ label, a, b }] (from `toPaired`). Domain-free (CLAUDE.md
// §4.19), token classes only (§4.2); a data table backs it for a11y (RB-30 §6).
export function ComboChart({ data = [], aLabel = 'Bars', bLabel = 'Line', className }) {
  const items = (data || []).filter((d) => d && d.label != null);

  if (items.length === 0) {
    return <p className="text-xs text-neutral-600 dark:text-neutral-400">No data yet.</p>;
  }

  const maxA = Math.max(1, ...items.map((d) => d.a || 0));
  const maxB = Math.max(1, ...items.map((d) => d.b || 0));
  const n = items.length;
  const lineX = (i) => (n <= 1 ? 50 : (i / (n - 1)) * 100);
  const lineY = (v) => 30 - ((v || 0) / maxB) * 28;
  const linePts = items.map((d, i) => `${lineX(i)},${lineY(d.b)}`).join(' ');
  const summary = items.map((d) => `${d.label}: ${aLabel} ${d.a || 0}, ${bLabel} ${d.b || 0}`).join('; ');

  return (
    <div className={cn('', className)} role="img" aria-label={`Combo chart: ${summary}`}>
      <div className="relative">
        <div className="flex h-24 items-end gap-1">
          {items.map((d) => (
            <div key={d.label} className="flex-1 rounded-t-sm bg-brand-navy-tint" style={{ height: `${((d.a || 0) / maxA) * 100}%` }} title={`${aLabel}: ${d.a || 0}`} />
          ))}
        </div>
        <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-24 w-full text-brand-orange" aria-hidden="true">
          <polyline points={linePts} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      <ul className="mt-2 flex gap-3 text-2xs text-neutral-600 dark:text-neutral-400">
        <li className="flex items-center gap-1.5"><span aria-hidden="true" className="inline-block h-2 w-2 rounded-sm bg-brand-navy-tint" />{aLabel}</li>
        <li className="flex items-center gap-1.5"><span aria-hidden="true" className="inline-block h-2 w-2 rounded-sm bg-brand-orange" />{bLabel}</li>
      </ul>
      <table className="sr-only">
        <caption>Combo chart data</caption>
        <thead><tr><th scope="col">Category</th><th scope="col">{aLabel}</th><th scope="col">{bLabel}</th></tr></thead>
        <tbody>{items.map((d) => <tr key={d.label}><th scope="row">{d.label}</th><td>{d.a || 0}</td><td>{d.b || 0}</td></tr>)}</tbody>
      </table>
    </div>
  );
}
