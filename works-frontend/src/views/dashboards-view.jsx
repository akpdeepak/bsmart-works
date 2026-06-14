import { useState } from 'react';
import { LayoutDashboard, ArrowLeft, Puzzle } from 'lucide-react';
import { Button } from '@/components/works/button';
import { EmptyState } from '@/components/works/atoms/empty-state';
import { ExportButtons } from '@/components/works/export-buttons';
import { Modal } from '@/components/works/molecules/modal';
import { DashboardWidgetCard } from '@/components/works/organisms/dashboard-widget-card';
import { DashboardDrillModal } from '@/components/works/organisms/dashboard-drill-modal';
import { ConversationalDashboardPanel } from '@/components/works/organisms/conversational-dashboard-panel';
import { DashboardSuggestionPanel } from '@/components/works/organisms/dashboard-suggestion-panel';
import { WidgetBuilder } from '@/components/works/organisms/widget-builder';
import { capabilityEnabled } from '@/lib/ai';
import { DashboardAiSummary } from '@/components/works/organisms/dashboard-ai-summary';
import { useI18n } from '@/lib/i18n';
import { absoluteDate } from '@/lib/format';
import { EXTRA_WIDGET_PRESETS, EXTRA_WIDGET_CATEGORIES } from '@/lib/dashboard-metrics';

