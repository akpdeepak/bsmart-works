import { useEffect, useState, useRef, useMemo } from 'react';
import { BarChart2, AlertTriangle, ChevronDown, Search, Target, CalendarDays, ShieldAlert } from 'lucide-react';
import { EmptyState } from '@/components/works/atoms/empty-state';
import { ListSkeleton } from '@/components/works/atoms/skeleton';
import { TypeBadge } from '@/components/works/work-item-type';
import { StatusBadge } from '@/components/works/status-badge';
import { PriorityBadge } from '@/components/works/priority-badge';
import { statusToCategory } from '@/components/works/status';
import { PivotChart } from '@/components/works/organisms/pivot-chart';
import { resolvePivotBatch } from '@/lib/pivot';
import { useI18n } from '@/lib/i18n';
import { absoluteDate } from '@/lib/format';

// The pivot-backed insight tiles rendered at the top of Reports — same shared <PivotChart/> +
// pivot client as Dashboards and the Report Builder, so all three surfaces render the engine
// identically. Specs are grouped guided counts (workspace-scoped server-side, RB-40 §1).
const REPORT_PIVOTS = {
  byStatus: { spec: { source: { kind: 'guided', guided: {}, mode: 'group' }, measures: [{ field: '*', agg: 'COUNT' }], dimensions: ['status'], filters: null }, chartType: 'bar', titleKey: 'insights.reports.itemsByStatus' },
  byType: { spec: { source: { kind: 'guided', guided: {}, mode: 'group' }, measures: [{ field: '*', agg: 'COUNT' }], dimensions: ['type'], filters: null }, chartType: 'donut', titleKey: 'insights.reports.itemsByType' },
};

function ReportPivotStrip({ workspaceId }) {
  const { t } = useI18n();
  const [state, setState] = useState({ loading: true, error: null, byId: {} });
  useEffect(() => {
    let alive = true;
    if (!workspaceId) {
      setState({ loading: false, error: null, byId: {} });
      return undefined;
    }
    setState((s) => ({ ...s, loading: true, error: null }));
    const items = Object.fromEntries(Object.entries(REPORT_PIVOTS).map(([id, v]) => [id, v.spec]));
    resolvePivotBatch(workspaceId, items)
      .then((rows) => {
        if (!alive) return;
        const byId = {};
        (rows || []).forEach((r) => { byId[r.id] = r; });
        setState({ loading: false, error: null, byId });
      })
      .catch((e) => { if (alive) setState({ loading: false, error: e.message || t('insights.reports.couldNotLoad'), byId: {} }); });
    return () => { alive = false; };
  }, [workspaceId]); // resolvePivotBatch, setState, t excluded: stable module-level refs.

  if (!workspaceId) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
      {Object.entries(REPORT_PIVOTS).map(([id, cfg]) => {
        const entry = state.byId[id];
        return (
          <div key={id} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-3">{t(cfg.titleKey)}</h3>
            <PivotChart type={cfg.chartType} result={entry?.data}
              loading={state.loading} error={state.error || entry?.error} />
          </div>
        );
      })}
    </div>
  );
}

