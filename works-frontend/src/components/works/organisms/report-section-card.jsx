import { useEffect, useState } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { DonutChart, BarChart } from '@/components/works/molecules';
import { PivotChart } from '@/components/works/organisms/pivot-chart';
import { WidgetBuilder } from '@/components/works/organisms/widget-builder';
import { resolvePivot, buildPivotSpec } from '@/lib/pivot';
import { aggregateByDimension, filterReportItems } from '@/lib/dashboard-metrics';

/**
 * PivotSectionBody — resolves a report section's saved PivotSpec through the shared pivot client
 * (one apiClient, workspace-scoped server-side) and renders it via <PivotChart/>. Five states
 * handled inline (loading / empty / error). Same component reused by Dashboards + Reports.
 */
function PivotSectionBody({ spec, workspaceId }) {
  const [state, setState] = useState({ loading: true, error: null, result: null });
  const specKey = JSON.stringify(spec);
  useEffect(() => {
    let alive = true;
    if (!workspaceId || !spec) {
      setState({ loading: false, error: workspaceId ? null : 'No workspace selected.', result: null });
      return undefined;
    }
    setState((s) => ({ ...s, loading: true, error: null }));
    resolvePivot(workspaceId, buildPivotSpec(spec))
      .then((result) => { if (alive) setState({ loading: false, error: null, result }); })
      .catch((e) => { if (alive) setState({ loading: false, error: e.message || 'Could not load this section.', result: null }); });
    return () => { alive = false; };
    // specKey captures the spec identity; spec itself is intentionally excluded.
  }, [workspaceId, specKey]);
  return <PivotChart type={spec?.chartType || 'pivot_table'} result={state.result} loading={state.loading} error={state.error} />;
}

/**
 * ReportSectionControls — edit controls for a report section's config.
 * Shown only in edit mode (private helper for ReportSectionCard).
 */
function ReportSectionControls({ section, onChange }) {
  const config = section.config || {};
  const setConfig = (patch) => onChange({ ...section, config: { ...config, ...patch } });
  const setFilter = (patch) => setConfig({ filter: { ...(config.filter || {}), ...patch } });
  return (
    <div className="flex flex-wrap items-center gap-3 mb-3 p-2 rounded-md bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-700">
      {section.type === 'chart' && (
        <>
          <label className="text-xs text-neutral-600 dark:text-neutral-400 flex items-center gap-1">Chart
            <select value={config.chartType || 'bar'} onChange={e => setConfig({ chartType: e.target.value })}
              className="text-xs rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-1 py-0.5">
              <option value="bar">Bar</option>
              <option value="pie">Pie</option>
            </select>
          </label>
          <label className="text-xs text-neutral-600 dark:text-neutral-400 flex items-center gap-1">Group by
            <select value={config.dimension || 'status'} onChange={e => setConfig({ dimension: e.target.value })}
              className="text-xs rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-1 py-0.5">
              <option value="status">Status</option>
              <option value="type">Type</option>
              <option value="priority">Priority</option>
            </select>
          </label>
        </>
      )}
      {section.type === 'table' && (
        <label className="text-xs text-neutral-600 dark:text-neutral-400 flex items-center gap-1">Limit
          <input type="number" min="1" max="100" value={config.limit || 20}
            onChange={e => setConfig({ limit: Math.max(1, Math.min(100, Number(e.target.value) || 20)) })}
            className="w-16 text-xs rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-1 py-0.5" />
        </label>
      )}
      {section.type !== 'narrative' && (
        <label className="text-xs text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5">
          <input type="checkbox" checked={!!(config.filter && config.filter.open)}
            onChange={e => setFilter({ open: e.target.checked })} />
          Open items only
        </label>
      )}
    </div>
  );
}

/**
 * ReportSectionCard — renders one section of a custom report from the live work-item set.
 * type: kpi | chart | table | narrative. In edit mode it shows title + config controls.
 *
 * Extracted from App.jsx (TD-003).
 */
