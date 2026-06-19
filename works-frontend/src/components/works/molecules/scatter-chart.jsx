import { cn } from '@/lib/utils';
import { CHART_SR_TABLE_CLASS } from './chart-a11y';

// Molecule — scatter / bubble plot of [{ x, y, r?, label }] points (from `toPoints`).
// Domain-free (CLAUDE.md §4.19), token classes only (§4.2). A data table backs the plot
// for a11y (RB-30 §6) so the dots are never the only carrier of meaning (§4.17).
export function ScatterChart({ points = [], bubble = false, className }) {
  const items = (points || []).filter((p) => p && Number.isFinite(p.x) && Number.isFinite(p.y));

  if (items.length === 0) {
    return <p className="text-xs text-neutral-600 dark:text-neutral-400">No data yet.</p>;
  }

  const maxX = Math.max(1, ...items.map((p) => p.x));
  const maxY = Math.max(1, ...items.map((p) => p.y));
  const maxR = Math.max(1, ...items.map((p) => p.r || 0));
  const px = (x) => 2 + (x / maxX) * 96;
  const py = (y) => 28 - (y / maxY) * 26;
  const radius = (r) => (bubble && r ? 1 + (r / maxR) * 3 : 1.5);
  const summary = items.map((p) => `${p.label ? p.label + ' ' : ''}(${p.x}, ${p.y})`).join(', ');

  return (
    <div className={cn('text-brand-navy-tint', className)}>
      <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-24"
        role="img" aria-label={`${bubble ? 'Bubble' : 'Scatter'} chart: ${summary}`}>
        <line x1="2" y1="28" x2="98" y2="28" stroke="currentColor" strokeWidth="0.3" className="text-neutral-300 dark:text-neutral-600" vectorEffect="non-scaling-stroke" />
        <line x1="2" y1="2" x2="2" y2="28" stroke="currentColor" strokeWidth="0.3" className="text-neutral-300 dark:text-neutral-600" vectorEffect="non-scaling-stroke" />
        {items.map((p, i) => (
          <circle key={i} cx={px(p.x)} cy={py(p.y)} r={radius(p.r)} fill="currentColor" className="opacity-70" />
        ))}
      </svg>
      <table className={CHART_SR_TABLE_CLASS}>
        <caption>Plotted points</caption>
        <thead><tr><th scope="col">Point</th><th scope="col">X</th><th scope="col">Y</th>{bubble && <th scope="col">Size</th>}</tr></thead>
        <tbody>
          {items.map((p, i) => (
            <tr key={i}><th scope="row">{p.label || `#${i + 1}`}</th><td>{p.x}</td><td>{p.y}</td>{bubble && <td>{p.r}</td>}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
