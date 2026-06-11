import { useEffect, useState } from 'react';
import { Modal } from '@/components/works/molecules/modal';
import { DonutChart, BarChart } from '@/components/works/molecules';
import { Button } from '@/components/works/button';

// Today widget picker — add a data-driven widget by picking a curated metric, building a guided
// filter (compiles to BQL server-side), or writing raw BQL. All three resolve through the same
// widget-data executor (slice 2), so the preview shows exactly what will render. The chosen source,
// visualization, and title become a `data` widget appended to the Today layout (slice 5).

const VIZ = [
  { key: 'scorecard', label: 'Number', shape: 'scalar' },
  { key: 'bar', label: 'Bar', shape: 'series' },
  { key: 'donut', label: 'Donut', shape: 'series' },
  { key: 'table', label: 'Table', shape: 'list' },
];
const TYPES = ['STORY', 'BUG', 'TASK', 'EPIC'];
const PRIORITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const GROUP_DIMS = ['status', 'type', 'priority'];

// mode → the viz that fits its data shape (used to auto-pick a sensible default).
const VIZ_FOR_MODE = { count: 'scorecard', group: 'bar', list: 'table' };

function toggle(list, value) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

// Renders a preview result for the chosen viz; defensive about shape mismatches.
function PreviewResult({ viz, result }) {
  if (!result) return <p className="text-xs text-neutral-500">Configure a source to preview.</p>;
  if (result.error) return <p className="text-xs text-semantic-danger">{result.error}</p>;
  if (viz === 'scorecard') {
    return <p className="text-3xl font-bold text-brand-navy dark:text-white">{result.value ?? result.series?.length ?? result.rows?.length ?? 0}</p>;
  }
  if (viz === 'bar') return <BarChart data={(result.series || []).map((s) => ({ label: String(s.label), value: Number(s.value) }))} />;
  if (viz === 'donut') return <DonutChart data={(result.series || []).map((s) => ({ label: String(s.label), value: Number(s.value) }))} />;
  const rows = result.rows || [];
  if (!rows.length) return <p className="text-xs text-neutral-500">No matching items.</p>;
  return (
    <ul className="space-y-1 text-xs">
      {rows.slice(0, 6).map((r) => (
        <li key={r.id} className="flex items-center gap-2 truncate text-neutral-700 dark:text-neutral-300">
          <span className="font-mono text-neutral-400">{r.id}</span>
          <span className="truncate">{r.title}</span>
        </li>
      ))}
    </ul>
  );
}

const tabBtn = (active) => [
  '-mb-px px-3 py-2 text-sm font-medium border-b-2 transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40',
  active ? 'border-brand-orange text-brand-navy dark:text-neutral-100' : 'border-transparent text-neutral-500 hover:text-brand-navy',
].join(' ');

const field = 'w-full rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-sm text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100';
const chip = (active) => [
  'rounded-full px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40',
  active ? 'bg-brand-navy text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-300',
].join(' ');

