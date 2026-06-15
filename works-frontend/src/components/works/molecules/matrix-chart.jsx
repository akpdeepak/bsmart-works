import { cn } from '@/lib/utils';
import { bgColorFor } from './chart-palette';

// Molecules — two-dimension renderers that consume the matrix shape produced by
// `toMatrix` ({ rowKeys, colKeys, value(r,c), max }). Domain-free (CLAUDE.md §4.19),
// token classes only (§4.2), each ships a data-table fallback / aria so meaning never
// relies on colour alone (§4.17, RB-30 §6).
// CB-safe palette via CHART_PALETTE_BG (WI-22): avoids red/green pairs.

function Legend({ colKeys }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
      {colKeys.map((c, i) => (
        <li key={c} className="flex items-center gap-1.5 text-2xs text-neutral-600 dark:text-neutral-400">
          <span aria-hidden="true" className={cn('inline-block h-2 w-2 flex-shrink-0 rounded-full', bgColorFor(i))} />
          {c}
        </li>
      ))}
    </ul>
  );
}

function summarize(matrix) {
  return matrix.rowKeys
    .map((r) => `${r}: ${matrix.colKeys.map((c) => `${c} ${matrix.value(r, c)}`).join(', ')}`)
    .join('; ');
}

// One horizontal 100%-stacked bar per row dimension; columns are the segments.
export function StackedBarChart({ matrix, className }) {
  const m = matrix || { rowKeys: [], colKeys: [], value: () => 0, max: 0 };
  if (m.rowKeys.length === 0) {
    return <p className="text-xs text-neutral-600 dark:text-neutral-400">No data yet.</p>;
  }
  return (
    <div className={cn('space-y-2', className)} role="img" aria-label={`Stacked bar: ${summarize(m)}`}>
      {m.rowKeys.map((r) => {
        const total = m.colKeys.reduce((sum, c) => sum + m.value(r, c), 0) || 1;
        return (
          <div key={r}>
            <div className="mb-0.5 flex items-center justify-between text-2xs text-neutral-700 dark:text-neutral-300">
              <span className="truncate">{r}</span><span className="flex-shrink-0 font-semibold">{total}</span>
            </div>
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-700">
              {m.colKeys.map((c, i) => {
                const v = m.value(r, c);
                return v > 0 ? <div key={c} className={cn('h-full', bgColorFor(i))} style={{ width: `${(v / total) * 100}%` }} title={`${c}: ${v}`} /> : null;
              })}
            </div>
          </div>
        );
      })}
      <Legend colKeys={m.colKeys} />
    </div>
  );
}

// Grouped columns — per row dimension, one mini bar per column dimension.
export function GroupedBarChart({ matrix, className }) {
  const m = matrix || { rowKeys: [], colKeys: [], value: () => 0, max: 0 };
  if (m.rowKeys.length === 0) {
    return <p className="text-xs text-neutral-600 dark:text-neutral-400">No data yet.</p>;
  }
  const max = Math.max(1, m.max);
  return (
    <div className={cn('space-y-3', className)} role="img" aria-label={`Grouped bar: ${summarize(m)}`}>
      {m.rowKeys.map((r) => (
        <div key={r}>
          <p className="mb-1 truncate text-2xs text-neutral-700 dark:text-neutral-300">{r}</p>
          <div className="space-y-1">
            {m.colKeys.map((c, i) => {
              const v = m.value(r, c);
              return (
                <div key={c} className="flex items-center gap-2">
                  <span className="w-16 flex-shrink-0 truncate text-2xs text-neutral-600 dark:text-neutral-400">{c}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-700">
                    <div className={cn('h-full rounded-full', bgColorFor(i))} style={{ width: `${(v / max) * 100}%` }} />
                  </div>
                  <span className="w-8 flex-shrink-0 text-right text-2xs font-semibold text-neutral-700 dark:text-neutral-300">{v}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// Heatmap grid — cell opacity scales with value; a data table backs it for a11y.
export function HeatmapChart({ matrix, className }) {
  const m = matrix || { rowKeys: [], colKeys: [], value: () => 0, max: 0 };
  if (m.rowKeys.length === 0) {
    return <p className="text-xs text-neutral-600 dark:text-neutral-400">No data yet.</p>;
  }
  const max = Math.max(1, m.max);
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full border-collapse text-2xs">
        <caption className="sr-only">Heatmap of values by {m.rowKeys.length} rows and {m.colKeys.length} columns</caption>
        <thead>
          <tr>
            <th scope="col" className="p-1 text-left font-semibold text-neutral-500" />
            {m.colKeys.map((c) => <th scope="col" key={c} className="p-1 text-right font-semibold text-neutral-600 dark:text-neutral-400">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {m.rowKeys.map((r) => (
            <tr key={r}>
              <th scope="row" className="p-1 text-left font-medium text-neutral-700 dark:text-neutral-300 truncate">{r}</th>
              {m.colKeys.map((c) => {
                const v = m.value(r, c);
                // Opacity step from a token-classed navy fill — value also printed, never colour-only.
                const pct = Math.round((v / max) * 100);
                return (
                  <td key={c} className="p-0.5">
                    <div className="relative flex h-7 items-center justify-center rounded-sm bg-neutral-100 dark:bg-neutral-700">
                      <span aria-hidden="true" className="absolute inset-0 rounded-sm bg-brand-navy-tint" style={{ opacity: v > 0 ? 0.15 + (pct / 100) * 0.75 : 0 }} />
                      <span className="relative font-semibold text-neutral-900 dark:text-neutral-100">{v || ''}</span>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Plain numeric matrix table — the multi-measure two-dim fallback ("matrix" chart type).
export function MatrixTable({ matrix, className }) {
  const m = matrix || { rowKeys: [], colKeys: [], value: () => 0 };
  if (m.rowKeys.length === 0) {
    return <p className="text-xs text-neutral-600 dark:text-neutral-400">No data yet.</p>;
  }
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-neutral-500">
            <th scope="col" className="py-1 pr-2 text-left font-semibold" />
            {m.colKeys.map((c) => <th scope="col" key={c} className="px-1 py-1 text-right font-semibold">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {m.rowKeys.map((r) => (
            <tr key={r} className="border-t border-neutral-100 dark:border-neutral-700/50">
              <th scope="row" className="py-1 pr-2 text-left font-medium text-neutral-700 dark:text-neutral-300 truncate">{r}</th>
              {m.colKeys.map((c) => {
                const v = m.value(r, c);
                return <td key={c} className={cn('px-1 py-1 text-right', v > 0 ? 'font-semibold text-neutral-900 dark:text-neutral-100' : 'text-neutral-600 dark:text-neutral-400')}>{v || '—'}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