export function ReportSectionCard({ section, index, total, workItems, editMode, onChange, onMove, onRemove, workspaceId }) {
  const config = section.config || {};
  const items = filterReportItems(workItems, config.filter);
  const [editingPivot, setEditingPivot] = useState(false);

  return (
    <section className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        {editMode ? (
          <input value={section.title || ''} onChange={e => onChange({ ...section, title: e.target.value })}
            aria-label="Section title" placeholder="Section title"
            className="flex-1 text-sm font-semibold text-neutral-900 dark:text-white bg-transparent border-b border-neutral-200 dark:border-neutral-700 focus-visible:outline-none focus-visible:border-brand-navy" />
        ) : (
          <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wide">{section.title || section.type}</h3>
        )}
        {editMode && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={() => onMove(-1)} disabled={index === 0} aria-label="Move section up"
              className="text-xs px-1.5 py-0.5 rounded border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-brand-navy disabled:opacity-40 disabled:pointer-events-none"><ArrowUp className="h-3.5 w-3.5" aria-hidden="true" /></button>
            <button onClick={() => onMove(1)} disabled={index === total - 1} aria-label="Move section down"
              className="text-xs px-1.5 py-0.5 rounded border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-brand-navy disabled:opacity-40 disabled:pointer-events-none"><ArrowDown className="h-3.5 w-3.5" aria-hidden="true" /></button>
            <button onClick={onRemove} aria-label="Remove section" className="text-xs text-semantic-danger hover:underline ml-1">Remove</button>
          </div>
        )}
      </div>

      {editMode && <ReportSectionControls section={section} onChange={onChange} />}

      {section.type === 'kpi' && (
        <p className="text-3xl font-bold text-brand-navy dark:text-white">{items.length}</p>
      )}

      {section.type === 'chart' && (
        config.chartType === 'pie'
          ? <DonutChart data={aggregateByDimension(items, config.dimension || 'status')} />
          : <BarChart data={aggregateByDimension(items, config.dimension || 'status')} />
      )}

      {section.type === 'table' && (
        <div className="divide-y divide-neutral-100 dark:divide-neutral-700/50">
          {items.length === 0 && <p className="text-xs text-neutral-600 dark:text-neutral-600">No matching items.</p>}
          {items.slice(0, config.limit || 20).map(i => (
            <div key={i.id} className="flex items-center justify-between gap-2 py-1.5">
              <span className="min-w-0 flex-1 truncate text-sm text-neutral-800 dark:text-neutral-200">{i.title}</span>
              <span className="flex items-center gap-3 flex-shrink-0">
                <span className="text-xs text-neutral-600 dark:text-neutral-400">{i.priority || '—'}</span>
                <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">{i.status}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      {section.type === 'narrative' && (
        editMode
          ? <textarea value={config.text || ''} rows={3} placeholder="Write the narrative for this section…"
              onChange={e => onChange({ ...section, config: { ...config, text: e.target.value } })}
              className="w-full text-sm text-neutral-800 dark:text-neutral-200 bg-neutral-50 dark:bg-neutral-900 rounded-md border border-neutral-200 dark:border-neutral-700 p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40" />
          : (config.text
              ? <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">{config.text}</p>
              : <p className="text-sm text-neutral-600 dark:text-neutral-400">—</p>)
      )}

      {section.type === 'pivot' && (
        editMode ? (
          editingPivot ? (
            <WidgetBuilder workspaceId={workspaceId} value={config.spec}
              onSave={(spec) => { onChange({ ...section, config: { ...config, spec } }); setEditingPivot(false); }}
              onCancel={() => setEditingPivot(false)} />
          ) : (
            <div className="flex items-center gap-3">
              {config.spec
                ? <div className="flex-1 min-w-0"><PivotSectionBody spec={config.spec} workspaceId={workspaceId} /></div>
                : <p className="flex-1 text-xs text-neutral-600 dark:text-neutral-400">No chart configured yet.</p>}
              <button type="button" onClick={() => setEditingPivot(true)}
                className="flex-shrink-0 text-xs px-2.5 py-1.5 rounded-lg border border-brand-navy/40 text-brand-navy dark:text-brand-amber hover:border-brand-navy transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40">
                {config.spec ? 'Edit chart' : 'Configure chart'}
              </button>
            </div>
          )
        ) : (
          config.spec
            ? <PivotSectionBody spec={config.spec} workspaceId={workspaceId} />
            : <p className="text-sm text-neutral-600 dark:text-neutral-400">—</p>
        )
      )}
    </section>
  );
}
