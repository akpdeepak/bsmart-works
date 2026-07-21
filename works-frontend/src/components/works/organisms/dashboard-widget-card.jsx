import { useEffect, useState } from 'react';
import { DonutChart, BarChart } from '@/components/works/molecules';
import { PivotChart } from '@/components/works/organisms/pivot-chart';
import { resolvePivot, buildPivotSpec } from '@/lib/pivot';
import {
  filterItems as filterWidgetItems,
  statusBreakdown,
  statusPriorityMatrix,
  sprintProgress,
  velocityPoints,
  SERIES_BG,
  aggregateByDimension,
} from '@/lib/dashboard-metrics';

/**
 * PivotWidgetBody — renders a multi-dimensional PIVOT widget. In the authenticated app it resolves
 * the saved PivotSpec through the shared pivot client (one apiClient, workspace-scoped server-side).
 * On the unauthenticated public embed there is no workspaceId, so the server pre-resolves the pivot
 * and passes it in as `resolved` ({ dimensions, measures, rows } or { error }) — the card renders it
 * directly, no client query. Self-contained five-state handling (loading / empty / error).
 */
function PivotWidgetBody({ config, workspaceId, resolved }) {
  // Pre-resolved (embed) path: no workspaceId, render the server result straight through.
  const hasResolved = resolved !== undefined && resolved !== null;
  const [state, setState] = useState({ loading: !hasResolved, error: null, result: null });
  const specKey = JSON.stringify(config);

  useEffect(() => {
    if (hasResolved) return undefined; // server already resolved this widget — skip the client query
    let alive = true;
    if (!workspaceId) {
      setState({ loading: false, error: 'No workspace selected.', result: null });
      return undefined;
    }
    setState((s) => ({ ...s, loading: true, error: null }));
    resolvePivot(workspaceId, buildPivotSpec(config))
      .then((result) => { if (alive) setState({ loading: false, error: null, result }); })
      .catch((e) => { if (alive) setState({ loading: false, error: e.message || 'Could not load this widget.', result: null }); });
    return () => { alive = false; };
    // specKey captures the config object identity; config itself is intentionally excluded.
  }, [workspaceId, specKey, hasResolved]);

  if (hasResolved) {
    return (
      <PivotChart type={config.chartType || 'pivot_table'}
        result={resolved.error ? null : resolved} error={resolved.error || null}
        loading={false} className="mt-1" />
    );
  }
  return (
    <PivotChart type={config.chartType || 'pivot_table'} result={state.result}
      loading={state.loading} error={state.error} className="mt-1" />
  );
}

/**
 * DashboardWidgetCard — renders a single dashboard widget from the live work-item set.
 * Widget data is computed client-side from the config (metric + filter) so the
 * designer is fully functional without a per-widget query endpoint.
 *
 * Extracted from App.jsx (TD-003).
 */
