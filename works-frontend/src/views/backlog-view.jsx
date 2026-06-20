import { useCallback, useEffect, useRef, useState } from 'react';
import { FileText } from 'lucide-react';
import { Button } from '@/components/works/button';
import { EmptyState } from '@/components/works/atoms/empty-state';
import { WorkItemFilterBar } from '@/components/works/organisms/work-item-filter-bar';
import { filterItems, sortItems, EMPTY_FILTERS, DEFAULT_SORT } from '@/lib/work-item-filter';
import { Skeleton, ListSkeleton } from '@/components/works/atoms/skeleton';
import { TypeBadge } from '@/components/works/work-item-type';
import { PriorityBadge } from '@/components/works/priority-badge';
import { Avatar } from '@/components/works/atoms/avatar';
import { statusToCategory } from '@/components/works/status';
import { useI18n } from '@/lib/i18n';
import { absoluteDate } from '@/lib/format';
import { InlineQuickAdd } from '@/components/works/molecules/inline-quick-add';
import { PageLayout } from '@/components/works/templates/page-layout';

/**
 * BacklogView — product backlog with epic rail, sprint sections, drag-drop reorder.
 *
 * Extracted from App.jsx (TD-003). All state lives in App; this component is a
 * pure rendering shell that accepts handlers as props.
 */