export function TodayWidgetPicker({ onClose, onAdd, metrics = [], onPreview }) {
  const [tab, setTab] = useState('metric');
  const [title, setTitle] = useState('');
  const [viz, setViz] = useState('scorecard');
  const [metricKey, setMetricKey] = useState(metrics[0]?.key || '');
  const [guided, setGuided] = useState({ mine: false, open: true, overdue: false, types: [], priorities: [] });
  const [mode, setMode] = useState('count');
  const [groupBy, setGroupBy] = useState('status');
  const [bql, setBql] = useState('status != "Done"');
  const [preview, setPreview] = useState(null);

  // Build the WidgetSource for the active tab.
  function buildSource() {
    if (tab === 'metric') return metricKey ? { kind: 'metric', key: metricKey } : null;
    if (tab === 'guided') return { kind: 'guided', guided, mode, groupBy, limit: 8 };
    return { kind: 'bql', query: bql, mode, groupBy, limit: 8 };
  }

  // Suggest a viz that fits the data shape (user can still override). Done in the change handlers,
  // not an effect, so there's no synchronous setState-in-effect.
  function suggestViz(t, mk, md) {
    if (t === 'metric') {
      const m = metrics.find((x) => x.key === mk);
      return m?.shape === 'series' ? 'bar' : 'scorecard';
    }
    return VIZ_FOR_MODE[md] || 'scorecard';
  }
  const pickTab = (t) => { setTab(t); setViz(suggestViz(t, metricKey, mode)); };
  const pickMetric = (mk) => { setMetricKey(mk); setViz(suggestViz('metric', mk, mode)); };
  const pickMode = (md) => { setMode(md); setViz(suggestViz(tab, metricKey, md)); };

  // Debounced live preview through the real executor — all setState runs in the async callback.
  const sourceKey = JSON.stringify(buildSource());
  useEffect(() => {
    const handle = setTimeout(() => {
      const source = buildSource();
      if (!source || !onPreview) { setPreview(null); return; }
      setPreview({ loading: true });
      onPreview(source)
        .then((res) => setPreview(res || { error: 'No data' }))
        .catch((e) => setPreview({ error: e?.message || 'Preview failed' }));
    }, 350);
    return () => clearTimeout(handle);
  }, [sourceKey]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleAdd() {
    const source = buildSource();
    if (!source) return;
    onAdd({
      id: `data-${tab}-${sourceKey.length}-${(title || viz).replace(/\W+/g, '').slice(0, 8)}`,
      type: 'data', span: viz === 'table' ? 8 : 4, spanSm: 12,
      config: { title: title.trim() || metrics.find((m) => m.key === metricKey)?.label || 'Custom widget', viz, source },
    });
    onClose();
  }

  return (
    <Modal title="Add a widget" onClose={onClose} size="xl">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* Left: configure */}
        <div className="space-y-4">
          <div>
            <label htmlFor="w-title" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">Title</label>
            <input id="w-title" className={field} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. My open bugs" />
          </div>

          <div className="flex border-b border-neutral-200 dark:border-neutral-700">
            <button type="button" className={tabBtn(tab === 'metric')} onClick={() => pickTab('metric')}>Pick a metric</button>
            <button type="button" className={tabBtn(tab === 'guided')} onClick={() => pickTab('guided')}>Build</button>
            <button type="button" className={tabBtn(tab === 'bql')} onClick={() => pickTab('bql')}>BQL</button>
          </div>

          {tab === 'metric' && (
            <div>
              <label htmlFor="w-metric" className="mb-1 block text-xs text-neutral-600 dark:text-neutral-400">Curated metric</label>
              <select id="w-metric" className={field} value={metricKey} onChange={(e) => pickMetric(e.target.value)}>
                {metrics.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
              </select>
            </div>
          )}

          {tab === 'guided' && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {[['mine', 'Assigned to me'], ['open', 'Open only'], ['overdue', 'Overdue']].map(([k, lbl]) => (
                  <button key={k} type="button" className={chip(guided[k])} onClick={() => setGuided((g) => ({ ...g, [k]: !g[k] }))}>{lbl}</button>
                ))}
              </div>
              <div>
                <p className="mb-1 text-xs text-neutral-600 dark:text-neutral-400">Types</p>
                <div className="flex flex-wrap gap-2">
                  {TYPES.map((t) => <button key={t} type="button" className={chip(guided.types.includes(t))} onClick={() => setGuided((g) => ({ ...g, types: toggle(g.types, t) }))}>{t}</button>)}
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs text-neutral-600 dark:text-neutral-400">Priorities</p>
                <div className="flex flex-wrap gap-2">
                  {PRIORITIES.map((p) => <button key={p} type="button" className={chip(guided.priorities.includes(p))} onClick={() => setGuided((g) => ({ ...g, priorities: toggle(g.priorities, p) }))}>{p}</button>)}
                </div>
              </div>
            </div>
          )}

          {tab === 'bql' && (
            <div>
              <label htmlFor="w-bql" className="mb-1 block text-xs text-neutral-600 dark:text-neutral-400">BQL query</label>
              <textarea id="w-bql" rows={3} className={`${field} font-mono`} value={bql} onChange={(e) => setBql(e.target.value)}
                placeholder={'type = "BUG" AND status != "Done" AND assignee = currentUser()'} />
            </div>
          )}

          {tab !== 'metric' && (
            <div className="flex gap-3">
              <div className="flex-1">
                <label htmlFor="w-mode" className="mb-1 block text-xs text-neutral-600 dark:text-neutral-400">Show as</label>
                <select id="w-mode" className={field} value={mode} onChange={(e) => pickMode(e.target.value)}>
                  <option value="count">Count</option>
                  <option value="group">Grouped</option>
                  <option value="list">List</option>
                </select>
              </div>
              {mode === 'group' && (
                <div className="flex-1">
                  <label htmlFor="w-group" className="mb-1 block text-xs text-neutral-600 dark:text-neutral-400">Group by</label>
                  <select id="w-group" className={field} value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
                    {GROUP_DIMS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">Visualize as</p>
            <div className="flex flex-wrap gap-2">
              {VIZ.map((v) => <button key={v.key} type="button" className={chip(viz === v.key)} onClick={() => setViz(v.key)}>{v.label}</button>)}
            </div>
          </div>
        </div>

        {/* Right: live preview */}
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">Live preview</p>
          <p className="mb-3 truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{title.trim() || 'Untitled widget'}</p>
          {preview?.loading
            ? <div className="h-16 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
            : <PreviewResult viz={viz} result={preview} />}
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="action" onClick={handleAdd}>Add to Today</Button>
      </div>
    </Modal>
  );
}
