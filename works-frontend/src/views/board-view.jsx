import { Button } from '@/components/works/button';
import { AsyncBoundary } from '@/components/works/atoms/async-boundary';
import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Star, SquarePen, X } from 'lucide-react';
import { DensityToggle } from '@/components/works/atoms/density-toggle';
import { Select } from '@/components/works/atoms/select';
import { DENSITY_PAD } from '@/lib/density';
import { BoardWipBadge } from '@/components/works/organisms/board-wip-badge';
import { WorkItemFilterBar } from '@/components/works/organisms/work-item-filter-bar';
import { BulkEditBar } from '@/components/works/organisms/bulk-edit-bar';
import { VirtualCardStack } from '@/components/works/organisms/virtual-card-stack';
import { filterItems, sortItems, EMPTY_FILTERS, DEFAULT_SORT } from '@/lib/work-item-filter';
import { GROUP_BY_OPTIONS, groupItemsIntoLanes } from '@/lib/board-swimlanes';
import { mergeRouteQueryState, routeQueryState } from '@/lib/routes';
import { TypeBadge } from '@/components/works/work-item-type';
import { Avatar } from '@/components/works/atoms/avatar';
import { CardFieldsPopover } from '@/components/works/organisms/card-fields-popover';
import { PriorityBadge } from '@/components/works/priority-badge';
import { StatusBadge } from '@/components/works/status-badge';
import { statusToCategory } from '@/components/works/status';
import { LapseBadge } from '@/components/works/atoms/lapse-badge';
import { computeLapse } from '@/lib/status-lapse';
import { cn } from '@/lib/utils';
import { absoluteDate } from '@/lib/format';
import { useI18n } from '@/lib/i18n';

// Fallback columns — used when no workflow is loaded. One column per category.
// When the active workflow is loaded, the `columns` prop provides one column per workflow status.
const FALLBACK_COLUMNS = [
  { key: 'todo',        name: 'Todo',        category: 'TO_DO',       labelKey: 'deliver.board.colTodo',       dot: 'bg-neutral-400',     limitKey: 'todoLimit' },
  { key: 'in_progress', name: 'In Progress', category: 'IN_PROGRESS', labelKey: 'deliver.board.colInProgress', dot: 'bg-brand-navy-tint',  limitKey: 'inProgressLimit' },
  { key: 'done',        name: 'Done',        category: 'DONE',        labelKey: 'deliver.board.colDone',       dot: 'bg-semantic-success', limitKey: 'doneLimit' },
];

const readInitialGroupBy = () => {
  if (typeof window === 'undefined') return 'none';
  const candidate = routeQueryState(window.location.search).groupBy;
  return GROUP_BY_OPTIONS.includes(candidate) ? candidate : 'none';
};

const replaceGroupByRouteState = (groupBy) => {
  if (typeof window === 'undefined') return;
  const nextUrl = mergeRouteQueryState(
    window.location.pathname,
    window.location.search,
    { groupBy },
    { groupBy: 'none' },
  );
  const currentUrl = `${window.location.pathname}${window.location.search}`;
  if (nextUrl !== currentUrl) {
    window.history.replaceState({ ...(window.history.state || {}), groupBy }, '', nextUrl);
  }
};


