import { Zap, Star, Globe, Lock, Unlock, X } from 'lucide-react';
import { Button } from '@/components/works/button';
import { EmptyState } from '@/components/works/atoms/empty-state';
import { ListSkeleton } from '@/components/works/atoms/skeleton';
import { SprintBoard } from '@/components/works/organisms/sprint-board';
import { WorkItemFilterBar } from '@/components/works/organisms/work-item-filter-bar';
import { normalizeSavedFilter, hasActiveFilters } from '@/lib/work-item-filter';
import { api } from '@/lib/apiClient';
import { useI18n } from '@/lib/i18n';
import { absoluteDate } from '@/lib/format';

/**
 * SprintView — active sprint board with capacity, metrics, filters, and swimlanes.
 *
 * Extracted from App.jsx (TD-003). All state lives in App; this component is a
 * pure rendering shell that accepts handlers as props.
 */
export default function SprintView({
  loading = false,
  activeSprint,
  sprints,
  sprintItems,
  sprintMetrics,
  sprintMetricsLoading,
  swimlaneBy,
  sprintFilters,
  sprintSort,
  savedFilters,
  showSaveFilter,
  saveFilterName,
  density,
  workItems,
  users,
  columns,
  currentUser,
  setActiveSprint,
  setSwimlaneBy,
  setSprintFilters,
  setSprintSort,
  setShowSaveFilter,
  setSaveFilterName,
  setSprintItems,
  setSelectedItem,
  setView,
  fetchSprintItems,
  fetchSprintMetrics,
  fetchBacklog,
  fetchSprints,
  fetchSavedFilters,
  handleSaveFilter,
  handleDragStart,
  handleDragOver,
  handleDelete,
  applyFilter,
  showToast,
  reportError,
  selectedProjectId,
  cardPrefs,
  customFieldDefs = [],
  statusResolver,
}) {
  const { t } = useI18n();
  if (loading && !activeSprint && sprints.length === 0) {
    return (
      <div className="p-6">
        <ListSkeleton rows={5} />
      </div>
    );
  }
  return (
    <div className="p-6 h-full flex flex-col">
      {activeSprint ? (
        <>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="flex items-center gap-3 mb-0.5">
                <h1 className="text-xl font-bold text-brand-navy">{activeSprint.name}</h1>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${activeSprint.status === 'ACTIVE' ? 'bg-semantic-success/10 text-semantic-success' : 'bg-neutral-200 text-neutral-600'}`}>{activeSprint.status}</span>
              </div>
              {activeSprint.goal && <p className="text-sm text-neutral-600 dark:text-neutral-400 italic">"{activeSprint.goal}"</p>}
              {activeSprint.startDate && <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">{absoluteDate(activeSprint.startDate)} → {absoluteDate(activeSprint.endDate)}</p>}
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <select value={activeSprint.id}
                onChange={e => { const s = sprints.find(x => x.id === e.target.value); if (s) { setActiveSprint(s); fetchSprintItems(s.id); fetchSprintMetrics(s, selectedProjectId || 'PROJ-WORKS'); } }}
                className="text-sm border border-neutral-200 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 rounded-md px-2 py-1.5 focus:outline-none">
                {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          {/* Capacity bar */}
          {activeSprint.capacity > 0 && (
            <div className="mb-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-4 py-2.5 flex items-center gap-4">
              <span className="text-xs text-neutral-600 dark:text-neutral-400 font-medium w-20">{t('deliver.sprint.capacity')}</span>
              <div className="flex-1 h-2 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                <div className="h-full bg-brand-navy-tint rounded-full transition-all"
                  style={{ width: `${Math.min(100, (sprintItems.reduce((a, i) => a + (i.storyPoints || 0), 0) / activeSprint.capacity) * 100)}%` }}></div>
              </div>
              <span className="text-xs text-neutral-600 font-medium w-28 text-right">
                {sprintItems.reduce((a, i) => a + (i.storyPoints || 0), 0)} / {activeSprint.capacity} {t('deliver.sprint.pts')}
              </span>
            </div>
          )}

          {/* Inline metrics strip — team-level only */}
          <div className="mb-3 flex flex-wrap gap-3">
            {sprintMetricsLoading ? (
              <>
                <div className="animate-pulse bg-neutral-100 dark:bg-neutral-800 rounded-lg h-14 w-36" aria-hidden="true" />
                <div className="animate-pulse bg-neutral-100 dark:bg-neutral-800 rounded-lg h-14 w-36" aria-hidden="true" />
                <div className="animate-pulse bg-neutral-100 dark:bg-neutral-800 rounded-lg h-14 w-36" aria-hidden="true" />
              </>
            ) : sprintMetrics ? (
              <>
                {sprintMetrics.velocity != null && (
                  <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-4 py-2.5 min-w-36">
                    <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">{t('deliver.sprint.velocity')}</p>
                    <p className="text-2xl font-bold text-brand-navy">{sprintMetrics.velocity}<span className="text-xs font-normal text-neutral-500 ml-1">{t('deliver.sprint.pts')}</span></p>
                  </div>
                )}
                {sprintMetrics.completionPct != null && (
                  <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-4 py-2.5 min-w-36">
                    <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">{t('deliver.sprint.completion')}</p>
                    <p className="text-2xl font-bold text-semantic-success">{Math.round(sprintMetrics.completionPct)}<span className="text-xs font-normal text-neutral-500 ml-0.5">%</span></p>
                  </div>
                )}
                {sprintMetrics.cycleTimeDays != null && (
                  <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-4 py-2.5 min-w-36">
                    <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">{t('deliver.sprint.cycleTime')}</p>
                    <p className="text-2xl font-bold text-neutral-700 dark:text-neutral-200">{sprintMetrics.cycleTimeDays.toFixed(1)}<span className="text-xs font-normal text-neutral-500 ml-1">{t('deliver.sprint.days')}</span></p>
                  </div>
                )}
              </>
            ) : null}
          </div>

          {/* Shared filter + sort bar (same model as Board/Backlog), saved filters, swimlane */}
          <div className="mb-3 space-y-2">
            <WorkItemFilterBar
              items={sprintItems}
              filters={sprintFilters}
              onFiltersChange={setSprintFilters}
              sort={sprintSort}
              onSortChange={setSprintSort}
              userName={(id) => users.find(u => u.id === id)?.fullName || id}
            />
            <div className="flex items-center gap-2 flex-wrap">
              {savedFilters.map(f => (
                <div key={f.id} className="flex items-center gap-0.5">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setSprintFilters(normalizeSavedFilter(JSON.parse(f.filterJson)))}
                    className={`text-xs px-2.5 py-1.5 rounded-l-full font-medium transition-colors ${f.shared ? 'bg-semantic-success/10 text-semantic-success' : 'bg-brand-navy/10 text-brand-navy'} hover:opacity-80`}>
                    {f.shared ? <Globe className="inline-block h-3.5 w-3.5 align-text-bottom" aria-hidden="true" /> : <Star className="inline-block h-3.5 w-3.5 align-text-bottom fill-current" aria-hidden="true" />}{f.name}
                  </Button>
                  {f.createdBy === currentUser?.id && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        api.send(`/saved-filters/${f.id}/share`, { method: 'PUT' })
                          .then(() => fetchSavedFilters())
                          .catch(reportError);
                      }}
                      title={f.shared ? t('deliver.sprint.makePrivate') : t('deliver.sprint.shareWithTeam')}
                      className={`text-xs px-1.5 py-1.5 rounded-r-full font-medium transition-colors ${f.shared ? 'bg-semantic-success/20 text-semantic-success hover:bg-semantic-success/30' : 'bg-neutral-100 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'}`}>
                      {f.shared ? <Unlock className="h-3.5 w-3.5" aria-hidden="true" /> : <Lock className="h-3.5 w-3.5" aria-hidden="true" />}
                    </Button>
                  )}
                </div>
              ))}
              {hasActiveFilters(sprintFilters) && (
                <div className="flex items-center gap-1">
                  {!showSaveFilter
                    ? <Button type="button" variant="ghost" size="sm" onClick={() => setShowSaveFilter(true)} className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-brand-navy">{t('deliver.sprint.saveFilter')}</Button>
                    : <div className="flex gap-1">
                        <input type="text" value={saveFilterName} onChange={e => setSaveFilterName(e.target.value)}
                          placeholder={t('deliver.sprint.filterName')} className="text-xs border border-neutral-200 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 rounded px-2 py-1 focus:outline-none" />
                        <Button size="sm" variant="secondary" onClick={handleSaveFilter}>{t('common.save')}</Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setShowSaveFilter(false)} className="text-xs text-neutral-600 dark:text-neutral-400 px-1" aria-label={t('deliver.sprint.cancelSaveFilter')}>
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                      </div>
                  }
                </div>
              )}
              <select value={swimlaneBy} onChange={e => setSwimlaneBy(e.target.value)}
                className="text-xs border border-neutral-200 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 rounded-md px-2 py-1.5 focus:outline-none text-neutral-600 ml-auto">
                <option value="none">{t('deliver.sprint.swimlane.none')}</option>
                <option value="assignee">{t('deliver.sprint.swimlane.assignee')}</option>
                <option value="type">{t('deliver.sprint.swimlane.type')}</option>
                <option value="priority">{t('deliver.sprint.swimlane.priority')}</option>
                <option value="epic">{t('deliver.sprint.swimlane.epic')}</option>
                <option value="tag">{t('deliver.sprint.swimlane.tag')}</option>
              </select>
            </div>
          </div>

          <SprintBoard items={applyFilter(sprintItems)} columns={columns} users={users}
            swimlaneBy={swimlaneBy} allItems={workItems} onDragStart={handleDragStart} onDragOver={handleDragOver}
            onDrop={(e, dropCategory) => {
              e.preventDefault();
              const itemId = e.dataTransfer.getData('itemId');
              const item = sprintItems.find(i => i.id === itemId);
              if (!item) return;
              // SprintBoard passes a board category; resolve it to a concrete status for this type.
              const fallback = { todo: 'Todo', in_progress: 'In Progress', done: 'Done' };
              const status = statusResolver?.firstStatusOfCategory(item.type, dropCategory)
                || fallback[dropCategory] || dropCategory;
              if (item.status === status) return;
              setSprintItems(prev => prev.map(i => i.id === itemId ? { ...i, status } : i));
              api.send(`/work-items/${itemId}`, { method: 'PUT', body: { ...item, status } })
                // Success: adopt the saved item so derived fields (e.g. statusChangedAt for the
                // lapse badge) reflect the server, not the optimistic guess.
                .then(saved => setSprintItems(prev => prev.map(i => i.id === itemId ? saved : i)))
                .catch(err => {
                  if (err?.status === 409) {
                    // Concurrent edit: pull the authoritative sprint items instead of leaving the
                    // optimistic move on screen. (api.send throws on 409 — the .then check was dead.)
                    showToast(t('deliver.sprint.itemChangedElsewhere'), 'error');
                    if (activeSprint) fetchSprintItems(activeSprint.id);
                  } else {
                    // Revert the optimistic move.
                    setSprintItems(prev => prev.map(i => i.id === itemId ? { ...i, status: item.status } : i));
                    // Surface workflow-transition rejections as specific messages.
                    const code = err?.code || err?.body?.code;
                    if (code === 'VALIDATOR_FAILED' || code === 'TRANSITION_CONDITION_FAILED') {
                      showToast(`${t('deliver.board.statusChangeBlocked')}: ${err.message || t('deliver.board.transitionNotAllowed')}`, 'error');
                    } else {
                      reportError(err);
                    }
                  }
                });
            }}
            onSelect={setSelectedItem} onDelete={handleDelete} density={density}
            cardPrefs={cardPrefs} customFieldDefs={customFieldDefs} statusResolver={statusResolver} />
        </>
      ) : (
        <EmptyState icon={Zap} title={t('deliver.sprint.emptyTitle')} subtitle={t('deliver.sprint.emptySubtitle')}
          action={<Button variant="action" onClick={() => { setView('backlog'); fetchBacklog(); fetchSprints(); }}>{t('deliver.sprint.goToBacklog')}</Button>} />
      )}
    </div>
  );
}
