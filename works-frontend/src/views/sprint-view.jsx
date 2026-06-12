import { Zap, Flame, ArrowUp, Bug, Star, Globe, Lock, Unlock, X } from 'lucide-react';
import { Button } from '@/components/works/button';
import { EmptyState } from '@/components/works/atoms/empty-state';
import { SprintBoard } from '@/components/works/organisms/sprint-board';
import { api } from '@/lib/apiClient';

/**
 * SprintView — active sprint board with capacity, metrics, filters, and swimlanes.
 *
 * Extracted from App.jsx (TD-003). All state lives in App; this component is a
 * pure rendering shell that accepts handlers as props.
 */
export default function SprintView({
  activeSprint,
  sprints,
  sprintItems,
  sprintMetrics,
  sprintMetricsLoading,
  swimlaneBy,
  activeFilter,
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
  setActiveFilter,
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
}) {
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
              {activeSprint.startDate && <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">{activeSprint.startDate} → {activeSprint.endDate}</p>}
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
              <span className="text-xs text-neutral-600 dark:text-neutral-400 font-medium w-20">Capacity</span>
              <div className="flex-1 h-2 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                <div className="h-full bg-brand-navy-tint rounded-full transition-all"
                  style={{ width: `${Math.min(100, (sprintItems.reduce((a, i) => a + (i.storyPoints || 0), 0) / activeSprint.capacity) * 100)}%` }}></div>
              </div>
              <span className="text-xs text-neutral-600 font-medium w-28 text-right">
                {sprintItems.reduce((a, i) => a + (i.storyPoints || 0), 0)} / {activeSprint.capacity} pts
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
                    <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Velocity</p>
                    <p className="text-2xl font-bold text-brand-navy">{sprintMetrics.velocity}<span className="text-xs font-normal text-neutral-500 ml-1">pts</span></p>
                  </div>
                )}
                {sprintMetrics.completionPct != null && (
                  <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-4 py-2.5 min-w-36">
                    <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Completion</p>
                    <p className="text-2xl font-bold text-semantic-success">{Math.round(sprintMetrics.completionPct)}<span className="text-xs font-normal text-neutral-500 ml-0.5">%</span></p>
                  </div>
                )}
                {sprintMetrics.cycleTimeDays != null && (
                  <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-4 py-2.5 min-w-36">
                    <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Cycle Time</p>
                    <p className="text-2xl font-bold text-neutral-700 dark:text-neutral-200">{sprintMetrics.cycleTimeDays.toFixed(1)}<span className="text-xs font-normal text-neutral-500 ml-1">days</span></p>
                  </div>
                )}
              </>
            ) : null}
          </div>

          {/* Quick filters + Swimlane + Saved filters */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {[
              { label: 'All', filter: null },
              { label: 'Mine', filter: { type: 'mine' } },
              { label: 'Blockers', Icon: Flame, filter: { type: 'blockers' } },
              { label: 'High Priority', Icon: ArrowUp, filter: { type: 'priority', value: 'HIGH' } },
              { label: 'Bugs', Icon: Bug, filter: { type: 'itemType', value: 'BUG' } },
            ].map(f => (
              <button key={f.label} onClick={() => setActiveFilter(f.filter)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${JSON.stringify(activeFilter) === JSON.stringify(f.filter) ? 'bg-brand-navy text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'}`}>
                {f.Icon && <f.Icon className="inline-block h-3.5 w-3.5 mr-1 align-text-bottom" aria-hidden="true" />}{f.label}
              </button>
            ))}
            {savedFilters.map(f => (
              <div key={f.id} className="flex items-center gap-0.5">
                <button onClick={() => setActiveFilter(JSON.parse(f.filterJson))}
                  className={`text-xs px-2.5 py-1.5 rounded-l-full font-medium transition-colors ${f.shared ? 'bg-semantic-success/10 text-semantic-success' : 'bg-brand-navy/10 text-brand-navy'} hover:opacity-80`}>
                  {f.shared ? <Globe className="inline-block h-3.5 w-3.5 align-text-bottom" aria-hidden="true" /> : <Star className="inline-block h-3.5 w-3.5 align-text-bottom fill-current" aria-hidden="true" />}{f.name}
                </button>
                {f.createdBy === currentUser?.id && (
                  <button
                    onClick={() => {
                      api.send(`/saved-filters/${f.id}/share`, { method: 'PUT' })
                        .then(() => fetchSavedFilters())
                        .catch(reportError);
                    }}
                    title={f.shared ? 'Make private' : 'Share with team'}
                    className={`text-xs px-1.5 py-1.5 rounded-r-full font-medium transition-colors ${f.shared ? 'bg-semantic-success/20 text-semantic-success hover:bg-semantic-success/30' : 'bg-neutral-100 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'}`}>
                    {f.shared ? <Unlock className="h-3.5 w-3.5" aria-hidden="true" /> : <Lock className="h-3.5 w-3.5" aria-hidden="true" />}
                  </button>
                )}
              </div>
            ))}
            {activeFilter && (
              <div className="flex items-center gap-1 ml-auto">
                {!showSaveFilter
                  ? <button onClick={() => setShowSaveFilter(true)} className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-brand-navy">Save filter</button>
                  : <div className="flex gap-1">
                      <input type="text" value={saveFilterName} onChange={e => setSaveFilterName(e.target.value)}
                        placeholder="Filter name" className="text-xs border border-neutral-200 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 rounded px-2 py-1 focus:outline-none" />
                      <Button size="sm" variant="secondary" onClick={handleSaveFilter}>Save</Button>
                      <button onClick={() => setShowSaveFilter(false)} className="text-xs text-neutral-600 dark:text-neutral-400 px-1" aria-label="Cancel save filter">
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                }
              </div>
            )}
            <select value={swimlaneBy} onChange={e => setSwimlaneBy(e.target.value)}
              className="text-xs border border-neutral-200 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 rounded-md px-2 py-1.5 focus:outline-none text-neutral-600 ml-auto">
              <option value="none">No swimlane</option>
              <option value="assignee">By Assignee</option>
              <option value="type">By Type</option>
              <option value="priority">By Priority</option>
              <option value="epic">By Epic</option>
              <option value="tag">By Tag</option>
            </select>
          </div>

          <SprintBoard items={applyFilter(sprintItems)} columns={columns} users={users}
            swimlaneBy={swimlaneBy} allItems={workItems} onDragStart={handleDragStart} onDragOver={handleDragOver}
            onDrop={(e, status) => {
              e.preventDefault();
              const itemId = e.dataTransfer.getData('itemId');
              const item = sprintItems.find(i => i.id === itemId);
              if (!item || item.status === status) return;
              setSprintItems(prev => prev.map(i => i.id === itemId ? { ...i, status } : i));
              api.send(`/work-items/${itemId}`, { method: 'PUT', body: { ...item, status } })
                .then(r => { if (r && r.status === 409) { showToast('That item changed elsewhere — refreshing', 'error'); fetchSprints(); } })
                .catch(reportError);
            }}
            onSelect={setSelectedItem} onDelete={handleDelete} density={density}
            cardPrefs={cardPrefs} customFieldDefs={customFieldDefs} />
        </>
      ) : (
        <EmptyState icon={Zap} title="No sprints yet" subtitle="Create a sprint in the Backlog view to get started."
          action={<Button variant="action" onClick={() => { setView('backlog'); fetchBacklog(); fetchSprints(); }}>Go to Backlog</Button>} />
      )}
    </div>
  );
}
