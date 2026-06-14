import { cn } from '@/lib/utils';

// Molecule — presentational line / area chart for an ordered categorical series.
// Takes pre-aggregated [{ label, value }] data and carries no domain knowledge
// (CLAUDE.md §4.19). Token classes only (§4.2). The series is also exposed as an
// accessible image label + a visually-hidden data table, so meaning never relies on
// the SVG alone (§4.17, RB-30 §6 a11y). `area` fills under the line.
export function LineChart({ data = [], area = false, className }) {
  const items = (data || []).filter((d) => d && d.label != null);

  if (items.length === 0) {
    return <p className="text-xs text-neutral-600 dark:text-neutral-400">No data yet.</p>;
  }

  const max = Math.max(1, ...items.map((d) => d.value || 0));
  const n = items.length;
  const x = (i) => (n <= 1 ? 0 : (i / (n - 1)) * 100);
  const y = (v) => 30 - ((v || 0) / max) * 28;
  const line = items.map((d, i) => `${x(i)},${y(d.value)}`).join(' ');
  const fill = `0,30 ${line} 100,30`;
  const summary = items.map((d) => `${d.label} ${d.value}`).join(', ');

  return (
    <div className={cn('text-brand-navy-tint dark:text-brand-amber', className)}>
      <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-20"
        role="img" aria-label={`${area ? 'Area' : 'Line'} chart: ${summary}`}>
        {area && (
          <polygon points={fill} fill="currentColor" className="opacity-20 motion-reduce:transition-none" />
        )}
        <polyline points={line} fill="none" stroke="currentColor" strokeWidth="1.5"
          vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      </svg>
      <div className="mt-1 flex justify-between text-2xs text-neutral-500 dark:text-neutral-400">
        <span className="truncate">{items[0].label}</span>
        <span className="truncate">{items[items.length - 1].label}</span>
      </div>
      <table className="sr-only">
        <caption>Series data</caption>
        <tbody>
          {items.map((d) => (
            <tr key={d.label}><th scope="row">{d.label}</th><td>{d.value}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
