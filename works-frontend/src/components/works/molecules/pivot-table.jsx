import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/format';

// Molecule — the raw tabular fallback that renders ANY pivot result ({ dimensions, measures,
// rows }). Domain-free (CLAUDE.md §4.19), token classes only (§4.2). This is the always-valid
// chart type (accepts any shape) and the accessible ground truth behind every other renderer.
export function PivotTable({ result, className }) {
  const { dimensions = [], measures = [], rows = [] } = result || {};
  const cols = [...dimensions, ...measures];

  if (rows.length === 0 || cols.length === 0) {
    return <p className="text-xs text-neutral-600 dark:text-neutral-400">No matching rows.</p>;
  }

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-neutral-500">
            {dimensions.map((d) => <th scope="col" key={d} className="py-1 pr-3 text-left font-semibold">{d}</th>)}
            {measures.map((m) => <th scope="col" key={m} className="py-1 pl-3 text-right font-semibold">{m}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-neutral-100 dark:border-neutral-700/50">
              {dimensions.map((d) => (
                <td key={d} className="py-1 pr-3 text-neutral-700 dark:text-neutral-300 truncate">{r[d] == null || r[d] === '' ? '—' : String(r[d])}</td>
              ))}
              {measures.map((m) => {
                const v = r[m];
                const n = typeof v === 'number' ? v : Number(v);
                return <td key={m} className="py-1 pl-3 text-right font-medium text-neutral-900 dark:text-neutral-100">{Number.isFinite(n) ? formatNumber(n) : (v ?? '—')}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