export function DashboardWidgetCard({ widget, workItems, aggregate, editMode, onRemove, onResize, onConfigChange, onDrill, onDragStart, onDrop, sprints, velocity, currentUserId, workspaceId, onEditPivot, resolvedPivot }) {
  let config = {};
  try { config = JSON.parse(widget.config || '{}'); } catch { config = {}; }
  const filter = config.filter || {};
  const items = filterWidgetItems(workItems, filter, { currentUserId });
  const isChart = widget.widgetType === 'PIE' || widget.widgetType === 'BAR';
  const dimension = config.dimension || 'status';
  // When a server scope aggregate is present (TEAM/ORG), it takes precedence over the
  // client-loaded items; its by-dimension series is already [{ label, value }].
  const aggKey = 'by' + dimension.charAt(0).toUpperCase() + dimension.slice(1);
  const chartData = aggregate ? (aggregate[aggKey] || []) : aggregateByDimension(items, dimension);
  const scorecardCount = aggregate ? (aggregate.total ?? 0) : items.length;
  const statusSeries = aggregate
    ? (aggregate.byStatus || [])
    : Object.entries(items.reduce((acc, i) => { const k = i.status || 'Unknown'; acc[k] = (acc[k] || 0) + 1; return acc; }, {}))
        .map(([label, value]) => ({ label, value }));
  const listItems = aggregate ? (aggregate.recent || []) : items;
  const span = Math.max(1, Math.min(widget.gridW || 4, 12));
  // Drill needs an underlying item set to list. The aggregate overrides only the *series*; the
  // client-loaded `items` (workItems narrowed by the widget's own filter) are still available, so
  // a widget is drillable whenever there are items to show — including server-aggregate widgets,
  // as long as the client carries the matching rows (§3.4). A pure server aggregate with no client
  // items can't list a slice, so drill stays off then.
  const canDrill = !editMode && !!onDrill && items.length > 0;
  const drillBy = (label) => items.filter(i => (i[dimension] || 'None') === label);

  // Every drill carries the widget's filter/dimension context so the modal lists exactly the
  // underlying rows for the clicked slice — not the whole dashboard (§3.4). `value` is the slice
  // (a status / dimension value); omit it for a whole-widget drill (e.g. the scorecard total).
  const drill = (sliceItems, sliceLabel, value) => onDrill({
    title: sliceLabel,
    items: sliceItems,
    filterContext: { baseFilter: filter, dimension, value: value ?? null },
  });

  return (
    <div
      style={{ gridColumn: `span ${span} / span ${span}` }}
      draggable={editMode}
      onDragStart={editMode ? onDragStart : undefined}
      onDragOver={editMode ? (e => e.preventDefault()) : undefined}
      onDrop={editMode ? onDrop : undefined}
      className={`bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 ${editMode ? 'cursor-move ring-1 ring-brand-navy/20' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wide truncate">{widget.title || widget.widgetType}</p>
        {editMode && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {[4, 6, 12].map(w => (
              <button key={w} onClick={() => onResize(w)} aria-label={`Set width ${w}`}
                className={`text-xs px-1.5 py-0.5 rounded border transition-colors ${span === w ? 'bg-brand-navy text-white border-brand-navy' : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-brand-navy'}`}>
                {w === 12 ? 'Full' : `${w}`}
              </button>
            ))}
            {widget.widgetType === 'PIVOT' && onEditPivot && (
              <button onClick={() => onEditPivot(widget)} className="text-xs text-brand-navy dark:text-brand-amber hover:underline ml-1">Edit chart</button>
            )}
            <button onClick={onRemove} aria-label="Remove widget" className="text-xs text-semantic-danger hover:underline ml-1">Remove</button>
          </div>
        )}
      </div>

      {editMode && isChart && (
        <div className="flex items-center gap-2 mb-2">
          <label htmlFor={`dim-${widget.id}`} className="text-xs uppercase tracking-wide text-neutral-600 dark:text-neutral-400">Group by</label>
          <select id={`dim-${widget.id}`} value={dimension}
            onChange={e => onConfigChange && onConfigChange({ ...config, dimension: e.target.value })}
            className="text-xs rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-1.5 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40">
            <option value="status">Status</option>
            <option value="type">Type</option>
            <option value="priority">Priority</option>
          </select>
        </div>
      )}

      {widget.widgetType === 'SCORECARD' && (
        canDrill ? (
          <button type="button" onClick={() => drill(items, widget.title || 'Items')}
            className="text-3xl font-bold text-brand-navy dark:text-white rounded hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40">
            {scorecardCount}
          </button>
        ) : (
          <p className="text-3xl font-bold text-brand-navy dark:text-white">{scorecardCount}</p>
        )
      )}

      {widget.widgetType === 'STATUS_BAR' && (
        <div className="space-y-1.5 mt-1">
          {(() => {
            const entries = statusSeries;
            const max = Math.max(1, ...entries.map(e => e.value));
            if (entries.length === 0) return <p className="text-xs text-neutral-600 dark:text-neutral-600">No matching items.</p>;
            return entries.map(({ label: status, value: count }) => {
              const row = (
                <>
                  <span className="text-xs text-neutral-600 dark:text-neutral-400 w-24 truncate text-left">{status}</span>
                  <div className="flex-1 h-2 rounded-full bg-neutral-100 dark:bg-neutral-700 overflow-hidden">
                    <div className="h-full bg-brand-navy-tint rounded-full" style={{ width: `${(count / max) * 100}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 w-6 text-right">{count}</span>
                </>
              );
              return canDrill ? (
                <button key={status} type="button" aria-label={`${status}: ${count} — show items`}
                  onClick={() => drill(items.filter(i => (i.status || 'Unknown') === status), `${widget.title || 'Items'} · Status: ${status}`, status)}
                  className="flex w-full items-center gap-2 rounded px-1 -mx-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 transition-colors">
                  {row}
                </button>
              ) : (
                <div key={status} className="flex items-center gap-2">{row}</div>
              );
            });
          })()}
        </div>
      )}

      {widget.widgetType === 'ITEM_LIST' && (
        <div className="space-y-1 mt-1">
          {listItems.length === 0 && <p className="text-xs text-neutral-600 dark:text-neutral-600">No matching items.</p>}
          {listItems.slice(0, config.limit || 6).map(i => (
            <div key={i.id} className="flex items-center justify-between gap-2 py-1 border-b border-neutral-100 dark:border-neutral-700/50 last:border-0">
              <span className="text-xs text-neutral-700 dark:text-neutral-300 truncate">{i.title}</span>
              <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400 flex-shrink-0">{i.status}</span>
            </div>
          ))}
        </div>
      )}

      {widget.widgetType === 'PIE' && (
        <DonutChart data={chartData}
          onSelect={canDrill ? (e => drill(drillBy(e.label), `${widget.title || 'Items'} · ${dimension}: ${e.label}`, e.label)) : undefined} />
      )}

      {widget.widgetType === 'BAR' && (
        <BarChart data={chartData}
          onSelect={canDrill ? (e => drill(drillBy(e.label), `${widget.title || 'Items'} · ${dimension}: ${e.label}`, e.label)) : undefined} />
      )}

      {widget.widgetType === 'PIVOT' && (
        config.spec
          ? <PivotWidgetBody config={config.spec} workspaceId={workspaceId} resolved={resolvedPivot} />
          : <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">Configure this widget — turn on Edit and pick a source, measures and a chart type.</p>
      )}

      {(widget.widgetType === 'SPRINT_HEALTH' || widget.widgetType === 'BURNDOWN') && (() => {
        const p = sprintProgress(sprints, config.mode || (widget.widgetType === 'BURNDOWN' ? 'burndown' : 'health'));
        const pct = p.max ? Math.round((p.value / p.max) * 100) : 0;
        return (
          <div className="mt-1">
            <div className="flex items-end justify-between mb-1">
              <span className="text-3xl font-bold text-brand-navy dark:text-white">{pct}%</span>
              <span className="text-xs text-neutral-600 dark:text-neutral-400">{p.value}/{p.max || 0} pt · {p.label}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-neutral-100 dark:bg-neutral-700 overflow-hidden">
              <div className="h-full bg-semantic-success rounded-full" style={{ width: `${p.max ? Math.min((p.value / p.max) * 100, 100) : 0}%` }} />
            </div>
            <p className="text-xs text-neutral-500 mt-1 truncate">{p.sprint?.name || 'No active sprint'}</p>
          </div>
        );
      })()}

      {widget.widgetType === 'VELOCITY_LINE' && (() => {
        const points = velocityPoints(velocity);
        if (points.length === 0) return <p className="text-xs text-neutral-600">No sprint history yet.</p>;
        const max = Math.max(1, ...points.map(p => p.value));
        const n = points.length;
        const path = points.map((p, i) => `${n <= 1 ? 0 : (i / (n - 1)) * 100},${30 - (p.value / max) * 28}`).join(' ');
        return (
          <div className="mt-1 text-brand-navy dark:text-brand-amber">
            <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-14" aria-hidden="true">
              <polyline points={path} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
            </svg>
            <div className="flex justify-between text-xs text-neutral-500 mt-1">
              <span>{points[0]?.label}</span><span>{points[points.length - 1]?.label}</span>
            </div>
          </div>
        );
      })()}

      {widget.widgetType === 'CUMULATIVE_FLOW' && (() => {
        const series = statusBreakdown(items);
        const total = series.reduce((a, b) => a + b.value, 0) || 1;
        if (series.length === 0) return <p className="text-xs text-neutral-600">No matching items.</p>;
        return (
          <div className="mt-1">
            <div className="flex w-full h-3 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-700">
              {series.map((s, idx) => (
                <div key={s.label} className={SERIES_BG[idx % SERIES_BG.length]} style={{ width: `${(s.value / total) * 100}%` }} title={`${s.label}: ${s.value}`} />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
              {series.map((s, idx) => (
                <span key={s.label} className="flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-400">
                  <span className={`w-2 h-2 rounded-full ${SERIES_BG[idx % SERIES_BG.length]}`} />
                  {s.label} <span className="font-semibold text-neutral-700 dark:text-neutral-300">{s.value}</span>
                </span>
              ))}
            </div>
          </div>
        );
      })()}

      {widget.widgetType === 'VELOCITY_CHART' && (() => {
        const points = velocityPoints(velocity);
        if (points.length === 0) return <p className="text-xs text-neutral-600 dark:text-neutral-400">No sprint history yet.</p>;
        return <BarChart data={points.map(p => ({ label: p.label, value: p.value }))} />;
      })()}

      {widget.widgetType === 'CYCLE_TIME' && (() => {
        const DONE = ['done','closed','resolved','complete','completed'];
        const doneItems = items.filter(i => DONE.includes((i.status || '').toLowerCase()));
        if (doneItems.length === 0) return <p className="text-xs text-neutral-600 dark:text-neutral-400">No completed items.</p>;
        const avgDays = doneItems.reduce((sum, i) => {
          const ms = new Date(i.updatedAt) - new Date(i.createdAt);
          return sum + Math.max(0, ms / 86400000);
        }, 0) / doneItems.length;
        return (
          <div className="mt-1">
            <p className="text-3xl font-bold text-brand-navy dark:text-white">{avgDays.toFixed(1)}</p>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">avg days · {doneItems.length} completed items</p>
          </div>
        );
      })()}

      {widget.widgetType === 'THROUGHPUT' && (() => {
        const DONE = ['done','closed','resolved','complete','completed'];
        const count = aggregate?.throughput ?? items.filter(i => DONE.includes((i.status || '').toLowerCase())).length;
        return (
          <div className="mt-1">
            <p className="text-3xl font-bold text-brand-navy dark:text-white">{count}</p>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">completed items</p>
          </div>
        );
      })()}

      {widget.widgetType === 'AI_USAGE' && (() => {
        const usage = aggregate?.aiUsage;
        if (!usage) return <p className="text-xs text-neutral-600 dark:text-neutral-400">AI usage data is available at workspace scope.</p>;
        return (
          <div className="mt-1 space-y-1.5">
            {[
              { label: 'Calls', value: usage.calls ?? '—' },
              { label: 'Tokens', value: usage.tokens != null ? `${(usage.tokens / 1000).toFixed(1)}k` : '—' },
              { label: 'Budget used', value: usage.budgetPct != null ? `${usage.budgetPct}%` : '—' },
            ].map(m => (
              <div key={m.label} className="flex items-center justify-between text-xs">
                <span className="text-neutral-600 dark:text-neutral-400">{m.label}</span>
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">{m.value}</span>
              </div>
            ))}
          </div>
        );
      })()}

      {widget.widgetType === 'SLA_HEALTH' && (() => {
        const sla = aggregate?.slaHealth;
        if (!sla) return <p className="text-xs text-neutral-600 dark:text-neutral-400">SLA data is available at workspace scope.</p>;
        const pct = sla.compliancePct ?? 0;
        const barColor = pct >= 95 ? 'bg-semantic-success' : pct >= 80 ? 'bg-semantic-warning' : 'bg-semantic-danger';
        return (
          <div className="mt-1">
            <div className="flex items-end justify-between mb-1">
              <span className="text-3xl font-bold text-brand-navy dark:text-white">{pct}%</span>
              <span className="text-xs text-neutral-600 dark:text-neutral-400">{sla.breached ?? 0} breached</span>
            </div>
            <div className="w-full h-2 rounded-full bg-neutral-100 dark:bg-neutral-700 overflow-hidden">
              <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
          </div>
        );
      })()}

      {widget.widgetType === 'MATRIX' && (() => {
        const m = statusPriorityMatrix(items);
        return (
          <div className="mt-1 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-neutral-500">
                  <th className="text-left font-semibold py-1 pr-2">Status</th>
                  {m.cols.map(c => <th key={c} className="text-right font-semibold py-1 px-1">{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {m.rows.map(row => (
                  <tr key={row.label} className="border-t border-neutral-100 dark:border-neutral-700/50">
                    <td className="py-1 pr-2 text-neutral-700 dark:text-neutral-300 truncate">{row.label}</td>
                    {row.cells.map((c, idx) => (
                      <td key={idx} className={`text-right py-1 px-1 ${c > 0 ? 'text-neutral-900 dark:text-neutral-100 font-semibold' : 'text-neutral-600 dark:text-neutral-400'}`}>{c || '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })()}
    </div>
  );
}