// Searchable sprint picker — replaces the row of chips so a workspace with many sprints stays
// usable (type to filter by name/status). Accessible combobox: button → listbox popover.
function SprintPicker({ sprints, selectedSprintId, onSelect }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef(null);
  const inputRef = useRef(null);
  const selected = sprints.find((s) => s.id === selectedSprintId);

  useEffect(() => {
    if (!open) return undefined;
    inputRef.current?.focus();
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const filtered = sprints.filter((s) =>
    !q.trim() || `${s.name} ${s.status}`.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div className="relative max-w-md mb-5" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-900 dark:text-neutral-100 hover:border-brand-navy transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-navy-tint/40">
        <span className="flex items-center gap-2 min-w-0">
          {selected ? (
            <>
              <span className="truncate font-medium">{selected.name}</span>
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${selected.status === 'ACTIVE' ? 'bg-semantic-success/10 text-semantic-success' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'}`}>{selected.status}</span>
            </>
          ) : <span className="text-neutral-600 dark:text-neutral-400">{t('insights.reports.pickSprint')}</span>}
        </span>
        <ChevronDown className="h-4 w-4 text-neutral-600 dark:text-neutral-400 flex-shrink-0" aria-hidden="true" />
      </button>
      {open && (
        <div className="absolute z-dropdown mt-1 w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-lg overflow-hidden">
          <div className="p-2 border-b border-neutral-100 dark:border-neutral-700 flex items-center gap-2">
            <Search className="h-4 w-4 text-neutral-400 flex-shrink-0" aria-hidden="true" />
            <input ref={inputRef} type="text" value={q} onChange={(e) => setQ(e.target.value)}
              aria-label={t('insights.reports.searchSprints')} placeholder={t('insights.reports.searchSprints')}
              className="flex-1 bg-transparent text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none" />
          </div>
          <ul role="listbox" className="max-h-72 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-neutral-600 dark:text-neutral-400">{t('insights.reports.noSprintMatch')}</li>
            ) : filtered.map((s) => (
              <li key={s.id}>
                <button type="button" role="option" aria-selected={s.id === selectedSprintId}
                  onClick={() => { onSelect(s.id); setOpen(false); setQ(''); }}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-700/50 ${s.id === selectedSprintId ? 'bg-brand-navy/5 dark:bg-brand-navy-tint/10' : ''}`}>
                  <span className="min-w-0">
                    <span className="block truncate text-neutral-900 dark:text-neutral-100 font-medium">{s.name}</span>
                    {(s.startDate || s.endDate) && (
                      <span className="block text-xs text-neutral-500 dark:text-neutral-400">{s.startDate || '—'} → {s.endDate || '—'}</span>
                    )}
                  </span>
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${s.status === 'ACTIVE' ? 'bg-semantic-success/10 text-semantic-success' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'}`}>{s.status}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// A compact horizontal "label · count" breakdown with a proportional bar + a done overlay.
function BreakdownList({ title, rows, max }) {
  return (
    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
      <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-3 text-sm">{title}</h3>
      {rows.length === 0 ? <p className="text-xs text-neutral-500 dark:text-neutral-400">—</p> : (
        <div className="space-y-2.5">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center gap-3">
              <span className="text-xs text-neutral-700 dark:text-neutral-300 w-24 flex-shrink-0 truncate" title={r.label}>{r.label}</span>
              <div className="flex-1 h-4 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden relative">
                <div className="h-full bg-brand-navy-tint/40 rounded-full" style={{ width: `${max > 0 ? (r.total / max) * 100 : 0}%` }} />
                <div className="h-full bg-semantic-success rounded-full absolute inset-y-0 left-0" style={{ width: `${max > 0 ? (r.done / max) * 100 : 0}%` }} />
              </div>
              <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 w-14 text-right flex-shrink-0">{r.done}/{r.total}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Circular progress gauge — an at-a-glance infographic for a single percentage (completion,
// points delivered, time elapsed). Pure SVG; coloured via currentColor + a text-token class so it
// stays token-only (RB-30 §2) and dark-mode aware; accessible via role=img + aria-label.
function RingGauge({ value, label, sublabel, tone = 'navy' }) {
  const pct = Math.max(0, Math.min(100, Math.round(value || 0)));
  const r = 30;
  const circ = 2 * Math.PI * r;
  const toneText = {
    navy: 'text-brand-navy-tint', success: 'text-semantic-success',
    orange: 'text-brand-orange', warning: 'text-semantic-warning', danger: 'text-semantic-danger',
  }[tone] || 'text-brand-navy-tint';
  return (
    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 flex flex-col items-center text-center"
      role="img" aria-label={`${label}: ${pct}%`}>
      <svg viewBox="0 0 72 72" className="h-20 w-20" aria-hidden="true">
        <circle cx="36" cy="36" r={r} fill="none" strokeWidth="8" stroke="currentColor" className="text-neutral-100 dark:text-neutral-700" />
        <circle cx="36" cy="36" r={r} fill="none" strokeWidth="8" strokeLinecap="round" stroke="currentColor" className={toneText}
          strokeDasharray={circ} strokeDashoffset={circ - (pct / 100) * circ} transform="rotate(-90 36 36)" />
        <text x="36" y="41" textAnchor="middle" fontSize="17" fontWeight="700" fill="currentColor" className="text-neutral-900 dark:text-neutral-100">{pct}%</text>
      </svg>
      <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 mt-1">{label}</p>
      {sublabel && <p className="text-xs text-neutral-500 dark:text-neutral-400">{sublabel}</p>}
    </div>
  );
}

const isDone = (it) => statusToCategory(it.status) === 'done';
const isBlocked = (it) => statusToCategory(it.status) === 'blocked';
const pts = (it) => (it.story_points ? Number(it.story_points) : 0);

// Group items into [{ label, total, done, points }] sorted by total desc.
function groupBy(items, keyFn) {
  const m = new Map();
  items.forEach((it) => {
    const k = keyFn(it) || '—';
    const g = m.get(k) || { label: k, total: 0, done: 0, points: 0 };
    g.total += 1; g.points += pts(it); if (isDone(it)) g.done += 1;
    m.set(k, g);
  });
  return [...m.values()].sort((a, b) => b.total - a.total);
}

// Days elapsed/total + pace verdict comparing time-progress to completion (the "are we on track?"
// signal a flat status bar can't give). Pure; tolerant of missing dates.
function pace(startDate, endDate, completionRate, t) {
  if (!startDate || !endDate) return null;
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  const now = new Date();
  const day = 86400000;
  const total = Math.max(1, Math.round((end - start) / day) + 1);
  if (now < start) return { total, elapsed: 0, remaining: total, label: t('insights.reports.notStarted'), tone: 'neutral', timePct: 0 };
  const elapsed = Math.min(total, Math.round((now - start) / day) + 1);
  const remaining = Math.max(0, total - elapsed);
  const timePct = Math.round((elapsed / total) * 100);
  const ended = now > end;
  let label; let tone;
  if (completionRate >= timePct + 5) { label = t('insights.reports.aheadPace'); tone = 'success'; }
  else if (completionRate >= timePct - 10) { label = t('insights.reports.onPace'); tone = 'neutral'; }
  else { label = t('insights.reports.behindPace'); tone = 'danger'; }
  return { total, elapsed, remaining, timePct, label, tone, ended };
}

// Sprint Reports view. The parent owns velocity/sprint/report data and the report fetcher. Renders
// a pivot-backed insight strip + a comprehensive single-sprint report (searchable picker, pace,
// breakdowns, at-risk) so a reader gets the full picture of a sprint (RB-20 §4).
export default function ReportsView({
  loading = false,
  velocityData,
  sprints,
  selectedSprintId,
  sprintReport,
  scopeChanges,
  activeWorkspaceId,
  setSelectedSprintId,
  fetchSprintReport,
}) {
  const { t } = useI18n();
  const items = useMemo(() => sprintReport?.items || [], [sprintReport]);
  const byType = useMemo(() => groupBy(items, (i) => i.type), [items]);
  const byAssignee = useMemo(() => groupBy(items, (i) => i.assignee_name || t('insights.reports.unassigned')), [items, t]);
  const byPriority = useMemo(() => groupBy(items, (i) => i.priority), [items]);
  const carryover = useMemo(() => items.filter((i) => !isDone(i)), [items]);
  const carryoverPts = carryover.reduce((s, i) => s + pts(i), 0);
  const blocked = useMemo(() => items.filter(isBlocked), [items]);
  const atRisk = useMemo(() => items.filter((i) => !isDone(i) && (isBlocked(i) || !i.assignee_id)), [items]);
  const netScope = (scopeChanges || []).reduce((s, c) => s + (c.change_type === 'ADDED' ? 1 : -1), 0);
  const p = sprintReport ? pace(sprintReport.sprint?.startDate, sprintReport.sprint?.endDate, sprintReport.completionRate, t) : null;
  const toneCls = { success: 'text-semantic-success', danger: 'text-semantic-danger', neutral: 'text-brand-navy dark:text-brand-navy-tint' };

  // Default the report to the ACTIVE sprint (else the most recent) on first load, so the surface
  // opens on a meaningful report instead of an empty "pick a sprint" prompt. Guarded on no current
  // selection, so it never overrides a sprint the user has chosen. Deferred a tick to keep the
  // parent state update / fetch out of the effect's synchronous body.
  useEffect(() => {
    if (selectedSprintId || sprints.length === 0) return undefined;
    const active = sprints.find((s) => s.status === 'ACTIVE') || sprints[0];
    if (!active) return undefined;
    const tid = setTimeout(() => { setSelectedSprintId(active.id); fetchSprintReport(active.id); }, 0);
    return () => clearTimeout(tid);
  }, [sprints, selectedSprintId]); // fetchSprintReport, setSelectedSprintId excluded: stable refs.

  if (loading && sprints.length === 0) {
    return (
      <div className="p-8 max-w-5xl">
        <ListSkeleton rows={4} />
      </div>
    );
  }
  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-bold text-brand-navy dark:text-white mb-1">{t('insights.reports.title')}</h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-5">{t('insights.reports.subtitle')}</p>

      {sprints.length === 0
        ? <EmptyState icon={BarChart2} title={t('insights.reports.emptyTitle')} subtitle={t('insights.reports.emptySubtitle')} />
        : <>
            <SprintPicker sprints={sprints} selectedSprintId={selectedSprintId}
              onSelect={(id) => { setSelectedSprintId(id); fetchSprintReport(id); }} />

            {sprintReport ? (
              <div className="space-y-4">
                {/* Sprint header — goal, timeline, pace verdict */}
                <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
                  <div className="flex items-start gap-2 mb-3">
                    <Target className="h-4 w-4 text-brand-navy dark:text-brand-navy-tint mt-0.5 flex-shrink-0" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400 font-semibold">{t('insights.reports.sprintGoal')}</p>
                      <p className="text-sm text-neutral-900 dark:text-neutral-100">{sprintReport.sprint?.goal || t('insights.reports.noGoal')}</p>
                    </div>
                  </div>
                  {p && (
                    <div className="pt-3 border-t border-neutral-100 dark:border-neutral-700">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <span className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
                          <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                          {sprintReport.sprint?.startDate} → {sprintReport.sprint?.endDate}
                          <span className="text-neutral-400">·</span>
                          {p.ended ? t('insights.reports.sprintEnded')
                            : `${t('insights.reports.day')} ${p.elapsed} ${t('insights.reports.of')} ${p.total} · ${p.remaining} ${t('insights.reports.daysLeft')}`}
                        </span>
                        <span className={`text-xs font-bold ${toneCls[p.tone]}`}>{p.label}</span>
                      </div>
                      {/* time vs completion: two thin bars so "behind/ahead" is visible at a glance */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-neutral-500 dark:text-neutral-400 w-16 flex-shrink-0">{t('insights.reports.timeline')}</span>
                          <div className="flex-1 h-2 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden"><div className="h-full bg-neutral-400 dark:bg-neutral-500 rounded-full" style={{ width: `${p.timePct}%` }} /></div>
                          <span className="text-xs text-neutral-500 dark:text-neutral-400 w-9 text-right">{p.timePct}%</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-neutral-500 dark:text-neutral-400 w-16 flex-shrink-0">{t('insights.reports.completion')}</span>
                          <div className="flex-1 h-2 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden"><div className="h-full bg-semantic-success rounded-full" style={{ width: `${sprintReport.completionRate}%` }} /></div>
                          <span className="text-xs text-neutral-500 dark:text-neutral-400 w-9 text-right">{sprintReport.completionRate}%</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* At a glance — visual ring gauges for the headline progress signals */}
                <div>
                  <h3 className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400 font-semibold mb-2">{t('insights.reports.atAGlance')}</h3>
                  <div className={`grid grid-cols-2 ${p ? 'md:grid-cols-3' : ''} gap-3`}>
                    <RingGauge value={sprintReport.completionRate} tone="success"
                      label={t('insights.reports.completion')} sublabel={`${sprintReport.doneItems}/${sprintReport.totalItems}`} />
                    <RingGauge value={sprintReport.velocityRate} tone="orange"
                      label={t('insights.reports.pointsDelivered')} sublabel={`${sprintReport.donePoints}/${sprintReport.totalPoints} ${t('insights.reports.points')}`} />
                    {p && (
                      <RingGauge value={p.timePct} tone={p.tone === 'danger' ? 'danger' : 'navy'}
                        label={t('insights.reports.timeElapsed')}
                        sublabel={p.ended ? t('insights.reports.sprintEnded') : `${p.remaining} ${t('insights.reports.daysLeft')}`} />
                    )}
                  </div>
                </div>

                {/* KPI cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[
                    { label: t('insights.reports.totalItems'), value: sprintReport.totalItems, color: 'text-neutral-900 dark:text-neutral-100' },
                    { label: t('insights.reports.completed'), value: sprintReport.doneItems, color: 'text-semantic-success' },
                    { label: t('insights.reports.completion'), value: `${sprintReport.completionRate}%`, color: 'text-brand-navy dark:text-brand-navy-tint' },
                    { label: t('insights.reports.velocity'), value: `${sprintReport.donePoints}/${sprintReport.totalPoints}`, color: 'text-brand-orange' },
                    { label: t('insights.reports.carryover'), value: `${carryover.length}`, sub: `${carryoverPts} ${t('insights.reports.points')}`, color: carryover.length ? 'text-semantic-warning' : 'text-neutral-900 dark:text-neutral-100' },
                    { label: t('insights.reports.blocked'), value: `${blocked.length}`, color: blocked.length ? 'text-semantic-danger' : 'text-neutral-900 dark:text-neutral-100' },
                  ].map(card => (
                    <div key={card.label} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-1 truncate" title={card.label}>{card.label}</p>
                      <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
                      {card.sub && <p className="text-xs text-neutral-500 dark:text-neutral-400">{card.sub}</p>}
                    </div>
                  ))}
                </div>

                {/* Burndown / status mix */}
                <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
                  <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-4">{t('insights.reports.burndownTitle')}</h3>
                  <div className="flex gap-3 mb-3 text-xs text-neutral-600 dark:text-neutral-400 flex-wrap">
                    <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded bg-semantic-success inline-block"></span>Done ({sprintReport.doneItems})</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded bg-brand-navy-tint inline-block"></span>In Progress ({sprintReport.inProgressItems})</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded bg-neutral-200 dark:bg-neutral-600 inline-block"></span>Todo ({sprintReport.todoItems})</span>
                  </div>
                  <div className="h-8 bg-neutral-100 dark:bg-neutral-700 rounded-lg overflow-hidden flex mb-2">
                    {sprintReport.totalItems > 0 && <>
                      <div className="h-full bg-semantic-success transition-all flex items-center justify-center" style={{ width: `${(sprintReport.doneItems / sprintReport.totalItems) * 100}%` }}>{sprintReport.doneItems > 0 && <span className="text-white text-xs font-bold">{sprintReport.doneItems}</span>}</div>
                      <div className="h-full bg-brand-navy-tint transition-all flex items-center justify-center" style={{ width: `${(sprintReport.inProgressItems / sprintReport.totalItems) * 100}%` }}>{sprintReport.inProgressItems > 0 && <span className="text-white text-xs font-bold">{sprintReport.inProgressItems}</span>}</div>
                      <div className="h-full bg-neutral-200 dark:bg-neutral-600 transition-all flex items-center justify-center" style={{ width: `${(sprintReport.todoItems / sprintReport.totalItems) * 100}%` }}>{sprintReport.todoItems > 0 && <span className="text-neutral-600 dark:text-neutral-200 text-xs font-bold">{sprintReport.todoItems}</span>}</div>
                    </>}
                  </div>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400">{sprintReport.completionRate}% complete · {t('insights.reports.predictability')}: {sprintReport.velocityRate}% {t('insights.reports.delivered').toLowerCase()}</p>
                </div>

                {/* Breakdowns — by type, assignee, priority */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <BreakdownList title={t('insights.reports.byType')} rows={byType} max={Math.max(1, ...byType.map(r => r.total))} />
                  <BreakdownList title={t('insights.reports.byAssignee')} rows={byAssignee} max={Math.max(1, ...byAssignee.map(r => r.total))} />
                  <BreakdownList title={t('insights.reports.byPriority')} rows={byPriority} max={Math.max(1, ...byPriority.map(r => r.total))} />
                </div>

                {/* Commitment vs Delivery — story points */}
                {sprintReport.totalPoints > 0 && (
                  <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
                    <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-1">{t('insights.reports.commitmentVsDelivery')}</h3>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-4">{t('insights.reports.commitmentHint')}</p>
                    <div className="space-y-3">
                      {[
                        { label: t('insights.reports.capacity'), value: sprintReport.sprint?.capacity || 0, color: 'bg-neutral-200 dark:bg-neutral-600' },
                        { label: t('insights.reports.committed'), value: sprintReport.totalPoints, color: 'bg-brand-navy-tint' },
                        { label: t('insights.reports.delivered'), value: sprintReport.donePoints, color: 'bg-semantic-success' },
                      ].map(row => {
                        const max = Math.max(sprintReport.sprint?.capacity || 0, sprintReport.totalPoints);
                        return (
                          <div key={row.label} className="flex items-center gap-3">
                            <span className="text-xs text-neutral-600 dark:text-neutral-400 w-20 flex-shrink-0">{row.label}</span>
                            <div className="flex-1 h-5 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${row.color} transition-all flex items-center justify-end pr-2`} style={{ width: `${max > 0 ? Math.round((row.value / max) * 100) : 0}%` }}>{row.value > 0 && <span className="text-xs text-white font-bold">{row.value}pt</span>}</div>
                            </div>
                            <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 w-12 text-right">{max > 0 ? Math.round((row.value / max) * 100) : 0}%</span>
                          </div>
                        );
                      })}
                    </div>
                    {sprintReport.totalPoints > (sprintReport.sprint?.capacity || Infinity) && (
                      <p className="text-xs text-semantic-warning mt-3"><AlertTriangle className="inline-block h-3.5 w-3.5 mr-1 align-text-bottom" aria-hidden="true" />Over-committed: {sprintReport.totalPoints}pt committed exceeds {sprintReport.sprint?.capacity}pt capacity</p>
                    )}
                  </div>
                )}

                {/* Needs attention — blocked or unassigned-open work */}
                <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-neutral-100 dark:border-neutral-700 flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-semantic-warning" aria-hidden="true" />
                    <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">{t('insights.reports.atRisk')}</h3>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">· {t('insights.reports.atRiskHint')}</span>
                  </div>
                  {atRisk.length === 0 ? (
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 text-center py-6">{t('insights.reports.noAtRisk')}</p>
                  ) : (
                    <div className="divide-y divide-neutral-50 dark:divide-neutral-700">
                      {atRisk.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 px-5 py-2.5">
                          <TypeBadge type={item.type} compact />
                          <span className="font-mono text-xs text-neutral-600 dark:text-neutral-400 w-20">{item.id}</span>
                          <span className="flex-1 text-sm text-neutral-900 dark:text-neutral-100 truncate">{item.title}</span>
                          {item.priority && <PriorityBadge priority={item.priority} />}
                          <span className="text-xs text-neutral-500 dark:text-neutral-400 w-24 text-right truncate">{item.assignee_name || t('insights.reports.unassigned')}</span>
                          <StatusBadge category={statusToCategory(item.status)}>{item.status}</StatusBadge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Item outcomes — full list */}
                <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-neutral-100 dark:border-neutral-700">
                    <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">{t('insights.reports.itemOutcomes')}</h3>
                  </div>
                  <div className="divide-y divide-neutral-50 dark:divide-neutral-700">
                    {items.map(item => (
                      <div key={item.id} className="flex items-center gap-3 px-5 py-2.5">
                        <TypeBadge type={item.type} compact />
                        <span className="font-mono text-xs text-neutral-600 dark:text-neutral-400 w-20">{item.id}</span>
                        <span className="flex-1 text-sm text-neutral-900 dark:text-neutral-100 truncate">{item.title}</span>
                        {item.priority && <PriorityBadge priority={item.priority} />}
                        <span className="text-xs text-neutral-500 dark:text-neutral-400 w-24 text-right truncate hidden sm:inline">{item.assignee_name || t('insights.reports.unassigned')}</span>
                        {item.story_points > 0 && <span className="text-xs text-neutral-600 dark:text-neutral-400 w-8 text-right">{item.story_points}pt</span>}
                        <StatusBadge category={statusToCategory(item.status)}>{item.status}</StatusBadge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Scope-change timeline */}
                <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-neutral-100 dark:border-neutral-700 flex items-center justify-between">
                    <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">{t('insights.reports.scopeChangeTimeline')}</h3>
                    <span className="text-xs text-neutral-600 dark:text-neutral-400">{t('insights.reports.scopeChangeHint')} · {t('insights.reports.scopeNet')} {netScope >= 0 ? '+' : ''}{netScope}</span>
                  </div>
                  {scopeChanges.length === 0 ? (
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 text-center py-6">{t('insights.reports.noScopeChanges')}</p>
                  ) : (
                    <div className="divide-y divide-neutral-50 dark:divide-neutral-700">
                      {scopeChanges.map((c, i) => (
                        <div key={i} className="flex items-center gap-3 px-5 py-2.5">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.change_type === 'ADDED' ? 'bg-semantic-success-surface text-semantic-success' : 'bg-semantic-danger-surface text-semantic-danger'}`}>{c.change_type === 'ADDED' ? '+ Added' : '− Removed'}</span>
                          {c.type && <TypeBadge type={c.type} compact />}
                          <span className="flex-1 text-sm text-neutral-900 dark:text-neutral-100 truncate">{c.title || c.work_item_id}</span>
                          <span className="text-xs text-neutral-600 dark:text-neutral-400">{c.actor_name || 'System'}</span>
                          <span className="text-xs text-neutral-400 dark:text-neutral-500">{c.occurred_at ? absoluteDate(c.occurred_at) : ''}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-neutral-600 dark:text-neutral-400 text-center py-10">{t('insights.reports.selectSprint')}</p>
            )}
          </>
      }

      {/* Workspace context — across all sprints, shown below the selected-sprint report. */}
      <div className="mt-8 pt-6 border-t border-neutral-200 dark:border-neutral-700">
        <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-4">{t('insights.reports.acrossSprints')}</h2>
        {velocityData.length > 0 && (
          <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5 mb-6">
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-1">{t('insights.reports.velocityAll')}</h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-4">{t('insights.reports.velocityHint')}</p>
            <div className="flex items-end gap-3 overflow-x-auto pb-2">
              {velocityData.map((s) => {
                const maxVal = Math.max(...velocityData.map(x => Math.max(x.capacity || 0, x.totalPoints, 1)));
                const capH = Math.round(((s.capacity || 0) / maxVal) * 120);
                const doneH = Math.round((s.donePoints / maxVal) * 120);
                const totalH = Math.round((s.totalPoints / maxVal) * 120);
                return (
                  <div key={s.sprintId} className="flex flex-col items-center gap-1 min-w-20">
                    <div className="flex items-end gap-1 h-32">
                      <div className="flex flex-col justify-end h-32"><div className="w-5 rounded-t bg-neutral-200 dark:bg-neutral-600" style={{ height: `${capH}px` }} title={`Capacity: ${s.capacity}pt`}></div></div>
                      <div className="flex flex-col justify-end h-32"><div className="w-5 rounded-t bg-brand-navy-tint" style={{ height: `${totalH}px` }} title={`Committed: ${s.totalPoints}pt`}></div></div>
                      <div className="flex flex-col justify-end h-32"><div className="w-5 rounded-t bg-semantic-success" style={{ height: `${doneH}px` }} title={`Delivered: ${s.donePoints}pt`}></div></div>
                    </div>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 text-center leading-tight max-w-20 truncate">{s.sprintName.replace('Sprint ', 'S').replace(' — ', ' ')}</p>
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${s.status === 'ACTIVE' ? 'bg-semantic-success/10 text-semantic-success' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400'}`}>{s.status}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-neutral-600 dark:text-neutral-400">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-neutral-200 dark:bg-neutral-600 inline-block"></span>{t('insights.reports.capacity')}</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-brand-navy-tint inline-block"></span>{t('insights.reports.committed')}</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-semantic-success inline-block"></span>{t('insights.reports.delivered')}</span>
            </div>
          </div>
        )}
        <ReportPivotStrip workspaceId={activeWorkspaceId} />
      </div>
    </div>
  );
}
