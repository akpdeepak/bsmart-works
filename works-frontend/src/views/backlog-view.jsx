import { FileText } from 'lucide-react';
import { Button } from '@/components/works/button';
import { EmptyState } from '@/components/works/atoms/empty-state';
import { TypeBadge } from '@/components/works/work-item-type';
import { PriorityBadge } from '@/components/works/priority-badge';
import { Avatar } from '@/components/works/atoms/avatar';

/**
 * BacklogView — product backlog with epic rail, sprint sections, drag-drop reorder.
 *
 * Extracted from App.jsx (TD-003). All state lives in App; this component is a
 * pure rendering shell that accepts handlers as props.
 */
export default function BacklogView({
  workItems,
  backlogItems,
  sprints,
  users,
  refinementMode,
  dragOverId,
  setRefinementMode,
  setDragOverId,
  setIsCreateOpen,
  setIsSprintOpen,
  setSelectedItem,
  handleBacklogDragStart,
  handleBacklogDrop,
  handleMoveToSprint,
  handleMoveToBacklog,
  handleSprintStatusChange,
  handleRefinementUpdate,
  // SprintItemList is defined inline in App.jsx and passed as a prop to avoid
  // circular extraction (the component has deep App-specific deps).
  SprintItemList,
}) {
  const onPressKey = (e) => { if (e.key === 'Enter' || e.key === ' ') e.currentTarget.click(); };

  return (
    <div className="p-6">
      <div className="flex gap-6">
        {/* Epic panel — sticky left rail with per-epic progress */}
        <aside className="hidden lg:block w-56 flex-shrink-0">
          <div className="sticky top-6 rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-800">
            <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-neutral-600">Epics</p>
            {workItems.filter(i => i.type === 'Epic').length === 0 ? (
              <p className="px-1 text-xs text-neutral-600 dark:text-neutral-400">No epics yet.</p>
            ) : (
              <ul className="space-y-1">
                {workItems.filter(i => i.type === 'Epic').map(epic => {
                  const kids = workItems.filter(i => i.parentId === epic.id);
                  const done = kids.filter(i => i.status === 'Done').length;
                  const pct = kids.length ? Math.round((done / kids.length) * 100) : 0;
                  return (
                    <li key={epic.id}>
                      <button type="button" onClick={() => setSelectedItem(epic)}
                        className="w-full rounded-md px-2 py-1.5 text-left transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40">
                        <span className="block truncate text-xs font-medium text-neutral-900 dark:text-neutral-100">{epic.title}</span>
                        <span className="mt-1 block h-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-700">
                          <span className="block h-full rounded-full bg-semantic-success" style={{ width: `${pct}%` }} />
                        </span>
                        <span className="mt-0.5 block text-xs text-neutral-600 dark:text-neutral-400">{done}/{kids.length} done · {pct}%</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        <div className="min-w-0 flex-1 max-w-5xl">
          <div className="flex justify-between items-center mb-5">
            <div>
              <h1 className="text-xl font-bold text-brand-navy">Backlog</h1>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">{backlogItems.length} items not in any sprint</p>
            </div>
            <div className="flex gap-2 items-center">
              <label className="flex items-center gap-1.5 cursor-pointer mr-2">
                <input type="checkbox" checked={refinementMode} onChange={e => setRefinementMode(e.target.checked)} className="w-3 h-3 accent-brand-navy" />
                <span className="text-xs text-neutral-600 font-medium">Refinement mode</span>
              </label>
              <Button variant="secondary" size="sm" onClick={() => setIsSprintOpen(true)}>+ New Sprint</Button>
              <Button variant="action" size="sm" onClick={() => setIsCreateOpen(true)}>+ Add Item</Button>
            </div>
          </div>

          {/* Sprints with capacity bar */}
          {sprints.map(sprint => {
            const usedPts = sprint.usedPoints || 0;
            const capPct = sprint.capacity > 0 ? Math.min(100, Math.round((usedPts / sprint.capacity) * 100)) : 0;
            const capColor = capPct >= 100 ? 'bg-semantic-danger' : capPct >= 80 ? 'bg-semantic-warning' : 'bg-semantic-success';
            return (
              <div key={sprint.id} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl mb-4 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-100 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sprint.status === 'ACTIVE' ? 'bg-semantic-success/10 text-semantic-success' : sprint.status === 'COMPLETED' ? 'bg-neutral-200 text-neutral-600' : 'bg-brand-navy-tint/10 text-brand-navy-tint'}`}>{sprint.status}</span>
                    <h3 className="font-semibold text-neutral-900">{sprint.name}</h3>
                    {sprint.goal && <span className="text-xs text-neutral-600 dark:text-neutral-400 italic hidden md:inline">"{sprint.goal}"</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    {sprint.capacity > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 bg-neutral-200 rounded-full overflow-hidden" title={`${usedPts}/${sprint.capacity} story points`}>
                          <div className={`h-full rounded-full transition-all ${capColor}`} style={{ width: `${capPct}%` }}></div>
                        </div>
                        <span className={`text-xs font-medium ${capPct >= 100 ? 'text-semantic-danger' : capPct >= 80 ? 'text-semantic-warning' : 'text-neutral-600 dark:text-neutral-400'}`}>
                          {usedPts}/{sprint.capacity}pt
                        </span>
                      </div>
                    )}
                    {sprint.startDate && <span className="text-xs text-neutral-600 dark:text-neutral-400 hidden md:inline">{sprint.startDate} → {sprint.endDate}</span>}
                    {sprint.status === 'PLANNING' && <Button size="sm" variant="secondary" onClick={() => handleSprintStatusChange(sprint.id, 'ACTIVE')}>Start Sprint</Button>}
                    {sprint.status === 'ACTIVE' && <Button size="sm" variant="secondary" onClick={() => handleSprintStatusChange(sprint.id, 'COMPLETED')}>Complete</Button>}
                  </div>
                </div>
                <SprintItemList sprintId={sprint.id} users={users} onMoveToBacklog={(id) => handleMoveToBacklog(id, sprint.id)} onSelect={setSelectedItem} />
              </div>
            );
          })}

          {/* Backlog items with drag-drop reorder */}
          <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-100 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900">
              <h3 className="font-semibold text-neutral-900">Backlog</h3>
              <span className="text-xs text-neutral-600 dark:text-neutral-400">{backlogItems.length} items</span>
            </div>
            {backlogItems.length === 0
              ? <EmptyState icon={FileText} title="Backlog is empty" subtitle="Create work items to add them to the backlog." action={<Button variant="action" size="sm" onClick={() => setIsCreateOpen(true)}>Add to backlog</Button>} />
              : backlogItems.map((item) => (
                <div key={item.id}
                  draggable onDragStart={(e) => handleBacklogDragStart(e, item.id)}
                  onDragOver={(e) => { e.preventDefault(); setDragOverId(item.id); }}
                  onDragLeave={() => setDragOverId(null)}
                  onDrop={(e) => handleBacklogDrop(e, item.id)}
                  className={`flex items-center gap-3 px-5 py-3 border-b border-neutral-50 dark:border-neutral-700 last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-700 group transition-colors ${dragOverId === item.id ? 'border-t-2 border-t-brand-navy bg-brand-navy/5' : ''}`}>
                  <span className="text-neutral-300 cursor-grab text-xs mr-1">⠿</span>
                  <TypeBadge type={item.type} compact />
                  <span className="font-mono text-xs text-neutral-600 dark:text-neutral-400 w-20 flex-shrink-0">{item.id}</span>
                  <span role="button" tabIndex={0} onKeyDown={onPressKey} className="flex-1 text-sm text-neutral-900 cursor-pointer hover:text-brand-navy truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded" onClick={() => setSelectedItem(item)}>{item.title}</span>
                  {refinementMode ? (
                    <div className="flex items-center gap-2">
                      <select value={item.priority || 'MEDIUM'} onChange={e => handleRefinementUpdate(item.id, 'priority', e.target.value)}
                        className="text-xs border border-neutral-200 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-300 rounded px-1.5 py-1 focus:outline-none text-neutral-600">
                        {['LOW','MEDIUM','HIGH','CRITICAL'].map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                      <input type="number" min={0} max={100} value={item.storyPoints || 0}
                        onChange={e => handleRefinementUpdate(item.id, 'storyPoints', parseInt(e.target.value) || 0)}
                        className="w-14 text-xs border border-neutral-200 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-300 rounded px-1.5 py-1 focus:outline-none text-center"
                        placeholder="pts" />
                    </div>
                  ) : (
                    <>
                      <PriorityBadge priority={item.priority} />
                      {(item.storyPoints > 0) && <span className="text-xs bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 px-1.5 py-0.5 rounded">{item.storyPoints}pt</span>}
                    </>
                  )}
                  {item.assigneeId && <Avatar name={users.find(u => u.id === item.assigneeId)?.fullName || ''} size={6} />}
                  {sprints.filter(s => s.status !== 'COMPLETED').length > 0 && (
                    <select className="opacity-0 group-hover:opacity-100 text-xs border border-neutral-200 rounded px-1 py-0.5 text-neutral-600 transition-opacity"
                      onChange={e => e.target.value && handleMoveToSprint(item.id, e.target.value)} defaultValue="">
                      <option value="" disabled>→ Sprint</option>
                      {sprints.filter(s => s.status !== 'COMPLETED').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  )}
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  );
}
