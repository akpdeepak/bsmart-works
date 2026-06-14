// Know Studio — BQL widget block. Embed a live dashboard widget inside an article: write a BQL
// query, pick a group-by dimension + measure + chart type, and the block renders pre-aggregated
// workspace data. Reuses the one BQL engine and the server-side pivot resolver (RB-10 §6, RB-40 §1
// — tenant scope + field security enforced once on the server), and the design-system chart
// molecules (token colours only). Several widgets in one article = a dashboard in the doc.
//
// Self-contained: it owns its fetch through resolvePivot. Used by both the editor (config + preview)
// and the read-only renderer (auto-runs on mount). Exports only components (fast-refresh safe).

import { useState, useCallback, useEffect } from 'react';
import { BarChart3, RefreshCw } from 'lucide-react';
import { resolvePivot, buildPivotSpec, AGGS } from '@/lib/pivot';
import { BarChart } from '@/components/works/molecules/bar-chart';
import { LineChart } from '@/components/works/molecules/line-chart';
import { DonutChart } from '@/components/works/molecules/donut-chart';

const CHART_TYPES = ['bar', 'pie', 'line', 'scorecard', 'table'];
// Group-by fields the server allows (BqlController groupable allow-list) — keeps the picker honest.
const DIMENSIONS = ['status', 'type', 'priority', 'severity', 'assignee', 'project', 'sprint'];

const cfg = (block) => ({
  query: block.content || '',
  dimension: block.metadata?.dimension ?? 'status',
  measureField: block.metadata?.measureField || '*',
  measureAgg: block.metadata?.measureAgg || 'COUNT',
  chartType: block.metadata?.chartType || 'bar',
  title: block.metadata?.title || '',
});

function specFor(c) {
  const dims = c.chartType === 'scorecard' ? [] : (c.dimension ? [c.dimension] : []);
  return buildPivotSpec({
    sourceKind: 'bql',
    query: c.query,
    mode: 'group',
    measures: [{ field: c.measureField, agg: c.measureAgg }],
    dimensions: dims,
  });
}

// Map a PivotResult ({ dimensions, measures, rows }) to chart points [{ label, value }].
function toSeries(result) {
  if (!result || !Array.isArray(result.rows)) return [];
  const dim = result.dimensions?.[0];
  const measure = result.measures?.[0];
  if (!measure) return [];
  return result.rows.map((row) => ({
    label: dim ? String(row[dim] ?? '—') : 'Total',
    value: Number(row[measure]) || 0,
  }));
}