// Returns the localized due-date label + urgency for a card; `t` is the i18n translator.
function dueLabel(dateStr, t) {
  if (!dateStr) return null;
  const days = Math.ceil(
    (new Date(dateStr).setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / 86400000
  );
  if (days < 0)  return { text: `${Math.abs(days)}${t('deliver.board.overdueSuffix')}`, urgent: true };
  if (days === 0) return { text: t('deliver.board.dueToday'), urgent: true };
  return { text: `${t('deliver.board.dueInPrefix')}${days}${t('deliver.board.dueInSuffix')}`, urgent: days <= 3 };
}

export default function BoardView({
  workItems, fetchAll,
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
  // X-Total-Count from the server — may exceed workItems.length when the workspace has more items
  // than the loaded page. Passed from App.jsx to surface a "showing N of M" warning (Audit #7).
  totalWorkItemCount = null,
  setWipLimit,
  can,
  userName,
  // card field customisation
  cardPrefs,
  customFieldDefs = [],
  onCustomFieldCreated,
  workspaceId,
  statusResolver,
  currentUserId = null,
  users = [],
  onBulkEdit,
  // Workflow-derived columns (one per workflow status); falls back to FALLBACK_COLUMNS.
  columns: columnsProp,
}) {
  const { t } = useI18n();
  // When the parent supplies workflow-derived columns, use them. Otherwise fall back to the
  // three fixed category columns so the board always renders something.
  const workflowColumns = Array.isArray(columnsProp) && columnsProp.length > 0 ? columnsProp : null;
  // Normalised column list for rendering. Each entry always has: name, dot, limitKey,
  // plus either `labelKey` (fallback) or a literal `label` (workflow-derived).
  const columns = workflowColumns
    ? workflowColumns.map(col => ({
        ...col,
        key:      col.name, // unique column identity
        label:    col.name, // display label is the status name
        dot:      col.dot || 'bg-neutral-400',
        limitKey: col.limitKey || 'todoLimit',
      }))
    : FALLBACK_COLUMNS;
  const densityPad = DENSITY_PAD;
  const iv = cardPrefs?.isVisible ?? (() => true);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sort, setSort] = useState(DEFAULT_SORT);
  // Multi-select bulk edit (JIRA-style): pick cards, apply one change to all; the server re-checks
  // edit rights per item (RB-40 §1). Selection is by id so it survives filter/sort re-renders.
  const [selected, setSelected] = useState(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [groupBy, setGroupBy] = useState(readInitialGroupBy);
  const [collapsedLanes, setCollapsedLanes] = useState(() => new Set());
  const bulkEnabled = typeof onBulkEdit === 'function';
  const toggleSelect = (id) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const clearSelection = () => setSelected(new Set());
  const applyBulk = (action, value) => {
    const ids = [...selected];
    if (!ids.length) return Promise.resolve();
    setBulkBusy(true);
    return Promise.resolve(onBulkEdit(action, value, ids))
      .then(() => clearSelection())
      .finally(() => setBulkBusy(false));
  };
  // Resolve which column an item belongs to.
  // • Workflow columns: match by exact status name (each workflow status is its own column).
  // • Fallback columns: match by category (todo / in_progress / done).
  const catOf = (item) => {
    if (workflowColumns) {
      // Each column IS a specific status — bucket by exact name match.
      return item.status;
    }
    return statusResolver
      ? statusResolver.categoryOf(item.type, item.status)
      : statusToCategory(item.status);
  };
  // Apply the shared filter model once; columns then group + sort the visible subset.
  const visibleItems = filterItems(workItems, filters, currentUserId);
  const selectedItems = useMemo(
    () => workItems.filter((item) => selected.has(item.id)),
    [workItems, selected],
  );
  const parentTitle = (id) => workItems.find((item) => item.id === id)?.title || id;
  const lanes = groupItemsIntoLanes(visibleItems, groupBy, {
    userName,
    parentTitle,
    emptyLabel: groupBy === 'parent'
      ? t('deliver.board.group.noParent')
      : groupBy === 'assignee'
        ? t('deliver.board.group.unassigned')
        : t('deliver.board.group.uncategorized'),
  });

  const setBoardGroupBy = (nextGroupBy) => {
    setGroupBy(nextGroupBy);
    setCollapsedLanes(new Set());
    replaceGroupByRouteState(nextGroupBy);
  };

  const renderColumnCards = (colItems, category) => (
    <VirtualCardStack
      items={colItems}
      density={density}
      aria-label={`${category} cards`}
      emptyState={(
        <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-neutral-200 rounded-lg">
          <p className="text-xs text-neutral-600 dark:text-neutral-400">{t('deliver.board.dropItemsHere')}</p>
        </div>
      )}
      renderItem={(item) => (
        <WorkCard
          key={item.id}
          item={item}
          category={category}
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
          selectable={bulkEnabled}
          selected={selected.has(item.id)}
          onToggleSelect={toggleSelect}
        />
      )}
    />
  );

  const renderColumns = (itemsForLane, laneKey = 'all') => (
    <div className="flex gap-4 flex-1 overflow-x-auto pb-4">
      {columns.map(col => {
        // When workflow columns are active, bucket by exact status name match.
        // When fallback columns are active, bucket by category key.
        const colItems = sortItems(
          itemsForLane.filter(i => catOf(i) === col.key),
          sort,
        );
        const wipLimit = wipLimits[col.limitKey] ?? null;
        const overWip = wipLimit != null && colItems.length > wipLimit;
        // Category-based column background (design tokens - RB-30 section 1).
        const colBg = col.category === 'IN_PROGRESS'
          ? 'bg-brand-navy/5 dark:bg-neutral-800'
          : col.category === 'DONE'
            ? 'bg-semantic-success/5 dark:bg-neutral-800'
            : 'bg-neutral-100 dark:bg-neutral-800';
        return (
          <div key={`${laneKey}-${col.key}`}
            className={`flex-1 min-w-56 flex flex-col ${colBg} rounded-xl p-3 ${overWip ? 'ring-1 ring-semantic-danger/40' : ''}`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.key)}>
            <div className="mb-3 px-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${col.dot}`}
                    style={col.color ? { backgroundColor: col.color } : undefined}
                    aria-hidden="true" />
                  <h3 className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                    {col.label ?? t(col.labelKey)}
                  </h3>
                </div>
                <BoardWipBadge count={colItems.length} limit={wipLimit}
                  canEdit={can('manage_projects')} onSet={(next) => setWipLimit(col.limitKey, next)} />
              </div>
              {overWip && <p className="mt-1 text-xs font-medium text-semantic-danger">{t('deliver.board.overWipLimit')}</p>}
            </div>

            {renderColumnCards(colItems, col.key)}

            <Button unstyled onClick={() => {
              setNewItem(p => ({
                ...p,
                status: workflowColumns
                  ? col.name
                  : (statusResolver?.firstStatusOfCategory(p.type, col.key) || p.status),
              }));
              setIsCreateOpen(true);
            }}
              className="mt-2 w-full flex items-center gap-1.5 px-2 py-1.5 text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-white dark:hover:bg-neutral-700 rounded-lg transition-colors">
              <span>+</span> {t('deliver.board.addItem')}
            </Button>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-xl font-bold text-brand-navy">{t('deliver.board.title')}</h1>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
            {visibleItems.length === workItems.length
              ? `${workItems.length} ${t('deliver.board.itemsTotal')}`
              : `${visibleItems.length} / ${workItems.length} ${t('deliver.board.itemsTotal')}`}
            {totalWorkItemCount !== null && totalWorkItemCount > workItems.length && (
              <span className="ml-1 text-semantic-warning font-medium">
                {`(${t('deliver.board.showing')} ${workItems.length} ${t('deliver.board.of')} ${totalWorkItemCount})`}
              </span>
            )}
            {totalWorkItemCount !== null && totalWorkItemCount > workItems.length && (
              <Button unstyled
                type="button"
                onClick={() => fetchAll(Math.ceil(workItems.length / 200), 200)}
                className="ml-2 text-xs font-medium text-brand-navy hover:underline focus:outline-none"
              >
                Load More
              </Button>
            )}

          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs font-medium text-neutral-600 dark:text-neutral-400">
            <span>{t('deliver.board.groupBy')}</span>
            <Select
              selectSize="sm"
              value={groupBy}
              onChange={(event) => {
                setBoardGroupBy(event.target.value);
              }}
              aria-label={t('deliver.board.groupBy')}
              className="min-w-32"
            >
              {GROUP_BY_OPTIONS.map((option) => (
                <option key={option} value={option}>{t(`deliver.board.group.${option}`)}</option>
              ))}
            </Select>
          </label>
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
          <DensityToggle density={density} setDensity={setDensity} />
        </div>
      </div>

      <div className="mb-4">
        <WorkItemFilterBar
          items={workItems}
          filters={filters}
          onFiltersChange={setFilters}
          sort={sort}
          onSortChange={setSort}
          userName={userName}
        />
      </div>

      {bulkEnabled && selected.size > 0 && (
        <div className="mb-4">
          <BulkEditBar
            count={selected.size}
            users={users}
            busy={bulkBusy}
            selectedItems={selectedItems}
            userName={userName}
            onApply={applyBulk}
            onClear={clearSelection}
          />
        </div>
      )}

      {loading ? (
        <AsyncBoundary loading label={t('deliver.board.loadingBoard')} className="flex gap-4 flex-1 overflow-x-auto pb-4" skeleton={<>
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
        </>} />
      ) : groupBy === 'none' ? (
        <div className="flex gap-4 flex-1 overflow-x-auto pb-4">
          {columns.map(col => {
            // When workflow columns are active, bucket by exact status name match.
            // When fallback columns are active, bucket by category key.
            const colItems = sortItems(
              visibleItems.filter(i => catOf(i) === col.key),
              sort,
            );
            const wipLimit = wipLimits[col.limitKey] ?? null;
            const overWip = wipLimit != null && colItems.length > wipLimit;
            // Category-based column background (design tokens — RB-30 §1).
            const colBg = col.category === 'IN_PROGRESS'
              ? 'bg-brand-navy/5 dark:bg-neutral-800'
              : col.category === 'DONE'
                ? 'bg-semantic-success/5 dark:bg-neutral-800'
                : 'bg-neutral-100 dark:bg-neutral-800';
            return (
              <div key={col.key}
                className={`flex-1 min-w-56 flex flex-col ${colBg} rounded-xl p-3 ${overWip ? 'ring-1 ring-semantic-danger/40' : ''}`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.key)}>
                <div className="mb-3 px-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${col.dot}`}
                        style={col.color ? { backgroundColor: col.color } : undefined}
                        aria-hidden="true" />
                      <h3 className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                        {col.label ?? t(col.labelKey)}
                      </h3>
                    </div>
                    <BoardWipBadge count={colItems.length} limit={wipLimit}
                      canEdit={can('manage_projects')} onSet={(next) => setWipLimit(col.limitKey, next)} />
                  </div>
                  {overWip && <p className="mt-1 text-xs font-medium text-semantic-danger">{t('deliver.board.overWipLimit')}</p>}
                </div>

                {renderColumnCards(colItems, col.key)}

                <Button unstyled onClick={() => {
                  // Workflow columns: col.name IS the concrete target status.
                  // Category fallback: resolve the first status of the category via statusResolver.
                  setNewItem(p => ({
                    ...p,
                    status: workflowColumns
                      ? col.name
                      : (statusResolver?.firstStatusOfCategory(p.type, col.key) || p.status),
                  }));
                  setIsCreateOpen(true);
                }}
                  className="mt-2 w-full flex items-center gap-1.5 px-2 py-1.5 text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-white dark:hover:bg-neutral-700 rounded-lg transition-colors">
                  <span>+</span> {t('deliver.board.addItem')}
                </Button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-4">
            {lanes.map((lane) => {
              const collapsed = collapsedLanes.has(lane.key);
              return (
                <section key={lane.key} className="min-w-full">
                  <Button unstyled
                    type="button"
                    onClick={() => setCollapsedLanes((prev) => {
                      const next = new Set(prev);
                      if (next.has(lane.key)) next.delete(lane.key); else next.add(lane.key);
                      return next;
                    })}
                    className="mb-2 flex items-center gap-2 rounded-md px-1 py-1 text-sm font-semibold text-brand-navy hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-800"
                    aria-expanded={!collapsed}
                  >
                    {collapsed
                      ? <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
                    <span>{lane.label}</span>
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
                      {lane.items.length}
                    </span>
                  </Button>
                  {!collapsed && renderColumns(lane.items, lane.key)}
                </section>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Card sub-component ─────────────────────────────────────────────────────────

function WorkCard({ item, category, density, densityPad, iv, userName, customFieldDefs, statusResolver, onStar, onEdit, onDelete, onDragStart, selectable = false, selected = false, onToggleSelect }) {
  const { t } = useI18n();
  const due = dueLabel(item.dueDate, t);
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
        selected ? 'border-brand-navy ring-1 ring-brand-navy-tint/40' : item.starred ? 'border-brand-orange/40' : 'border-neutral-200 dark:border-neutral-600'
      )}
    >
      {/* Top row: ID + actions */}
      <div className="flex items-start justify-between mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          {selectable && (
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggleSelect(item.id)}
              onClick={(e) => e.stopPropagation()}
              aria-label={t('deliver.bulk.selectItem')}
              className={cn('h-3.5 w-3.5 flex-shrink-0 accent-brand-navy cursor-pointer', selected ? '' : 'opacity-0 group-hover:opacity-100 transition-opacity')}
            />
          )}
          <span className="font-mono text-xs text-neutral-600 dark:text-neutral-400">{item.autoId || item.id}</span>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button unstyled onClick={() => onStar(item)} title={item.starred ? t('deliver.board.unstar') : t('deliver.board.star')}
            className={`text-xs p-0.5 transition-colors ${item.starred ? 'text-brand-orange' : 'text-neutral-300 hover:text-brand-orange'}`}>
            <Star className={`h-3.5 w-3.5 ${item.starred ? 'fill-current' : ''}`} aria-hidden="true" />
          </Button>
          <Button unstyled onClick={() => onEdit(item)} className="text-neutral-600 dark:text-neutral-400 hover:text-brand-navy text-xs p-0.5" aria-label={t('deliver.board.editWorkItem')}>
            <SquarePen className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
          <Button unstyled onClick={() => onDelete(item.id)} className="text-neutral-600 dark:text-neutral-400 hover:text-semantic-danger text-xs p-0.5" aria-label={t('deliver.board.deleteWorkItem')}>
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* Title */}
      <Button unstyled type="button"
        className="text-sm font-medium text-neutral-900 dark:text-neutral-100 leading-snug mb-2 cursor-pointer text-left w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded"
        onClick={() => onEdit(item)}>
        {item.title}
      </Button>

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
              {t('deliver.board.startPrefix')}{absoluteDate(item.startDate)}
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
