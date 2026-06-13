import { useEffect, useState } from 'react';
import { BarChart2, AlertTriangle } from 'lucide-react';
import { EmptyState } from '@/components/works/atoms/empty-state';
import { TypeBadge } from '@/components/works/work-item-type';
import { StatusBadge } from '@/components/works/status-badge';
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

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

// Sprint Reports view — extracted from the App.jsx monolith (UX finding A3/H2). Behaviour-
// preserving: the parent owns velocity/sprint/report data and the report fetcher. Now also
// renders a pivot-backed insight strip via the shared multi-dimensional engine.
export default function ReportsView({
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
  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-bold text-brand-navy mb-1">{t('insights.reports.title')}</h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-5">{t('insights.reports.subtitle')}</p>

      <ReportPivotStrip workspaceId={activeWorkspaceId} />

      {/* VELOCITY CHART — multi-sprint comparison */}
      {velocityData.length > 0 && (
        <div className="bg-white border border-neutral-200 rounded-xl p-5 mb-6">
          <h3 className="font-semibold text-neutral-900 mb-1">{t('insights.reports.velocityAll')}</h3>
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
                    {/* Capacity bar */}
                    <div className="flex flex-col justify-end h-32">
                      <div className="w-5 rounded-t bg-neutral-200" style={{ height: `${capH}px` }} title={`Capacity: ${s.capacity}pt`}></div>
                    </div>
                    {/* Committed bar */}
                    <div className="flex flex-col justify-end h-32">
                      <div className="w-5 rounded-t bg-brand-navy-tint" style={{ height: `${totalH}px` }} title={`Committed: ${s.totalPoints}pt`}></div>
                    </div>
                    {/* Delivered bar */}
                    <div className="flex flex-col justify-end h-32">
                      <div className="w-5 rounded-t bg-semantic-success" style={{ height: `${doneH}px` }} title={`Delivered: ${s.donePoints}pt`}></div>
                    </div>
                  </div>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 text-center leading-tight max-w-20 truncate">{s.sprintName.replace('Sprint ', 'S').replace(' — ', ' ')}</p>
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${s.status === 'ACTIVE' ? 'bg-semantic-success/10 text-semantic-success' : s.status === 'COMPLETED' ? 'bg-neutral-100 text-neutral-600' : 'bg-neutral-50 text-neutral-600 dark:text-neutral-400'}`}>{s.status}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-neutral-600 dark:text-neutral-400">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-neutral-200 inline-block"></span>{t('insights.reports.capacity')}</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-brand-navy-tint inline-block"></span>{t('insights.reports.committed')}</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-semantic-success inline-block"></span>{t('insights.reports.delivered')}</span>
          </div>
        </div>
      )}

      {sprints.length === 0
        ? <EmptyState icon={BarChart2} title={t('insights.reports.emptyTitle')} subtitle={t('insights.reports.emptySubtitle')} />
        : <>
            <div className="flex gap-2 mb-5 flex-wrap">
              {sprints.map(s => (
                <button key={s.id} onClick={() => { setSelectedSprintId(s.id); fetchSprintReport(s.id); }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedSprintId === s.id ? 'bg-brand-navy text-white' : 'bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:border-brand-navy'}`}>
                  {s.name}
                </button>
              ))}
            </div>
            {sprintReport ? (
              <div className="space-y-4">
                {/* KPI cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: t('insights.reports.totalItems'), value: sprintReport.totalItems, color: 'text-neutral-900' },
                    { label: t('insights.reports.completed'), value: sprintReport.doneItems, color: 'text-semantic-success' },
                    { label: t('insights.reports.completion'), value: `${sprintReport.completionRate}%`, color: 'text-brand-navy' },
                    { label: t('insights.reports.velocity'), value: `${sprintReport.donePoints}/${sprintReport.totalPoints}pt`, color: 'text-brand-orange' },
                  ].map(card => (
                    <div key={card.label} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-1">{card.label}</p>
                      <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                    </div>
                  ))}
                </div>

                {/* Burndown chart (visual) */}
                <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
                  <h3 className="font-semibold text-neutral-900 mb-4">{t('insights.reports.burndownTitle')}</h3>
                  <div className="flex gap-3 mb-3 text-xs text-neutral-600 dark:text-neutral-400">
                    <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded bg-semantic-success inline-block"></span>Done ({sprintReport.doneItems})</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded bg-brand-navy-tint inline-block"></span>In Progress ({sprintReport.inProgressItems})</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded bg-neutral-200 inline-block"></span>Todo ({sprintReport.todoItems})</span>
                  </div>
                  {/* Stacked bar burndown */}
                  <div className="h-8 bg-neutral-100 dark:bg-neutral-700 rounded-lg overflow-hidden flex mb-2">
                    {sprintReport.totalItems > 0 && <>
                      <div className="h-full bg-semantic-success transition-all flex items-center justify-center" style={{ width: `${(sprintReport.doneItems / sprintReport.totalItems) * 100}%` }}>
                        {sprintReport.doneItems > 0 && <span className="text-white text-xs font-bold">{sprintReport.doneItems}</span>}
                      </div>
                      <div className="h-full bg-brand-navy-tint transition-all flex items-center justify-center" style={{ width: `${(sprintReport.inProgressItems / sprintReport.totalItems) * 100}%` }}>
                        {sprintReport.inProgressItems > 0 && <span className="text-white text-xs font-bold">{sprintReport.inProgressItems}</span>}
                      </div>
                      <div className="h-full bg-neutral-200 transition-all flex items-center justify-center" style={{ width: `${(sprintReport.todoItems / sprintReport.totalItems) * 100}%` }}>
                        {sprintReport.todoItems > 0 && <span className="text-neutral-600 text-xs font-bold">{sprintReport.todoItems}</span>}
                      </div>
                    </>}
                  </div>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400">{sprintReport.completionRate}% complete · {sprintReport.velocityRate}% of story points delivered</p>
                </div>

                {/* Commitment vs Delivery — story points comparison */}
                {sprintReport.totalPoints > 0 && (
                  <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
                    <h3 className="font-semibold text-neutral-900 mb-1">{t('insights.reports.commitmentVsDelivery')}</h3>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-4">{t('insights.reports.commitmentHint')}</p>
                    <div className="space-y-3">
                      {[
                        { label: t('insights.reports.capacity'), value: sprintReport.sprint?.capacity || 0, max: Math.max(sprintReport.sprint?.capacity || 0, sprintReport.totalPoints), color: 'bg-neutral-200' },
                        { label: t('insights.reports.committed'), value: sprintReport.totalPoints, max: Math.max(sprintReport.sprint?.capacity || 0, sprintReport.totalPoints), color: 'bg-brand-navy-tint' },
                        { label: t('insights.reports.delivered'), value: sprintReport.donePoints, max: Math.max(sprintReport.sprint?.capacity || 0, sprintReport.totalPoints), color: 'bg-semantic-success' },
                      ].map(row => (
                        <div key={row.label} className="flex items-center gap-3">
                          <span className="text-xs text-neutral-600 w-20 flex-shrink-0">{row.label}</span>
                          <div className="flex-1 h-5 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${row.color} transition-all flex items-center justify-end pr-2`}
                              style={{ width: `${row.max > 0 ? Math.round((row.value / row.max) * 100) : 0}%` }}>
                              {row.value > 0 && <span className="text-xs text-white font-bold">{row.value}pt</span>}
                            </div>
                          </div>
                          <span className="text-xs font-semibold text-neutral-700 w-12 text-right">{row.max > 0 ? Math.round((row.value / row.max) * 100) : 0}%</span>
                        </div>
                      ))}
                    </div>
                    {sprintReport.totalPoints > (sprintReport.sprint?.capacity || Infinity) && (
                      <p className="text-xs text-semantic-warning mt-3"><AlertTriangle className="inline-block h-3.5 w-3.5 mr-1 align-text-bottom" aria-hidden="true" />Over-committed: {sprintReport.totalPoints}pt committed exceeds {sprintReport.sprint?.capacity}pt capacity</p>
                    )}
                  </div>
                )}

                {/* Item outcomes */}
                <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-neutral-100 dark:border-neutral-700">
                    <h3 className="font-semibold text-neutral-900">{t('insights.reports.itemOutcomes')}</h3>
                  </div>
                  <div className="divide-y divide-neutral-50 dark:divide-neutral-700">
                    {(sprintReport.items || []).map(item => (
                      <div key={item.id} className="flex items-center gap-3 px-5 py-3">
                        <TypeBadge type={item.type} compact />
                        <span className="font-mono text-xs text-neutral-600 dark:text-neutral-400 w-20">{item.id}</span>
                        <span className="flex-1 text-sm text-neutral-900">{item.title}</span>
                        {item.story_points > 0 && <span className="text-xs text-neutral-600 dark:text-neutral-400">{item.story_points}pt</span>}
                        <StatusBadge category={statusToCategory(item.status)}>{item.status}</StatusBadge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Scope-change timeline */}
                <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-neutral-100 dark:border-neutral-700 flex items-center justify-between">
                    <h3 className="font-semibold text-neutral-900">{t('insights.reports.scopeChangeTimeline')}</h3>
                    <span className="text-xs text-neutral-600 dark:text-neutral-400">{t('insights.reports.scopeChangeHint')}</span>
                  </div>
                  {scopeChanges.length === 0 ? (
                    <p className="text-xs text-neutral-600 text-center py-6">{t('insights.reports.noScopeChanges')}</p>
                  ) : (
                    <div className="divide-y divide-neutral-50 dark:divide-neutral-700">
                      {scopeChanges.map((c, i) => (
                        <div key={i} className="flex items-center gap-3 px-5 py-3">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.change_type === 'ADDED' ? 'bg-semantic-success-surface text-semantic-success' : 'bg-semantic-danger-surface text-semantic-danger'}`}>
                            {c.change_type === 'ADDED' ? '+ Added' : '− Removed'}
                          </span>
                          {c.type && <TypeBadge type={c.type} compact />}
                          <span className="flex-1 text-sm text-neutral-900">{c.title || c.work_item_id}</span>
                          <span className="text-xs text-neutral-600 dark:text-neutral-400">{c.actor_name || 'System'}</span>
                          <span className="text-xs text-neutral-300">{c.occurred_at ? absoluteDate(c.occurred_at) : ''}</span>
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
    </div>
  );
}
