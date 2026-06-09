import { useState, useMemo } from 'react';
import { Star, SquarePen, X, ChevronDown } from 'lucide-react';
import { BoardWipBadge } from '@/components/works/organisms/board-wip-badge';
import { TypeBadge } from '@/components/works/work-item-type';
import { Avatar } from '@/components/works/atoms/avatar';

const COLUMNS = [
  { name: 'Todo',        display: 'TODO',        dot: 'bg-neutral-400',     limitKey: 'todoLimit' },
  { name: 'In Progress', display: 'IN PROGRESS', dot: 'bg-brand-navy-tint',  limitKey: 'inProgressLimit' },
  { name: 'Done',        display: 'DONE',        dot: 'bg-semantic-success', limitKey: 'doneLimit' },
];

const DENSITY_PAD = { compact: 'p-2', comfortable: 'p-3', spacious: 'p-4' };

const QUICK_FILTERS = [
  { id: 'all',           label: 'All' },
  { id: 'mine',          label: 'Mine',          needsUser: true },
  { id: 'high-priority', label: 'High Priority' },
  { id: 'bugs',          label: 'Bugs' },
];

const SWIMLANES = [
  { id: 'none',     label: 'No grouping' },
  { id: 'assignee', label: 'By Assignee' },
  { id: 'type',     label: 'By Type' },
  { id: 'priority', label: 'By Priority' },
];

/**
 * BoardView — Kanban board with WIP limits, quick filters, swimlane grouping, and drag-and-drop.
 *
 * Extracted from App.jsx (TD-003). All persistent state lives in App; filter/swimlane state is
 * local because it is purely a display preference and needs no persistence.
 */
