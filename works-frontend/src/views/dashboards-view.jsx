import { useState } from 'react';
import { LayoutDashboard, ArrowLeft, Puzzle } from 'lucide-react';
import { Button } from '@/components/works/button';
import { EmptyState } from '@/components/works/atoms/empty-state';
import { ExportButtons } from '@/components/works/export-buttons';
import { Modal } from '@/components/works/molecules/modal';
import { DashboardWidgetCard } from '@/components/works/organisms/dashboard-widget-card';
import { DashboardDrillModal } from '@/components/works/organisms/dashboard-drill-modal';
import { ConversationalDashboardPanel } from '@/components/works/organisms/conversational-dashboard-panel';
import { WidgetBuilder } from '@/components/works/organisms/widget-builder';
import { capabilityEnabled } from '@/lib/ai';
import { DashboardAiSummary } from '@/components/works/organisms/dashboard-ai-summary';

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

const EXTRA_WIDGET_CATEGORIES = ['Agile', 'Performance', 'AI', 'Compliance'];
const EXTRA_WIDGET_PRESETS = [
  { category: 'Agile', type: 'VELOCITY_CHART', config: {}, title: 'Velocity', w: 4 },
  { category: 'Agile', type: 'BURNDOWN', config: {}, title: 'Burndown', w: 6 },
  { category: 'Agile', type: 'CUMFLOW', config: {}, title: 'Cumulative flow', w: 6 },
  { category: 'Performance', type: 'CYCLE_TIME', config: {}, title: 'Cycle time', w: 4 },
  { category: 'Performance', type: 'THROUGHPUT', config: {}, title: 'Throughput', w: 4 },
  { category: 'AI', type: 'AI_USAGE', config: {}, title: 'AI usage', w: 4 },
  { category: 'Compliance', type: 'SLA_HEALTH', config: {}, title: 'SLA health', w: 6 },
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
  // Gate the NL entry on ITS capability (conversational_dashboard), not "any AI" — most-restrictive
  // wins is already resolved server-side (RB-40 §2). Hidden entirely when off; the deterministic
  // NL→spec fallback still works server-side when AI is on but over budget/unavailable.
  const convDashOn = capabilityEnabled(aiCapabilities, 'conversational_dashboard');

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

  return (
    <>
      <div className="p-6 overflow-y-auto h-full">
        {!selectedDashboard ? (
          <>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">Dashboards</h1>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">Build your own views — add widgets, arrange the grid, save.</p>
              </div>
              <Button variant="action" onClick={createDashboard}>New dashboard</Button>
            </div>
            {convDashOn && (
              <ConversationalDashboardPanel
                workspaceId={activeWorkspaceId}
                showToast={showToast}
                onSaved={onConversationalDashboardSaved}
              />
            )}
            {customDashboards.length === 0 ? (
              <EmptyState icon={LayoutDashboard} title="No dashboards yet"
                subtitle="Create a dashboard and drop in widgets to track what matters to you."
                action={<Button variant="action" onClick={createDashboard}>New dashboard</Button>} />
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
                      {d.updatedAt ? `Updated ${new Date(d.updatedAt).toLocaleDateString()}` : '—'}
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
                  <ArrowLeft className="inline-block h-3.5 w-3.5 mr-1 align-text-bottom" aria-hidden="true" />Dashboards
                </button>
                <h1 className="text-xl font-semibold text-neutral-900 dark:text-white truncate">{selectedDashboard.name}</h1>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {!dashboardEditMode && <ExportButtons endpoint={`/dashboards/${selectedDashboard.id}/export`} targetId="dashboard-export-area"
                  rows={workItems.map(i => ({ ID: i.id, Title: i.title, Type: i.type, Status: i.status, Priority: i.priority, Assignee: i.assigneeId }))}
                  filename={selectedDashboard.name || 'dashboard'} onError={() => showToast('Export failed — try again', 'error')} />}
                {!dashboardEditMode && (
                  <button onClick={() => mintShare(selectedDashboard.id)}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-brand-navy transition-colors">Share</button>
                )}
                <Button variant={dashboardEditMode ? 'action' : 'secondary'} onClick={() => setDashboardEditMode(e => !e)}>
                  {dashboardEditMode ? 'Done' : 'Edit'}
                </Button>
                <button onClick={() => deleteDashboard(selectedDashboard.id)} className="text-xs text-semantic-danger hover:underline">Delete</button>
              </div>
            </div>

            {shareInfo && shareInfo.id === selectedDashboard.id && shareInfo.token && (
              <div className="flex items-center gap-2 mb-4 p-3 rounded-md bg-semantic-info-surface border border-neutral-200 dark:border-neutral-700">
                <span className="text-xs font-semibold text-neutral-700 flex-shrink-0">Public link</span>
                <input readOnly aria-label="Public embed link"
                  value={`${window.location.origin}${window.location.pathname}?share=${shareInfo.token}`}
                  className="flex-1 min-w-0 text-xs font-mono rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-2 py-1" />
                <button onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}${window.location.pathname}?share=${shareInfo.token}`); showToast('Link copied'); }}
                  className="text-xs px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-brand-navy transition-colors flex-shrink-0">Copy</button>
                <button onClick={() => stopShare(selectedDashboard.id)} className="text-xs text-semantic-danger hover:underline flex-shrink-0">Stop sharing</button>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs uppercase tracking-wide text-neutral-600 dark:text-neutral-400">Scope</span>
              {['PROJECT', 'TEAM', 'ORG'].map(s => (
                <button key={s} type="button"
                  onClick={() => { setDashboardScope(s); fetchDashboardAggregate(s, dashboardTeamId); }}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${dashboardScope === s ? 'bg-brand-navy text-white border-brand-navy' : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-brand-navy'}`}>
                  {s === 'PROJECT' ? 'Project' : s === 'TEAM' ? 'Team' : 'Organization'}
                </button>
              ))}
              {dashboardScope === 'TEAM' && (
                <select value={dashboardTeamId || ''} aria-label="Team"
                  onChange={e => { setDashboardTeamId(e.target.value); fetchDashboardAggregate('TEAM', e.target.value); }}
                  className="text-xs rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-1.5 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40">
                  <option value="">Select a team…</option>
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
                  <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wide">Widget library</span>
                  <span className="text-xs text-neutral-600 dark:text-neutral-400">Drag widgets to reorder</span>
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
              <EmptyState icon={Puzzle} title="Empty dashboard"
                subtitle="Turn on Edit and add your first widget to start tracking."
                action={<Button variant="action" onClick={() => setDashboardEditMode(true)}>Edit dashboard</Button>} />
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
        <Modal title={editingPivot === 'new' ? 'Add custom chart' : 'Edit chart'}
          onClose={() => setEditingPivot(null)} size="lg" className="max-h-[90vh] overflow-y-auto">
          <WidgetBuilder workspaceId={activeWorkspaceId} value={pivotInitial}
            onSave={savePivotWidget} onCancel={() => setEditingPivot(null)} />
        </Modal>
      )}
    </>
  );
}
