import { useEffect, useState } from 'react';
import { Button } from '@/components/works/button';
import { StatusBadge } from '@/components/works/status-badge';
import { statusToCategory } from '@/components/works/status';
import { DonutChart, BarChart } from '@/components/works/molecules';
import { TodayCanvas } from '@/components/works/organisms/today-canvas';
import { TodayWidgetPicker } from '@/components/works/organisms/today-widget-picker';
import { ArrowRight, Users, BarChart2, Pencil, Check, RotateCcw, Plus } from 'lucide-react';

// ── Shared atoms ──────────────────────────────────────────────────────────────

export function TodayCard({ title, icon: Icon, iconColor, action, actionLabel, children, className }) {
  return (
    <div className={`rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800 ${className || ''}`}>
      <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-3 dark:border-neutral-700">
        <h3 className="flex items-center gap-2 font-semibold text-neutral-900 dark:text-neutral-100">
          {Icon && <Icon className={`h-4 w-4 ${iconColor || 'text-neutral-500'}`} aria-hidden="true" />}
          {title}
        </h3>
        {action && (
          <button type="button" onClick={action}
            className="flex items-center gap-1 text-xs text-brand-navy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded">
            {actionLabel || 'View all'}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

export function HealthRing({ pct, size = 80, stroke = 'stroke-semantic-success', label }) {
  const safe = Math.min(100, Math.max(0, pct || 0));
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 36 36" className="-rotate-90" style={{ width: size, height: size }} aria-hidden="true">
        <circle cx="18" cy="18" r="15.9" fill="none" pathLength="100"
          className="stroke-neutral-100 dark:stroke-neutral-700" strokeWidth="3" />
        <circle cx="18" cy="18" r="15.9" fill="none" pathLength="100"
          className={stroke} strokeWidth="3" strokeLinecap="round"
          strokeDasharray={`${safe} 100`} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center leading-none">
        <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{safe}%</span>
        {label && <span className="mt-0.5 text-2xs text-neutral-500">{label}</span>}
      </div>
    </div>
  );
}

export function MiniBar({ value, max, color = 'bg-brand-navy' }) {
  const pct = max > 0 ? Math.min(100, Math.round((value || 0) * 100 / max)) : 0;
  return (
    <div className="h-2 w-full rounded-full bg-neutral-100 dark:bg-neutral-700">
      <div className={`h-2 rounded-full transition-all duration-base ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Empty({ msg }) {
  return <p className="py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">{msg}</p>;
}

function TodayHeader({ greeting, firstName, rolePill, subtitle, cta, onCta }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl font-bold text-brand-navy dark:text-white">
            Good {greeting}, {firstName}
          </h1>
          {rolePill && (
            <span className="rounded-full bg-brand-navy/10 px-2.5 py-0.5 text-xs font-semibold text-brand-navy dark:bg-neutral-700 dark:text-neutral-200">
              {rolePill}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">{subtitle}</p>
      </div>
      {cta && <Button variant="action" onClick={onCta}>{cta}</Button>}
    </div>
  );
}

// Shared greeting helper. This module exports the shared Today atoms plus this one helper; the
// helper is tightly coupled to the dashboard surfaces, so we keep it here and waive the
// component-only fast-refresh rule (repo pattern — see src/lib/i18n.jsx).
// eslint-disable-next-line react-refresh/only-export-components
export function getGreeting() {
  const h = new Date().getHours();
  return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
}

// ── Today surface — header + edit toolbar + canvas ─────────────────────────────
// Wraps every role's Today: renders the fixed header, the customize/edit controls, and the
// TodayCanvas. Editing happens on a draft layout owned by DashboardView (so Save/Cancel span the
// toolbar); this component only presents it. Built-in default ⇄ personalized is shown as a pill.

// Friendly label for a widget in the "Add" menu — stat widgets name their KPI; others title-case.
function widgetLabel(w) {
  if (w.type === 'stat') return `KPI · ${w.config?.k ?? 'metric'}`;
  return w.type.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// Renders a configured data widget's result per its viz (slice 5). Result comes from the
// /widget-data executor: { shape, value | series | rows } or { error }.
function renderDataViz(viz, result) {
  if (viz === 'scorecard') {
    return <p className="text-3xl font-bold text-brand-navy dark:text-white">{result.value ?? result.series?.length ?? result.rows?.length ?? 0}</p>;
  }
  if (viz === 'bar') return <BarChart data={(result.series || []).map((s) => ({ label: String(s.label), value: Number(s.value) }))} />;
  if (viz === 'donut') return <DonutChart data={(result.series || []).map((s) => ({ label: String(s.label), value: Number(s.value) }))} />;
  const rows = result.rows || [];
  if (!rows.length) return <Empty msg="No matching items." />;
  return (
    <table className="w-full text-sm">
      <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
        {rows.slice(0, 8).map((r) => (
          <tr key={r.id}>
            <td className="py-2 pr-2"><span className="flex min-w-0 items-center gap-2">
              <span className="flex-shrink-0 font-mono text-xs text-neutral-400">{r.id}</span>
              <span className="truncate text-neutral-900 dark:text-neutral-100">{r.title}</span>
            </span></td>
            <td className="py-2 text-right">{r.status && <StatusBadge category={statusToCategory(r.status)}>{r.status}</StatusBadge>}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Generic registry merged into every role's registry, so a saved layout's `data` widgets render
// regardless of which role is active. The widget's result is supplied via ctx.widgetData[id].
const GENERIC_DATA_REGISTRY = {
  data: (ctx, w) => {
    const cfg = w.config || {};
    const result = ctx.widgetData?.[w.id];
    return (
      <TodayCard title={cfg.title || 'Widget'} icon={BarChart2} iconColor="text-brand-navy">
        {!result
          ? <div className="h-16 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
          : result.error
            ? <Empty msg={result.error} />
            : renderDataViz(cfg.viz, result)}
      </TodayCard>
    );
  },
};

function AddWidgetMenu({ addable, onAdd, onNew }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu" aria-expanded={open}
        className="flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:border-brand-navy hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />Add widget
      </button>
      {open && (
        <div role="menu"
          className="absolute right-0 z-dropdown mt-1 max-h-64 w-56 overflow-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
          <button type="button" role="menuitem"
            onClick={() => { onNew(); setOpen(false); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-brand-navy hover:bg-neutral-100 focus-visible:outline-none focus-visible:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-700">
            <Plus className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />New data widget…
          </button>
          {addable.length > 0 && (
            <>
              <div className="my-1 border-t border-neutral-100 dark:border-neutral-700" />
              <p className="px-3 py-1 text-2xs font-semibold uppercase tracking-wide text-neutral-400">Re-add default</p>
              {addable.map((w) => (
                <button key={w.id} type="button" role="menuitem"
                  onClick={() => { onAdd(w); setOpen(false); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-neutral-700 hover:bg-neutral-100 focus-visible:outline-none focus-visible:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700">
                  <Plus className="h-3.5 w-3.5 flex-shrink-0 text-neutral-400" aria-hidden="true" />
                  {widgetLabel(w)}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function TodaySurface({ header, registry, ctx, layout, builtinLayout, edit }) {
  const editing = edit?.editing;
  const shown = editing ? edit.draft : layout;
  const addable = editing ? builtinLayout.filter((b) => !edit.draft.some((d) => d.id === b.id)) : [];
  const tbtn = 'flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40';
  const tools = edit?.widgetTools;

  // Batch-resolve every `data` widget in one round trip (NFR: one call, not one per widget).
  const [widgetData, setWidgetData] = useState({});
  const [pickerOpen, setPickerOpen] = useState(false);
  const dataWidgets = shown.filter((w) => w.type === 'data' && w.config?.source);
  const dataKey = JSON.stringify(dataWidgets.map((w) => [w.id, w.config.source]));
  useEffect(() => {
    if (!dataWidgets.length || !tools?.fetchWidgetData) return undefined;
    const items = {};
    dataWidgets.forEach((w) => { items[w.id] = w.config.source; });
    let cancelled = false;
    tools.fetchWidgetData(items)
      .then((results) => {
        if (cancelled) return;
        const map = {};
        (results || []).forEach((r) => { map[r.id] = r.data ? r.data : { error: r.error || 'No data' }; });
        setWidgetData(map);
      })
      .catch(() => { if (!cancelled) setWidgetData({}); });
    return () => { cancelled = true; };
  }, [dataKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const fullRegistry = { ...GENERIC_DATA_REGISTRY, ...registry };
  const fullCtx = { ...ctx, widgetData };

  return (
    <>
      <TodayHeader {...header} />
      {edit && (
        <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
          {!editing && edit.source !== 'builtin' && (
            <span className="mr-auto rounded-full bg-brand-navy/10 px-2.5 py-0.5 text-2xs font-semibold uppercase tracking-wide text-brand-navy dark:bg-neutral-700 dark:text-neutral-200">
              {edit.source === 'workspace' ? 'Team default' : 'Personalized'}
            </span>
          )}
          {!editing ? (
            <button type="button" onClick={edit.start}
              className={`${tbtn} border-neutral-200 bg-white text-neutral-700 hover:border-brand-navy hover:text-brand-navy dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300`}>
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />Customize
            </button>
          ) : (
            <>
              <AddWidgetMenu addable={addable} onAdd={edit.add} onNew={() => setPickerOpen(true)} />
              <button type="button" onClick={edit.reset}
                className={`${tbtn} border-neutral-200 bg-white text-neutral-600 hover:border-semantic-danger hover:text-semantic-danger dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400`}>
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />Reset to default
              </button>
              <button type="button" onClick={edit.cancel}
                className={`${tbtn} border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400`}>
                Cancel
              </button>
              {edit.canTemplate && (
                <button type="button" onClick={edit.saveTemplate}
                  title="Apply this layout to everyone in the workspace who hasn't personalized their own"
                  className={`${tbtn} border-brand-navy bg-white text-brand-navy hover:bg-brand-navy/10 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200`}>
                  <Users className="h-3.5 w-3.5" aria-hidden="true" />Set as team default
                </button>
              )}
              <button type="button" onClick={edit.save}
                className={`${tbtn} border-brand-navy bg-brand-navy text-white hover:bg-brand-navy-tint`}>
                <Check className="h-3.5 w-3.5" aria-hidden="true" />Save for me
              </button>
            </>
          )}
        </div>
      )}
      <TodayCanvas
        layout={shown} registry={fullRegistry} ctx={fullCtx} editMode={editing}
        onMoveUp={edit?.moveUp} onMoveDown={edit?.moveDown}
        onCycleSpan={edit?.cycleSpan} onRemove={edit?.remove} />
      {pickerOpen && tools && (
        <TodayWidgetPicker
          onClose={() => setPickerOpen(false)} onAdd={edit.add}
          metrics={tools.metrics} onPreview={tools.previewWidgetData} />
      )}
    </>
  );
}