// Status breakdown of the items already on screen — the chartable series the AI summary band reads.
// Built from data the client already rendered (no re-query); empty when there is nothing to chart.
function statusSeries(items) {
  const counts = new Map();
  (items || []).forEach((i) => {
    const key = i.status || 'Unknown';
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return Array.from(counts, ([label, value]) => ({ label, value }));
}

// Opinionated starter set for a brand-new dashboard (RB-20 §3 — defaults for the 80%). Every widget
// renders real, workspace-scoped data with no configuration: at-a-glance counts, distribution, the
// active sprint, and the most-recent items. One click → a useful dashboard, not a blank canvas.
const STARTER_WIDGETS = [
  { type: 'SCORECARD', config: { filter: { open: true } }, title: 'Open items', w: 3 },
  { type: 'SCORECARD', config: { filter: { overdue: true } }, title: 'Overdue', w: 3 },
  { type: 'SCORECARD', config: { filter: { highPriority: true, open: true } }, title: 'High priority (open)', w: 3 },
  { type: 'SCORECARD', config: { filter: { blocked: true } }, title: 'Blocked', w: 3 },
  { type: 'STATUS_BAR', config: {}, title: 'Items by status', w: 6 },
  { type: 'PIE', config: { dimension: 'priority' }, title: 'Items by priority', w: 6 },
  { type: 'SPRINT_HEALTH', config: {}, title: 'Sprint health', w: 6 },
  { type: 'ITEM_LIST', config: { filter: { open: true }, limit: 6 }, title: 'Open work items', w: 6 },
];

/**
 * DashboardsView — custom dashboard builder and viewer.
 *
 * Extracted from App.jsx (TD-003). All state lives in App; this component is a
 * pure rendering shell that accepts handlers as props.
 */
export default function DashboardsView({
  customDashboards,
  selectedDashboard,
  dashboardEditMode,
  dashboardScope,
  dashboardTeamId,
  dashboardAggregate,
  dashboardDrill,
  shareInfo,
  teams,
  workItems,
  sprints,
  velocityData,
  currentUser,
  activeWorkspaceId,
  aiCapabilities = [],
  dashboardRole = 'developer',
  acceptDashboardSuggestion,
  createDashboard,
  openDashboard,
  deleteDashboard,
  addDashboardWidget,
  removeDashboardWidget,
  resizeDashboardWidget,
  updateDashboardWidgetConfig,
  reorderDashboardWidgets,
  setDashboardEditMode,
  setSelectedDashboard,
  setDashboardScope,
  setDashboardTeamId,
  setDashboardDrill,
  setDragWidgetId,
  fetchDashboardAggregate,
  mintShare,
  stopShare,
  showToast,
  onConversationalDashboardSaved,
}) {
  const { t } = useI18n();
  // Gate the NL entry on ITS capability (conversational_dashboard), not "any AI" — most-restrictive
  // wins is already resolved server-side (RB-40 §2). Hidden entirely when off; the deterministic
  // NL→spec fallback still works server-side when AI is on but over budget/unavailable.
  const convDashOn = capabilityEnabled(aiCapabilities, 'conversational_dashboard');
  // Same gating for the AI-suggested starter dashboard entry — HIDDEN when dashboard_suggestion is
  // off (RB-40 §2). When on but over budget/unavailable, the deterministic starter set still shows.
  const suggestOn = capabilityEnabled(aiCapabilities, 'dashboard_suggestion');

  // The shared <WidgetBuilder/> modal — open for a brand-new PIVOT widget (editingPivot === 'new')
  // or to edit an existing one (the widget object). Pure UI state; persistence still flows through
  // the parent's addDashboardWidget / updateDashboardWidgetConfig handlers.
  const [editingPivot, setEditingPivot] = useState(null);
  const pivotInitial = (() => {
    if (!editingPivot || editingPivot === 'new') return undefined;
    try { return (JSON.parse(editingPivot.config || '{}').spec) || undefined; } catch { return undefined; }
  })();
  const savePivotWidget = (spec) => {
    if (editingPivot === 'new') {
      addDashboardWidget('PIVOT', { spec }, 'Custom chart', 6);
    } else if (editingPivot) {
      let cfg;
      try { cfg = JSON.parse(editingPivot.config || '{}'); } catch { cfg = {}; }
      updateDashboardWidgetConfig(editingPivot, { ...cfg, spec });
    }
    setEditingPivot(null);
  };

  // One-click "start from a template": drop the opinionated starter set onto an empty dashboard
  // (RB-20 §3). Each call persists through the parent handler; the dashboard reloads with the set.
  const addStarterWidgets = () => {
    STARTER_WIDGETS.forEach((w) => addDashboardWidget(w.type, w.config, w.title, w.w));
  };

  return (
    <>
      <div className="p-6 overflow-y-auto h-full">
        {!selectedDashboard ? (
          <>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">{t('insights.dashboards.title')}</h1>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">{t('insights.dashboards.subtitle')}</p>
              </div>
              <Button variant="action" onClick={createDashboard}>{t('insights.dashboards.new')}</Button>
            </div>
            {suggestOn && (
              <DashboardSuggestionPanel
                workspaceId={activeWorkspaceId}
                roleKey={dashboardRole}
                onAccept={acceptDashboardSuggestion}
                showToast={showToast}
              />
            )}
            {convDashOn && (
              <ConversationalDashboardPanel
                workspaceId={activeWorkspaceId}
                showToast={showToast}
                onSaved={onConversationalDashboardSaved}
              />
            )}
            {customDashboards.length === 0 ? (
              <EmptyState icon={LayoutDashboard} title={t('insights.dashboards.emptyTitle')}
                subtitle={t('insights.dashboards.emptySubtitle')}
                action={<Button variant="action" onClick={createDashboard}>{t('insights.dashboards.new')}</Button>} />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {customDashboards.map(d => (
                  <div key={d.id} onClick={() => openDashboard(d.id)} role="button" tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') openDashboard(d.id); }}
                    className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 cursor-pointer hover:border-brand-navy/40 hover:shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-navy-tint/40">
                    <div className="flex items-start justify-between">
                      <LayoutDashboard className="h-6 w-6 text-neutral-600 dark:text-neutral-400" aria-hidden="true" />
                      <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-700 rounded-full px-2 py-0.5">{d.scope || 'PERSONAL'}</span>
                    </div>
                    <p className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 mt-2 truncate">{d.name}</p>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
                      {d.updatedAt ? absoluteDate(d.updatedAt) : '—'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3 min-w-0">
                <button onClick={() => setSelectedDashboard(null)} className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-brand-navy transition-colors flex-shrink-0">
                  <ArrowLeft className="inline-block h-3.5 w-3.5 mr-1 align-text-bottom" aria-hidden="true" />{t('insights.dashboards.title')}
                </button>
                <h1 className="text-xl font-semibold text-neutral-900 dark:text-white truncate">{selectedDashboard.name}</h1>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {!dashboardEditMode && <ExportButtons endpoint={`/dashboards/${selectedDashboard.id}/export`} targetId="dashboard-export-area"
                  rows={workItems.map(i => ({ ID: i.id, Title: i.title, Type: i.type, Status: i.status, Priority: i.priority, Assignee: i.assigneeId }))}
                  filename={selectedDashboard.name || 'dashboard'} onError={() => showToast(t('insights.common.exportFailed'), 'error')} />}
                {!dashboardEditMode && (
                  <button onClick={() => mintShare(selectedDashboard.id)}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-brand-navy transition-colors">{t('insights.common.share')}</button>
                )}
                <Button variant={dashboardEditMode ? 'action' : 'secondary'} onClick={() => setDashboardEditMode(e => !e)}>
                  {dashboardEditMode ? t('insights.common.done') : t('insights.common.edit')}
                </Button>
                <button onClick={() => deleteDashboard(selectedDashboard.id)} className="text-xs text-semantic-danger hover:underline">{t('insights.common.delete')}</button>
              </div>
            </div>

            {shareInfo && shareInfo.id === selectedDashboard.id && shareInfo.token && (() => {
              // Two surfaces for the same token (Cap J): a public link to open in a tab, and an
              // iframe snippet to embed in a portal / customer status page. The /embed/ path is the
              // chrome-less, framable surface (nginx serves it with the narrow frame-ancestors
              // allowance). The data is read-only + token-scoped, never owner/PII (RB-40 §1).
              const publicLink = `${window.location.origin}/?share=${shareInfo.token}`;
              const embedUrl = `${window.location.origin}/embed/dashboard/${shareInfo.token}`;
              const iframeSnippet = `<iframe src="${embedUrl}" width="100%" height="600" style="border:0" title="${selectedDashboard.name || 'Dashboard'}" loading="lazy"></iframe>`;
              return (
                <div className="mb-4 p-3 rounded-md bg-semantic-info-surface border border-neutral-200 dark:border-neutral-700 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-neutral-700 w-16 flex-shrink-0">Public link</span>
                    <input readOnly aria-label="Public dashboard link" value={publicLink}
                      className="flex-1 min-w-0 text-xs font-mono rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-2 py-1" />
                    <button onClick={() => { navigator.clipboard?.writeText(publicLink); showToast('Link copied'); }}
                      className="text-xs px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-brand-navy transition-colors flex-shrink-0">Copy</button>
                    <button onClick={() => stopShare(selectedDashboard.id)} className="text-xs text-semantic-danger hover:underline flex-shrink-0">Stop sharing</button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-neutral-700 w-16 flex-shrink-0">Embed</span>
                    <input readOnly aria-label="Embed iframe snippet" value={iframeSnippet}
                      className="flex-1 min-w-0 text-xs font-mono rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-2 py-1" />
                    <button onClick={() => { navigator.clipboard?.writeText(iframeSnippet); showToast('Embed code copied'); }}
                      className="text-xs px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-brand-navy transition-colors flex-shrink-0">Copy</button>
                  </div>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400">Paste the embed code into an internal portal or customer status page. The view is read-only and updates with the dashboard.</p>
                </div>
              );
            })()}

            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs uppercase tracking-wide text-neutral-600 dark:text-neutral-400">{t('insights.dashboards.scope')}</span>
              {['PROJECT', 'TEAM', 'ORG'].map(s => (
                <button key={s} type="button"
                  onClick={() => { setDashboardScope(s); fetchDashboardAggregate(s, dashboardTeamId); }}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${dashboardScope === s ? 'bg-brand-navy text-white border-brand-navy' : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-brand-navy'}`}>
                  {s === 'PROJECT' ? t('insights.dashboards.project') : s === 'TEAM' ? t('insights.dashboards.team') : t('insights.dashboards.organization')}
                </button>
              ))}
              {dashboardScope === 'TEAM' && (
                <select value={dashboardTeamId || ''} aria-label="Team"
                  onChange={e => { setDashboardTeamId(e.target.value); fetchDashboardAggregate('TEAM', e.target.value); }}
                  className="text-xs rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-1.5 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40">
                  <option value="">{t('insights.dashboards.selectTeam')}</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              )}
              {dashboardScope !== 'PROJECT' && (
                <span className="text-xs text-neutral-600 dark:text-neutral-400">Aggregated across {dashboardScope === 'TEAM' ? "the team's projects" : 'the workspace'}</span>
              )}
            </div>

            {dashboardEditMode && (
              <div className="mb-4 p-3 rounded-md bg-neutral-100 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wide">{t('insights.dashboards.widgetLibrary')}</span>
                  <span className="text-xs text-neutral-600 dark:text-neutral-400">{t('insights.dashboards.dragToReorder')}</span>
                </div>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider w-20 flex-shrink-0">Basics</span>
                    <button onClick={() => addDashboardWidget('SCORECARD', { filter: { open: true } }, 'Open items')} className="text-xs px-2 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-brand-navy hover:bg-white dark:hover:bg-neutral-800 transition-colors">Scorecard</button>
                    <button onClick={() => addDashboardWidget('STATUS_BAR', {}, 'By status')} className="text-xs px-2 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-brand-navy hover:bg-white dark:hover:bg-neutral-800 transition-colors">Status breakdown</button>
                    <button onClick={() => addDashboardWidget('ITEM_LIST', { filter: { open: true }, limit: 6 }, 'Open work items')} className="text-xs px-2 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-brand-navy hover:bg-white dark:hover:bg-neutral-800 transition-colors">Item list</button>
                    <button onClick={() => addDashboardWidget('PIE', { dimension: 'status' }, 'Items by status')} className="text-xs px-2 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-brand-navy hover:bg-white dark:hover:bg-neutral-800 transition-colors">Pie chart</button>
                    <button onClick={() => addDashboardWidget('BAR', { dimension: 'priority' }, 'Items by priority')} className="text-xs px-2 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-brand-navy hover:bg-white dark:hover:bg-neutral-800 transition-colors">Bar chart</button>
                    <button onClick={() => setEditingPivot('new')} className="text-xs px-2 py-1 rounded-lg border border-brand-navy/40 text-brand-navy dark:text-brand-amber hover:border-brand-navy hover:bg-white dark:hover:bg-neutral-800 transition-colors">+ Custom chart</button>
                  </div>
                  {EXTRA_WIDGET_CATEGORIES.map(cat => (
                    <div key={cat} className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider w-20 flex-shrink-0">{cat}</span>
                      {EXTRA_WIDGET_PRESETS.filter(p => p.category === cat).map(p => (
                        <button key={p.title} onClick={() => addDashboardWidget(p.type, p.config, p.title, p.w)}
                          className="text-xs px-2 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-brand-navy hover:bg-white dark:hover:bg-neutral-800 transition-colors">
                          {p.title}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!dashboardEditMode && (
              <DashboardAiSummary workspaceId={activeWorkspaceId} aiCapabilities={aiCapabilities}
                title={selectedDashboard.name} series={statusSeries(workItems)} />
            )}

            {(selectedDashboard.widgets || []).length === 0 ? (
              <EmptyState icon={Puzzle} title={t('insights.dashboards.emptyWidgetsTitle')}
                subtitle={t('insights.dashboards.emptyWidgetsSubtitle')}
                action={
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Button variant="action" onClick={addStarterWidgets}>Start from a template</Button>
                    <Button variant="secondary" onClick={() => setDashboardEditMode(true)}>{t('insights.dashboards.editDashboard')}</Button>
                  </div>
                } />
            ) : (
              <div id="dashboard-export-area" className="grid grid-cols-12 gap-4">
                {selectedDashboard.widgets.map(w => (
                  <DashboardWidgetCard key={w.id} widget={w} workItems={workItems} aggregate={dashboardAggregate} editMode={dashboardEditMode}
                    sprints={sprints} velocity={velocityData} currentUserId={currentUser?.id}
                    workspaceId={activeWorkspaceId} onEditPivot={setEditingPivot}
                    onRemove={() => removeDashboardWidget(w.id)}
                    onResize={gridW => resizeDashboardWidget(w, gridW)}
                    onConfigChange={cfg => updateDashboardWidgetConfig(w, cfg)}
                    onDrill={setDashboardDrill}
                    onDragStart={() => setDragWidgetId(w.id)}
                    onDrop={() => reorderDashboardWidgets(w.id)} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {dashboardDrill && (
        <DashboardDrillModal drill={dashboardDrill} onClose={() => setDashboardDrill(null)}
          onOpenItem={() => { setDashboardDrill(null); }} />
      )}

      {editingPivot && (
        <Modal title={editingPivot === 'new' ? t('insights.dashboards.addCustomChart') : t('insights.dashboards.editChart')}
          onClose={() => setEditingPivot(null)} size="lg" className="max-h-[90vh] overflow-y-auto">
          <WidgetBuilder workspaceId={activeWorkspaceId} value={pivotInitial}
            onSave={savePivotWidget} onCancel={() => setEditingPivot(null)} />
        </Modal>
      )}
    </>
  );
}
