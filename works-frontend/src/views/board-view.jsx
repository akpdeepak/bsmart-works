import { Star, SquarePen, X } from 'lucide-react';
import { BoardWipBadge } from '@/components/works/organisms/board-wip-badge';
import { TypeBadge } from '@/components/works/work-item-type';
import { Avatar } from '@/components/works/atoms/avatar';

// Board view columns definition — shared with App.jsx for sprint board re-use.
const COLUMNS = [
  { name: 'Todo',        display: 'TODO',        dot: 'bg-neutral-400',     limitKey: 'todoLimit' },
  { name: 'In Progress', display: 'IN PROGRESS', dot: 'bg-brand-navy-tint',  limitKey: 'inProgressLimit' },
  { name: 'Done',        display: 'DONE',        dot: 'bg-semantic-success', limitKey: 'doneLimit' },
];

const DENSITY_PAD = { compact: 'p-2', comfortable: 'p-3', spacious: 'p-4' };

/**
 * BoardView — Kanban board with WIP limits and drag-and-drop.
 *
 * Extracted from App.jsx (TD-003). All state lives in App; this component is a
 * pure rendering shell that accepts handlers as props.
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
}) {
  const columns = COLUMNS;
  const densityPad = DENSITY_PAD;

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-xl font-bold text-brand-navy">Board</h1>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">{workItems.length} items total</p>
        </div>
        {/* Density toggle */}
        <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1">
          {['compact', 'comfortable', 'spacious'].map(d => (
            <button key={d} onClick={() => setDensity(d)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize ${density === d ? 'bg-white dark:bg-neutral-700 shadow-sm text-brand-navy' : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}>
              {d}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        /* Skeleton — never a spinner (RB-30 §6, CLAUDE.md §4.11). */
        <div className="flex gap-4 flex-1 overflow-x-auto pb-4" aria-busy="true" aria-label="Loading board">
          {columns.map(col => (
            <div key={col.name} className="flex-1 min-w-56 flex flex-col bg-neutral-100 dark:bg-neutral-800 rounded-xl p-3">
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="h-3 w-20 bg-neutral-200 rounded animate-pulse"></div>
                <div className="h-5 w-6 bg-white rounded-full animate-pulse"></div>
              </div>
              {[1, 2, 3].map(n => (
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
      ) : (
        <div className="flex gap-4 flex-1 overflow-x-auto pb-4">
          {columns.map(col => {
            const colItems = workItems.filter(i => i.status === col.name);
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
                  {colItems.map(item => (
                    <div key={item.id} draggable
                      onDragStart={(e) => handleDragStart(e, item.id)}
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
                      <button type="button" className="text-sm font-medium text-neutral-900 leading-snug mb-2 cursor-pointer text-left w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded"
                        onClick={() => setSelectedItem(item)}>{item.title}</button>
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
                          {item.tags.map(t => (
                            <span key={t} className="text-xs bg-neutral-100 dark:bg-neutral-600 text-neutral-600 dark:text-neutral-300 px-1.5 py-0.5 rounded">{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add item shortcut */}
                <button onClick={() => { setNewItem(p => ({ ...p, status: col.name })); setIsCreateOpen(true); }}
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