export default function BoardView({
  workItems,
  loading,
  density,
  wipLimits,
  setDensity,
  setIsCreateOpen,
  setNewItem,
  setSelectedItem,
  handleDragStart,
  handleDragOver,
  handleDrop,
  handleDelete,
  toggleStar,
  setWipLimit,
  can,
  userName,
  currentUserId,
}) {
  const [quickFilter, setQuickFilter] = useState('all');
  const [swimlane, setSwimlane] = useState('none');

  const filteredItems = useMemo(() => {
    if (quickFilter === 'mine') return workItems.filter((i) => currentUserId && i.assigneeId === currentUserId);
    if (quickFilter === 'high-priority') return workItems.filter((i) => i.priority === 'high' || i.priority === 'critical');
    if (quickFilter === 'bugs') return workItems.filter((i) => (i.type ?? '').toLowerCase() === 'bug');
    return workItems;
  }, [workItems, quickFilter, currentUserId]);

  const swimlaneGroups = useMemo(() => {
    if (swimlane === 'none') return null;
    const keyFn = swimlane === 'assignee' ? (i) => i.assigneeId || 'unassigned'
                : swimlane === 'type' ? (i) => i.type || 'none'
                : (i) => i.priority || 'none';
    const map = new Map();
    filteredItems.forEach((item) => {
      const k = keyFn(item);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(item);
    });
    return Array.from(map.entries()).map(([key, items]) => ({ key, items }));
  }, [filteredItems, swimlane]);

  const groupLabel = (key) =>
    swimlane === 'assignee' ? (key === 'unassigned' ? 'Unassigned' : userName(key)) : key;

  const densityPad = DENSITY_PAD;

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-xl font-bold text-brand-navy">Board</h1>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
            {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}{quickFilter !== 'all' ? ' (filtered)' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Swimlane selector */}
          <div className="relative">
            <select value={swimlane} onChange={(e) => setSwimlane(e.target.value)}
              aria-label="Group board by"
              className="appearance-none pl-3 pr-7 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 cursor-pointer">
              {SWIMLANES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-neutral-400" aria-hidden="true" />
          </div>
          {/* Density toggle */}
          <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1">
            {['compact', 'comfortable', 'spacious'].map((d) => (
              <button key={d} onClick={() => setDensity(d)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize ${density === d ? 'bg-white dark:bg-neutral-700 shadow-sm text-brand-navy' : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}>
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quick filter bar */}
      <div className="flex flex-wrap gap-1.5 mb-4" role="group" aria-label="Quick filters">
        {QUICK_FILTERS.filter((f) => !f.needsUser || currentUserId).map((f) => (
          <button key={f.id} onClick={() => setQuickFilter(f.id)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              quickFilter === f.id
                ? 'bg-brand-navy text-white'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex gap-4 flex-1 overflow-x-auto pb-4" aria-busy="true" aria-label="Loading board">
          {COLUMNS.map((col) => (
            <div key={col.name} className="flex-1 min-w-56 flex flex-col bg-neutral-100 dark:bg-neutral-800 rounded-xl p-3">
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="h-3 w-20 bg-neutral-200 rounded animate-pulse"></div>
                <div className="h-5 w-6 bg-white rounded-full animate-pulse"></div>
              </div>
              {[1, 2, 3].map((n) => (
                <div key={n} className="bg-white rounded-lg p-3 mb-2 border border-neutral-200">
                  <div className="h-2 w-16 bg-neutral-100 rounded animate-pulse mb-2"></div>
                  <div className="h-3 w-full bg-neutral-100 rounded animate-pulse mb-1"></div>
                  <div className="h-3 w-3/4 bg-neutral-100 rounded animate-pulse mb-3"></div>
                  <div className="flex justify-between">
                    <div className="h-4 w-14 bg-neutral-100 rounded animate-pulse"></div>
                    <div className="h-5 w-5 bg-neutral-100 rounded-full animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : swimlaneGroups ? (
        /* Swimlane mode — horizontal band per group */
        <div className="flex-1 overflow-y-auto pb-4 space-y-6">
          {swimlaneGroups.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-sm text-neutral-400">
              No items match the current filter.
            </div>
          ) : swimlaneGroups.map(({ key, items: groupItems }) => (
            <div key={key}>
              <div className="flex items-center gap-2 mb-2 px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  {groupLabel(key)}
                </span>
                <span className="text-xs text-neutral-400">({groupItems.length})</span>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {COLUMNS.map((col) => {
                  const colItems = groupItems.filter((i) => i.status === col.name);
                  return (
                    <div key={col.name}
                      className="flex-1 min-w-44 flex flex-col bg-neutral-100 dark:bg-neutral-800 rounded-xl p-3"
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, col.name)}>
                      <div className="flex items-center gap-2 mb-2 px-1">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${col.dot}`}></span>
                        <h3 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">{col.display}</h3>
                        <span className="text-xs text-neutral-400 ml-auto">{colItems.length}</span>
                      </div>
                      <div className="space-y-2 flex-1">
                        {colItems.length === 0 && (
                          <div className="flex items-center justify-center py-4 border-2 border-dashed border-neutral-200 rounded-lg">
                            <p className="text-xs text-neutral-400">Drop here</p>
                          </div>
                        )}
                        {colItems.map((item) => (
                          <BoardCard key={item.id} item={item} density={density} densityPad={densityPad}
                            handleDragStart={handleDragStart} toggleStar={toggleStar}
                            setSelectedItem={setSelectedItem} handleDelete={handleDelete}
                            userName={userName} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Normal column view */
        <div className="flex gap-4 flex-1 overflow-x-auto pb-4">
          {COLUMNS.map((col) => {
            const colItems = filteredItems.filter((i) => i.status === col.name);
            const wipLimit = wipLimits[col.limitKey] ?? null;
            const overWip = wipLimit != null && colItems.length > wipLimit;
            return (
              <div key={col.name}
                className={`flex-1 min-w-56 flex flex-col bg-neutral-100 dark:bg-neutral-800 rounded-xl p-3 ${overWip ? 'ring-1 ring-semantic-danger/40' : ''}`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.name)}>
                <div className="mb-3 px-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${col.dot}`}></span>
                      <h3 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">{col.display}</h3>
                    </div>
                    <BoardWipBadge count={colItems.length} limit={wipLimit}
                      canEdit={can('manage_projects')} onSet={(next) => setWipLimit(col.limitKey, next)} />
                  </div>
                  {overWip && <p className="mt-1 text-xs font-medium text-semantic-danger">Over WIP limit</p>}
                </div>

                <div className="space-y-2 flex-1">
                  {colItems.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-neutral-200 rounded-lg">
                      <p className="text-xs text-neutral-600 dark:text-neutral-400">Drop items here</p>
                    </div>
                  )}
                  {colItems.map((item) => (
                    <BoardCard key={item.id} item={item} density={density} densityPad={densityPad}
                      handleDragStart={handleDragStart} toggleStar={toggleStar}
                      setSelectedItem={setSelectedItem} handleDelete={handleDelete}
                      userName={userName} />
                  ))}
                </div>

                <button onClick={() => { setNewItem((p) => ({ ...p, status: col.name })); setIsCreateOpen(true); }}
                  className="mt-2 w-full flex items-center gap-1.5 px-2 py-1.5 text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-white dark:hover:bg-neutral-700 rounded-lg transition-colors">
                  <span>+</span> Add item
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BoardCard({ item, density, densityPad, handleDragStart, toggleStar, setSelectedItem, handleDelete, userName }) {
  return (
    <div draggable onDragStart={(e) => handleDragStart(e, item.id)}
      className={`bg-white dark:bg-neutral-700 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-600 cursor-grab hover:shadow-md transition-shadow group ${densityPad[density]} ${item.starred ? 'border-brand-orange/40' : ''}`}>
      <div className="flex items-start justify-between mb-1.5">
        <span className="font-mono text-xs text-neutral-600 dark:text-neutral-400">{item.id}</span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => toggleStar(item)} title={item.starred ? 'Unstar' : 'Star'}
            className={`text-xs p-0.5 transition-colors ${item.starred ? 'text-brand-orange' : 'text-neutral-300 hover:text-brand-orange'}`}>
            <Star className={`h-3.5 w-3.5 ${item.starred ? 'fill-current' : ''}`} aria-hidden="true" />
          </button>
          <button onClick={() => setSelectedItem(item)} className="text-neutral-600 dark:text-neutral-400 hover:text-brand-navy text-xs p-0.5" aria-label="Edit work item">
            <SquarePen className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button onClick={() => handleDelete(item.id)} className="text-neutral-600 dark:text-neutral-400 hover:text-semantic-danger text-xs p-0.5" aria-label="Delete work item">
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
      <button type="button"
        className="text-sm font-medium text-neutral-900 leading-snug mb-2 cursor-pointer text-left w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded"
        onClick={() => setSelectedItem(item)}>
        {item.title}
      </button>
      {density !== 'compact' && item.description && (
        <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-2 line-clamp-2">{item.description}</p>
      )}
      <div className="flex items-center justify-between">
        <TypeBadge type={item.type} compact={density === 'compact'} />
        <div className="flex items-center gap-1.5">
          {item.dueDate && <span className="text-xs text-semantic-warning font-medium">{item.dueDate}</span>}
          {item.assigneeId && <Avatar name={userName(item.assigneeId)} size={5} />}
        </div>
      </div>
      {density !== 'compact' && item.tags && item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {item.tags.map((t) => (
            <span key={t} className="text-xs bg-neutral-100 dark:bg-neutral-600 text-neutral-600 dark:text-neutral-300 px-1.5 py-0.5 rounded">{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}