function WidgetChart({ chartType, result }) {
  if (chartType === 'table') {
    const cols = [...(result.dimensions || []), ...(result.measures || [])];
    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {cols.map((c) => (
                <th key={c} className="border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-2 py-1 text-left font-semibold text-neutral-600 dark:text-neutral-300">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row, ri) => (
              <tr key={ri}>
                {cols.map((c) => (
                  <td key={c} className="border border-neutral-200 dark:border-neutral-700 px-2 py-1 text-neutral-900 dark:text-neutral-100 tabular-nums">{String(row[c] ?? '')}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  const series = toSeries(result);
  if (chartType === 'scorecard') {
    const total = series.reduce((a, b) => a + b.value, 0);
    return <p className="text-3xl font-bold text-brand-navy dark:text-brand-amber tabular-nums">{total}</p>;
  }
  if (series.length === 0) return <p className="text-xs text-neutral-500">No matching items.</p>;
  if (chartType === 'line') return <LineChart data={series} area />;
  if (chartType === 'pie') return <DonutChart data={series} />;
  return <BarChart data={series} />;
}

/**
 * @param {Object} props
 * @param {Object} props.block       the bqlwidget block
 * @param {Function} [props.onChange] edit-mode change handler (omit for read-only)
 * @param {string} [props.workspaceId]
 * @param {boolean} [props.readOnly]
 */
export function BqlWidget({ block, onChange, workspaceId, readOnly = false }) {
  const c = cfg(block);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = useCallback(() => {
    if (!workspaceId) { setError('No workspace context.'); return; }
    setLoading(true);
    setError(null);
    resolvePivot(workspaceId, specFor(cfg(block)))
      .then((res) => setResult(res))
      .catch((e) => setError(e?.message || 'Could not run the query.'))
      .finally(() => setLoading(false));
  }, [workspaceId, block]);

  // Read mode auto-runs once the workspace is known (external-state sync — the documented exception
  // to react-hooks/set-state-in-effect, matching the dashboard widgets).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (readOnly && workspaceId && c.query.trim()) run(); }, [readOnly, workspaceId]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (patch) => onChange?.(patch);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <BarChart3 aria-hidden="true" className="h-4 w-4 text-brand-navy" />
        {readOnly ? (
          <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{c.title || 'Workspace widget'}</h4>
        ) : (
          <input
            type="text"
            aria-label="Widget title"
            value={c.title}
            onChange={(e) => set({ metadata: { ...block.metadata, title: e.target.value } })}
            placeholder="Widget title"
            className="flex-1 text-sm font-semibold bg-transparent border-b border-neutral-200 dark:border-neutral-700 pb-0.5 text-neutral-900 dark:text-neutral-100 focus-visible:outline-none focus-visible:border-brand-navy-tint"
          />
        )}
        <button
          type="button"
          onClick={run}
          disabled={loading || !workspaceId}
          aria-label="Run widget query"
          className="inline-flex items-center gap-1 text-xs text-brand-navy hover:text-brand-navy-tint disabled:opacity-50 rounded px-1.5 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
        >
          <RefreshCw aria-hidden="true" className={loading ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
          {loading ? 'Running…' : 'Run'}
        </button>
      </div>

      {!readOnly && (
        <div className="space-y-2 rounded-md border border-neutral-100 dark:border-neutral-800 p-2">
          <input
            type="text"
            aria-label="BQL query"
            value={c.query}
            onChange={(e) => set({ content: e.target.value })}
            placeholder="BQL — e.g. status != 'Done' AND priority = 'High'"
            className="w-full text-sm font-mono bg-transparent border border-neutral-200 dark:border-neutral-700 rounded px-2 py-1.5 text-neutral-900 dark:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
          />
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-2xs text-neutral-500">Chart
              <select
                aria-label="Chart type"
                value={c.chartType}
                onChange={(e) => set({ metadata: { ...block.metadata, chartType: e.target.value } })}
                className="ml-1 text-xs bg-transparent border border-neutral-200 dark:border-neutral-700 rounded px-1.5 py-1 capitalize text-neutral-700 dark:text-neutral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
              >
                {CHART_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            {c.chartType !== 'scorecard' && (
              <label className="text-2xs text-neutral-500">Group by
                <select
                  aria-label="Group by dimension"
                  value={c.dimension}
                  onChange={(e) => set({ metadata: { ...block.metadata, dimension: e.target.value } })}
                  className="ml-1 text-xs bg-transparent border border-neutral-200 dark:border-neutral-700 rounded px-1.5 py-1 text-neutral-700 dark:text-neutral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
                >
                  {DIMENSIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </label>
            )}
            <label className="text-2xs text-neutral-500">Measure
              <select
                aria-label="Measure aggregation"
                value={c.measureAgg}
                onChange={(e) => set({ metadata: { ...block.metadata, measureAgg: e.target.value } })}
                className="ml-1 text-xs bg-transparent border border-neutral-200 dark:border-neutral-700 rounded px-1.5 py-1 text-neutral-700 dark:text-neutral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
              >
                {AGGS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
              </select>
            </label>
            {c.measureAgg !== 'COUNT' && (
              <input
                type="text"
                aria-label="Measure field"
                value={c.measureField === '*' ? '' : c.measureField}
                onChange={(e) => set({ metadata: { ...block.metadata, measureField: e.target.value || '*' } })}
                placeholder="field (e.g. storyPoints)"
                className="w-36 text-xs bg-transparent border border-neutral-200 dark:border-neutral-700 rounded px-2 py-1 text-neutral-900 dark:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
              />
            )}
          </div>
        </div>
      )}

      <div className="rounded-md border border-neutral-100 dark:border-neutral-800 p-3 bg-neutral-50 dark:bg-neutral-900/50 min-h-12">
        {error ? (
          <p className="text-xs text-semantic-danger">{error}</p>
        ) : loading && !result ? (
          <div className="h-12 rounded bg-neutral-100 dark:bg-neutral-800 animate-pulse" aria-hidden="true" />
        ) : result ? (
          <WidgetChart chartType={c.chartType} result={result} />
        ) : (
          <p className="text-xs text-neutral-500">{c.query.trim() ? 'Press Run to load live data.' : 'Add a BQL query above.'}</p>
        )}
      </div>
    </div>
  );
}
