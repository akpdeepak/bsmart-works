import { Star, SquarePen, X } from 'lucide-react';
import { BoardWipBadge } from '@/components/works/organisms/board-wip-badge';
import { TypeBadge } from '@/components/works/work-item-type';
import { Avatar } from '@/components/works/atoms/avatar';
import { CardFieldsPopover } from '@/components/works/organisms/card-fields-popover';
import { PriorityBadge } from '@/components/works/priority-badge';
import { StatusBadge } from '@/components/works/status-badge';
import { statusToCategory } from '@/components/works/status';
import { LapseBadge } from '@/components/works/atoms/lapse-badge';
import { computeLapse } from '@/lib/status-lapse';
import { cn } from '@/lib/utils';

// Columns are the three fixed categories; items land by their status's category (resolved per
// type), so custom statuses (Triaged, On Hold, …) appear in the right column.
const COLUMNS = [
  { key: 'todo',        display: 'TO DO',       dot: 'bg-neutral-400',     limitKey: 'todoLimit' },
  { key: 'in_progress', display: 'IN PROGRESS', dot: 'bg-brand-navy-tint',  limitKey: 'inProgressLimit' },
  { key: 'done',        display: 'DONE',        dot: 'bg-semantic-success', limitKey: 'doneLimit' },
];

const DENSITY_PAD = { compact: 'p-2', comfortable: 'p-3', spacious: 'p-4' };