export default function BacklogView({
  loading = false,
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
  cardPrefs,
  statusResolver,
  currentUserId = null,
  // Inline quick-add (WI-13): async fn({ title, type }) → item; keep the full dialog as power path
  onInlineCreate = null,
}) {
  const { t } = useI18n();
  const iv = cardPrefs?.isVisible ?? (() => true);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sort, setSort] = useState(DEFAULT_SORT);
  const [focusedIdx, setFocusedIdx] = useState(null);
  const focusedIdxRef = useRef(null);
  const visibleBacklogRef = useRef([]);

  // ── Inline quick-add state ────────────────────────────────────────────────
  const [showInlineAdd, setShowInlineAdd] = useState(false);
  const [inlineSaving, setInlineSaving] = useState(false);
  const [inlineError, setInlineError] = useState(null);

  const openInlineAdd = useCallback(() => {
    if (onInlineCreate) setShowInlineAdd(true);
  }, [onInlineCreate]);

  // N / + shortcut: activate the inline row when focus is NOT in a form control
  useEffect(() => {
    if (!onInlineCreate) return;
    function handler(e) {
      const tag = e.target?.tagName;
      const isEditing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable;
      if (isEditing) return;
      if (e.key === 'n' || e.key === 'N' || e.key === '+') {
        e.preventDefault();
        setShowInlineAdd(true);
      }
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onInlineCreate]);

  async function handleInlineSave(formData) {
    setInlineError(null);
    setInlineSaving(true);
    try {
      await onInlineCreate(formData);
      setShowInlineAdd(false);
    } catch (err) {
      setInlineError(err?.message || 'Could not create item — please try again.');
    } finally {
      setInlineSaving(false);
    }
  }

  function handleInlineCancel() {
    setShowInlineAdd(false);
    setInlineError(null);
  }
  const userName = (id) => users.find(u => u.id === id)?.fullName || id;
  // Filter + sort the backlog list with the shared model (same bar as the Board). Sort defaults to
  // 'Manual', preserving the drag-drop backlog_order until the user opts into a sort.
  const visibleBacklog = sortItems(filterItems(backlogItems, filters, currentUserId), sort);
  // An item counts as "done" by its status's resolved board category, not a literal "Done"
  // string — so custom / renamed done statuses (Completed, Closed, …) roll up correctly.
  const isDone = (item) => (statusResolver
    ? statusResolver.categoryOf(item.type, item.status)
    : statusToCategory(item.status)) === 'done';
  const onPressKey = (e) => { if (e.key === 'Enter' || e.key === ' ') e.currentTarget.click(); };

  // Keep refs current for the stable keydown handler (ref updates in effects, not render phase).
  useEffect(() => { visibleBacklogRef.current = visibleBacklog; });
  useEffect(() => { focusedIdxRef.current = focusedIdx; }, [focusedIdx]);

  // Clear list focus whenever filter or sort changes. Both setters are called from callbacks
  // (not from an effect body), so batching applies and only one re-render is triggered.
  const handleFiltersChange = useCallback((f) => { setFilters(f); setFocusedIdx(null); }, []);
  const handleSortChange = useCallback((s) => { setSort(s); setFocusedIdx(null); }, []);

  // j/k/ArrowUp/ArrowDown — navigate the backlog list; Enter/e — open focused item.
  useEffect(() => {
    function handler(e) {
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable) return;
      const list = visibleBacklogRef.current;
      const cur = focusedIdxRef.current;
      if (e.key === 'j' || e.key === 'ArrowDown') {
        if (list.length === 0) return;
        e.preventDefault();
        const next = cur === null ? 0 : Math.min(cur + 1, list.length - 1);
        focusedIdxRef.current = next;
        setFocusedIdx(next);
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        if (list.length === 0) return;
        e.preventDefault();
        const next = cur === null ? 0 : Math.max(cur - 1, 0);
        focusedIdxRef.current = next;
        setFocusedIdx(next);
      } else if ((e.key === 'Enter' || e.key === 'e') && cur !== null) {
        const item = list[cur];
        if (item) { e.preventDefault(); setSelectedItem(item); }
      } else if (e.key === 'Escape' && cur !== null) {
        e.preventDefault();
        focusedIdxRef.current = null;
        setFocusedIdx(null);
      }
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [setSelectedItem]);

  if (loading && backlogItems.length === 0 && sprints.length === 0) {
    return (
      <PageLayout header={null}>
        <Skeleton className="h-7 w-32 mb-6" />
        <ListSkeleton rows={6} />
      </PageLayout>
    );
  }

  return (
    <PageLayout header={null}>
      <div className="flex gap-6">
        {/* Epic panel — sticky left rail with per-epic progress */}
        <aside className="hidden lg:block w-56 flex-shrink-0">
          <div className="sticky top-6 rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-800">
            <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-neutral-600">{t('deliver.backlog.epics')}</p>
            {workItems.filter(i => i.type === 'EPIC').length === 0 ? (
              <p className="px-1 text-xs text-neutral-600 dark:text-neutral-400">{t('deliver.backlog.noEpics')}</p>
            ) : (
              <ul className="space-y-1">
                {workItems.filter(i => i.type === 'EPIC').map(epic => {
                  const kids = workItems.filter(i => i.parentId === epic.id);
                  const done = kids.filter(isDone).length;
                  const pct = kids.length ? Math.round((done / kids.length) * 100) : 0;
                  return (
                    <li key={epic.id}>
                      <button type="button" onClick={() => setSelectedItem(epic)}
                        className="w-full rounded-md px-2 py-1.5 text-left transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40">
                        <span className="block truncate text-xs font-medium text-neutral-900 dark:text-neutral-100">{epic.title}</span>
                        <span className="mt-1 block h-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-700">
                          <span className="block h-full rounded-full bg-semantic-success" style={{ width: `${pct}%` }} />
                        </span>
                        <span className="mt-0.5 block text-xs text-neutral-600 dark:text-neutral-400">{done}/{kids.length} {t('deliver.backlog.doneSuffix')} · {pct}%</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="flex justify-between items-center mb-5">
            <div>
              <h1 className="text-xl font-bold text-brand-navy">{t('deliver.backlog.title')}</h1>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">{backlogItems.length} {t('deliver.backlog.itemsNotInSprint')}</p>
            </div>
            <div className="flex gap-2 items-center">
              <label className="flex items-center gap-1.5 cursor-pointer mr-2">
                <input type="checkbox" checked={refinementMode} onChange={e => setRefinementMode(e.target.checked)} className="w-3 h-3 accent-brand-navy" />
                <span className="text-xs text-neutral-600 font-medium">{t('deliver.backlog.refinementMode')}</span>
              </label>
              <Button variant="secondary" size="sm" onClick={() => setIsSprintOpen(true)}>{t('deliver.backlog.newSprint')}</Button>
              {onInlineCreate && (
              <Button variant="secondary" size="sm" onClick={openInlineAdd} aria-label="Inline quick-add (N / +)">
                + Quick add
              </Button>
            )}
            <Button variant="action" size="sm" onClick={() => setIsCreateOpen(true)}>{t('deliver.backlog.addItem')}</Button>
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
                    {sprint.startDate && <span className="text-xs text-neutral-600 dark:text-neutral-400 hidden md:inline">{absoluteDate(sprint.startDate)} → {absoluteDate(sprint.endDate)}</span>}
                    {sprint.status === 'PLANNING' && <Button size="sm" variant="secondary" onClick={() => handleSprintStatusChange(sprint.id, 'ACTIVE')}>{t('deliver.backlog.startSprint')}</Button>}
                    {sprint.status === 'ACTIVE' && <Button size="sm" variant="secondary" onClick={() => handleSprintStatusChange(sprint.id, 'COMPLETED')}>{t('deliver.backlog.complete')}</Button>}
                  </div>
                </div>
                <SprintItemList sprintId={sprint.id} users={users} onMoveToBacklog={(id) => handleMoveToBacklog(id, sprint.id)} onSelect={setSelectedItem} />
              </div>
            );
          })}

          {/* Filter + sort bar (shared with the Board) — scopes the backlog list below */}
          <div className="mb-3">
            <WorkItemFilterBar
              items={backlogItems}
              filters={filters}
              onFiltersChange={handleFiltersChange}
              sort={sort}
              onSortChange={handleSortChange}
              userName={userName}
            />
          </div>

          {/* Backlog items with drag-drop reorder */}
          <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-100 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900">
              <h3 className="font-semibold text-neutral-900">{t('deliver.backlog.title')}</h3>
              <span className="text-xs text-neutral-600 dark:text-neutral-400">
                {visibleBacklog.length === backlogItems.length
                  ? `${backlogItems.length} ${t('deliver.backlog.items')}`
                  : `${visibleBacklog.length} / ${backlogItems.length} ${t('deliver.backlog.items')}`}
              </span>
            </div>
            {showInlineAdd && (
              <InlineQuickAdd
                onSave={handleInlineSave}
                onCancel={handleInlineCancel}
                saving={inlineSaving}
                error={inlineError}
              />
            )}
            {backlogItems.length === 0 && !showInlineAdd
              ? <EmptyState icon={FileText} title={t('deliver.backlog.emptyTitle')} subtitle={t('deliver.backlog.emptySubtitle')} action={<Button variant="action" size="sm" onClick={() => setIsCreateOpen(true)}>{t('deliver.backlog.addToBacklog')}</Button>} />
              : visibleBacklog.length === 0 && !showInlineAdd
              ? <p className="px-5 py-8 text-center text-sm text-neutral-600 dark:text-neutral-400">{t('deliver.filter.noMatches')}</p>
              : visibleBacklog.map((item, idx) => {
                const isFocused = focusedIdx === idx;
                return (
                <div key={item.id}
                  aria-current={isFocused ? 'true' : undefined}
                  draggable onDragStart={(e) => handleBacklogDragStart(e, item.id)}
                  onDragOver={(e) => { e.preventDefault(); setDragOverId(item.id); }}
                  onDragLeave={() => setDragOverId(null)}
                  onDrop={(e) => handleBacklogDrop(e, item.id)}
                  className={`flex items-center gap-3 px-5 py-3 border-b border-neutral-50 dark:border-neutral-700 last:border-0 group transition-colors ${isFocused ? 'bg-brand-navy/5 dark:bg-brand-navy/10 border-l-2 border-l-brand-navy' : `hover:bg-neutral-50 dark:hover:bg-neutral-700${dragOverId === item.id ? ' border-t-2 border-t-brand-navy bg-brand-navy/5' : ''}`}`}>
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
                        placeholder={t('deliver.backlog.ptsPlaceholder')} />
                    </div>
                  ) : (
                    <>
                      {iv('priority') && <PriorityBadge priority={item.priority} />}
                      {iv('storyPoints') && (item.storyPoints > 0) && <span className="text-xs bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 px-1.5 py-0.5 rounded">{item.storyPoints}pt</span>}
                      {iv('dueDate') && item.dueDate && <span className="text-xs text-semantic-warning">{absoluteDate(item.dueDate)}</span>}
                    </>
                  )}
                  {iv('assignee') && item.assigneeId && <Avatar name={users.find(u => u.id === item.assigneeId)?.fullName || ''} size={6} />}
                  {sprints.filter(s => s.status !== 'COMPLETED').length > 0 && (
                    <select className="opacity-0 group-hover:opacity-100 text-xs border border-neutral-200 rounded px-1 py-0.5 text-neutral-600 transition-opacity"
                      onChange={e => e.target.value && handleMoveToSprint(item.id, e.target.value)} defaultValue="">
                      <option value="" disabled>{t('deliver.backlog.toSprint')}</option>
                      {sprints.filter(s => s.status !== 'COMPLETED').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  )}
                </div>
                );
              })
            }
            {visibleBacklog.length > 0 && (
              <p className="border-t border-neutral-100 dark:border-neutral-700 px-5 py-1.5 text-right text-xs text-neutral-400 dark:text-neutral-600 select-none">
                <kbd className="font-mono">j/k</kbd> navigate · <kbd className="font-mono">Enter</kbd> open · <kbd className="font-mono">Esc</kbd> clear
              </p>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
