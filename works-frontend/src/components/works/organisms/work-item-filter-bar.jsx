import { useEffect, useMemo, useRef, useState } from 'react';
import { ListFilter, ArrowUpDown, ArrowUp, ArrowDown, Check, ChevronDown, X, Search } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { buildFilterOptions, countActiveFilters, UNASSIGNED } from '@/lib/work-item-filter';

const SORT_FIELDS = ['none', 'priority', 'dueDate', 'created', 'updated', 'title'];

// A small multi-select popover (checkbox list) used for each filter dimension. Closes on
// outside-click, mirrors the CardFieldsPopover interaction pattern (RB-30 §5 — one pattern).
function MultiSelect({ label, selected, options, onToggle, renderOption }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);
  const count = selected.length;
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors',
          count > 0
            ? 'border-brand-navy-tint/40 bg-brand-navy-tint/10 text-brand-navy dark:text-white'
            : 'border-neutral-200 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700'
        )}
      >
        <span>{label}</span>
        {count > 0 && <span className="rounded-full bg-brand-navy px-1.5 text-xs font-semibold text-white">{count}</span>}
        <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      {open && (
        <div role="listbox" className="absolute z-overlay mt-1 max-h-64 w-52 overflow-auto rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-1 shadow-lg">
          {options.length === 0 && <p className="px-2 py-2 text-xs text-neutral-500">—</p>}
          {options.map((opt) => {
            const isSel = selected.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSel}
                onClick={() => onToggle(opt.value)}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-neutral-900 dark:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-700 focus-visible:outline-none focus-visible:bg-neutral-50 dark:focus-visible:bg-neutral-700"
              >
                <span className={cn('flex h-4 w-4 items-center justify-center rounded border', isSel ? 'border-brand-navy bg-brand-navy text-white' : 'border-neutral-300 dark:border-neutral-600')}>
                  {isSel && <Check className="h-3 w-3" aria-hidden="true" />}
                </span>
                <span className="truncate">{renderOption ? renderOption(opt) : opt.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Shared filter + sort toolbar for the Deliver surfaces. Derives its option lists from the items
 * on screen (so it only offers values that exist) and reports changes via `onFiltersChange` /
 * `onSortChange`. Stateless aside from popover open state — the active filter/sort lives in the parent.
 */
export function WorkItemFilterBar({ items = [], filters, onFiltersChange, sort, onSortChange, userName = (id) => id }) {
  const { t } = useI18n();
  const opts = useMemo(() => buildFilterOptions(items, userName), [items, userName]);
  const active = countActiveFilters(filters);

  const toggle = (group, value) => {
    const cur = filters[group] || [];
    const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
    onFiltersChange({ ...filters, [group]: next });
  };
  const clearAll = () => onFiltersChange({ search: '', assignees: [], types: [], priorities: [], mine: false });

  const assigneeOptions = opts.assignees.map((a) => ({
    value: a.id,
    label: a.id === UNASSIGNED ? t('deliver.filter.unassigned') : a.label,
  }));
  const typeOptions = opts.types.map((ty) => ({ value: ty, label: ty }));
  const priorityOptions = opts.priorities.map((p) => ({ value: p, label: p }));

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Text search */}
      <div className="flex items-center gap-1.5 rounded-md border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-2 focus-within:border-brand-navy-tint">
        <Search className="h-3.5 w-3.5 text-neutral-400" aria-hidden="true" />
        <input
          type="search"
          value={filters.search || ''}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          placeholder={t('deliver.filter.search')}
          aria-label={t('deliver.filter.search')}
          className="w-36 bg-transparent py-1.5 text-xs focus:outline-none text-neutral-900 dark:text-neutral-100"
        />
      </div>

      {/* My items quick toggle */}
      <button
        type="button"
        onClick={() => onFiltersChange({ ...filters, mine: !filters.mine })}
        aria-pressed={!!filters.mine}
        className={cn(
          'rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors',
          filters.mine
            ? 'border-brand-navy-tint/40 bg-brand-navy-tint/10 text-brand-navy dark:text-white'
            : 'border-neutral-200 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700'
        )}
      >
        {t('deliver.filter.mine')}
      </button>

      <MultiSelect label={t('deliver.filter.assignee')} selected={filters.assignees || []} options={assigneeOptions} onToggle={(v) => toggle('assignees', v)} />
      <MultiSelect label={t('deliver.filter.type')} selected={filters.types || []} options={typeOptions} onToggle={(v) => toggle('types', v)} />
      <MultiSelect label={t('deliver.filter.priority')} selected={filters.priorities || []} options={priorityOptions} onToggle={(v) => toggle('priorities', v)} />

      {/* Sort */}
      <div className="flex items-center gap-1 rounded-md border border-neutral-200 dark:border-neutral-600 px-1">
        <ArrowUpDown className="h-3.5 w-3.5 text-neutral-400 ml-1" aria-hidden="true" />
        <select
          value={sort.field}
          onChange={(e) => onSortChange({ ...sort, field: e.target.value })}
          aria-label={t('deliver.filter.sortBy')}
          className="bg-transparent py-1.5 text-xs text-neutral-700 dark:text-neutral-300 focus:outline-none"
        >
          {SORT_FIELDS.map((f) => <option key={f} value={f}>{t(`deliver.filter.sort.${f}`)}</option>)}
        </select>
        {sort.field !== 'none' && (
          <button
            type="button"
            onClick={() => onSortChange({ ...sort, dir: sort.dir === 'asc' ? 'desc' : 'asc' })}
            aria-label={sort.dir === 'asc' ? t('deliver.filter.sortAsc') : t('deliver.filter.sortDesc')}
            className="rounded p-1 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
          >
            {sort.dir === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>

      {active > 0 && (
        <button
          type="button"
          onClick={clearAll}
          className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-semantic-danger"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          {t('deliver.filter.clear')} ({active})
        </button>
      )}

      <span className="sr-only" aria-live="polite">
        <ListFilter className="h-3 w-3" aria-hidden="true" />{active}
      </span>
    </div>
  );
}

export default WorkItemFilterBar;