function dueDays(dateStr) {
  if (!dateStr) return null;
  const days = Math.ceil(
    (new Date(dateStr).setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / 86400000
  );
  if (days < 0)  return { text: `${Math.abs(days)}d overdue`, urgent: true };
  if (days === 0) return { text: 'Due today', urgent: true };
  return { text: `Due in ${days}d`, urgent: days <= 3 };
}

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
  // card field customisation
  cardPrefs,
  customFieldDefs = [],
  onCustomFieldCreated,
  workspaceId,
  statusResolver,
}) {
  const columns = COLUMNS;
  const densityPad = DENSITY_PAD;
  const iv = cardPrefs?.isVisible ?? (() => true);
  // Resolve an item's board category (per-type status config; legacy-safe fallback).
  const catOf = (item) => statusResolver
    ? statusResolver.categoryOf(item.type, item.status)
    : statusToCategory(item.status);

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-xl font-bold text-brand-navy">Board</h1>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">{workItems.length} items total</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Fields popover */}
          {cardPrefs && (
            <CardFieldsPopover
              cardPrefs={cardPrefs}
              workspaceId={workspaceId}
              customFieldDefs={customFieldDefs}
              onCustomFieldCreated={onCustomFieldCreated}
            />
          )}
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
      </div>

      {loading ? (
        <div className="flex gap-4 flex-1 overflow-x-auto pb-4" aria-busy="true" aria-label="Loading board">
          {columns.map(col => (
            <div key={col.key} className="flex-1 min-w-56 flex flex-col bg-neutral-100 dark:bg-neutral-800 rounded-xl p-3">
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
            const colItems = workItems.filter(i => catOf(i) === col.key);
            const wipLimit = wipLimits[col.limitKey] ?? null;
            const overWip = wipLimit != null && colItems.length > wipLimit;
            return (
              <div key={col.key}
                className={`flex-1 min-w-56 flex flex-col bg-neutral-100 dark:bg-neutral-800 rounded-xl p-3 ${overWip ? 'ring-1 ring-semantic-danger/40' : ''}`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.key)}>
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
                    <WorkCard
                      key={item.id}
                      item={item}
                      category={col.key}
                      density={density}
                      densityPad={densityPad}
                      iv={iv}
                      userName={userName}
                      customFieldDefs={customFieldDefs}
                      statusResolver={statusResolver}
                      onStar={toggleStar}
                      onEdit={setSelectedItem}
                      onDelete={handleDelete}
                      onDragStart={handleDragStart}
                    />
                  ))}
                </div>

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

// ── Card sub-component ─────────────────────────────────────────────────────────

function WorkCard({ item, category, density, densityPad, iv, userName, customFieldDefs, statusResolver, onStar, onEdit, onDelete, onDragStart }) {
  const due = dueDays(item.dueDate);
  const customVisible = customFieldDefs.filter(d => iv(`fd_${d.id}`) && item.fieldValues?.[d.id] != null);
  // Time-in-status lapse — cards surface only the attention states (at risk / breached); the
  // detail panel shows the full picture. Done items don't carry an active lapse clock.
  const statusMeta = statusResolver?.metaFor(item.type, item.status) ?? null;
  const lapse = computeLapse(item.statusChangedAt, statusMeta);
  const showLapse = category !== 'done' && (lapse.state === 'at_risk' || lapse.state === 'breached');
  const statusCat = statusResolver ? statusResolver.categoryOf(item.type, item.status) : statusToCategory(item.status);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, item.id)}
      className={cn(
        'bg-white dark:bg-neutral-700 rounded-lg shadow-sm border cursor-grab hover:shadow-md transition-shadow group',
        densityPad[density],
        item.starred ? 'border-brand-orange/40' : 'border-neutral-200 dark:border-neutral-600'
      )}
    >
      {/* Top row: ID + actions */}
      <div className="flex items-start justify-between mb-1.5">
        <span className="font-mono text-xs text-neutral-600 dark:text-neutral-400">{item.autoId || item.id}</span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onStar(item)} title={item.starred ? 'Unstar' : 'Star'}
            className={`text-xs p-0.5 transition-colors ${item.starred ? 'text-brand-orange' : 'text-neutral-300 hover:text-brand-orange'}`}>
            <Star className={`h-3.5 w-3.5 ${item.starred ? 'fill-current' : ''}`} aria-hidden="true" />
          </button>
          <button onClick={() => onEdit(item)} className="text-neutral-600 dark:text-neutral-400 hover:text-brand-navy text-xs p-0.5" aria-label="Edit work item">
            <SquarePen className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button onClick={() => onDelete(item.id)} className="text-neutral-600 dark:text-neutral-400 hover:text-semantic-danger text-xs p-0.5" aria-label="Delete work item">
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Title */}
      <button type="button"
        className="text-sm font-medium text-neutral-900 dark:text-neutral-100 leading-snug mb-2 cursor-pointer text-left w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded"
        onClick={() => onEdit(item)}>
        {item.title}
      </button>

      {/* Description (density-gated + pref-gated) */}
      {density !== 'compact' && iv('description') && item.description && (
        <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-2 line-clamp-2">{item.description}</p>
      )}

      {/* Primary meta row */}
      <div className="flex items-center justify-between">
        <TypeBadge type={item.type} compact={density === 'compact'} />
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {iv('priority') && item.priority && <PriorityBadge priority={item.priority} />}
          {iv('status') && <StatusBadge category={statusCat}>{item.status}</StatusBadge>}
          {showLapse && <LapseBadge lapse={lapse} compact />}
          {iv('storyPoints') && item.storyPoints > 0 && (
            <span className="text-xs text-neutral-600 dark:text-neutral-400 font-medium">{item.storyPoints}pt</span>
          )}
          {iv('dueDate') && due && (
            <span className={cn('text-xs font-medium', due.urgent ? 'text-semantic-danger' : 'text-semantic-warning')}>
              {due.text}
            </span>
          )}
          {iv('assignee') && item.assigneeId && <Avatar name={userName(item.assigneeId)} size={5} />}
        </div>
      </div>

      {/* Tags row (density + pref gated) */}
      {density !== 'compact' && iv('tags') && item.tags && item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {item.tags.map(t => (
            <span key={t} className="text-xs bg-neutral-100 dark:bg-neutral-600 text-neutral-600 dark:text-neutral-300 px-1.5 py-0.5 rounded">{t}</span>
          ))}
        </div>
      )}

      {/* Extra built-in fields */}
      {density !== 'compact' && (
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {iv('severity') && item.severity && (
            <span className="text-xs bg-semantic-warning/10 text-semantic-warning px-1.5 py-0.5 rounded">{item.severity}</span>
          )}
          {iv('startDate') && item.startDate && (
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              Start: {new Date(item.startDate).toLocaleDateString()}
            </span>
          )}
          {iv('businessImpact') && item.businessImpact && (
            <span className="text-xs bg-brand-navy/10 text-brand-navy px-1.5 py-0.5 rounded">{item.businessImpact}</span>
          )}
        </div>
      )}

      {/* Custom fields */}
      {customVisible.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {customVisible.map(d => (
            <span key={d.id} className="text-xs bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 px-1.5 py-0.5 rounded" title={d.name}>
              {d.name}: {String(item.fieldValues[d.id])}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
