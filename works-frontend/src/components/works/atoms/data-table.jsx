import * as React from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, SlidersHorizontal, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVirtualList } from '@/hooks/use-virtual-list';
import { DENSITY_ROW_Y } from '@/lib/density';
import { Popover } from '@/components/works/atoms/popover';
import { Button } from '@/components/works/button';
import { nextSortModel, sortPriority, sortDirOf, moveColumn } from '@/lib/data-table-sort';

// Atom — base data table (WI-04) + premium upgrade (WI-33). Handles: column headers with sort
// indicators, zebra rows, empty/loading states, opt-in virtual scrolling for large row sets, and
// the premium opt-ins below — all backward-compatible (every new prop is off by default).
//
//   • density        'compact' | 'comfortable' | 'spacious' — row cell padding (DENSITY_ROW_Y).
//   • multiSort       enable shift-click secondary sorts; model is [{key,dir}] in priority order.
//                     sortModel / onSortModelChange control it (uncontrolled if onSortModelChange
//                     is omitted and sortModel is undefined). The legacy single-sort path
//                     (sortKey/sortDir/onSort) is used when multiSort is false — unchanged.
//   • columnControls  render a "Columns" menu to show/hide and reorder columns. Uncontrolled by
//                     default (internal state seeded from defaultHidden/order); pass columnState +
//                     onColumnStateChange to control.
//   • inline edit     a column with `editable: true` becomes click-to-edit; commit on Enter/blur,
//                     cancel on Escape, via onCellEdit(row, key, value).
//
// columns: Array<{ key, label, sortable?, align?, width?, editable? }>. renderCell(key, row)
// renders a display cell; falls back to row[key].

function SortIcon({ dir, priority, multi }) {
  const icon = dir === 'asc'
    ? <ChevronUp className="ml-1 h-3.5 w-3.5 shrink-0 text-brand-navy" aria-hidden="true" />
    : dir === 'desc'
      ? <ChevronDown className="ml-1 h-3.5 w-3.5 shrink-0 text-brand-navy" aria-hidden="true" />
      : <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-30" aria-hidden="true" />;
  return (
    <span className="inline-flex items-center">
      {icon}
      {multi && priority > 0 && (
        <span className="ml-0.5 text-2xs font-bold text-brand-navy tabular-nums">{priority}</span>
      )}
    </span>
  );
}

// Editable cell — click to edit, Enter/blur commit, Escape cancel.
function EditableCell({ value, onCommit, align }) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value);
  const inputRef = React.useRef(null);

  React.useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commit = () => { setEditing(false); if (draft !== value) onCommit(draft); };
  const cancel = () => { setEditing(false); setDraft(value); };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft ?? ''}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commit(); }
          else if (e.key === 'Escape') { e.preventDefault(); cancel(); }
        }}
        className="w-full rounded-sm border border-brand-navy-tint bg-white px-1.5 py-0.5 text-sm text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 dark:bg-neutral-800 dark:text-neutral-100"
      />
    );
  }
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); setDraft(value); setEditing(true); }}
      className={cn(
        'w-full rounded-sm px-1 py-0.5 text-sm text-neutral-900 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 dark:text-neutral-100 dark:hover:bg-neutral-700',
        align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
      )}
    >
      {value ?? '—'}
    </button>
  );
}

export function DataTable({
  columns = [],
  rows = [],
  renderCell,
  sortKey,
  sortDir = 'asc',
  onSort,
  loading = false,
  empty,
  caption,
  className,
  rowKey = 'id',
  onRowClick,
  virtualThreshold = 100,
  maxHeight = '37.5rem',
  density = 'comfortable',
  // premium opt-ins (WI-33)
  multiSort = false,
  sortModel: sortModelProp,
  onSortModelChange,
  columnControls = false,
  columnState: columnStateProp,
  onColumnStateChange,
  defaultHidden = [],
  onCellEdit,
  ...props
}) {
  const rowPad = DENSITY_ROW_Y[density] ?? DENSITY_ROW_Y.comfortable;

  // ── Sort model ──────────────────────────────────────────────────────────
  // In multi-sort mode the table works off a [{key,dir}] model; in legacy mode it is derived from
  // the single sortKey/sortDir props so existing callers are untouched.
  const [internalModel, setInternalModel] = React.useState(sortModelProp ?? []);
  const effectiveModel = multiSort
    ? (sortModelProp ?? internalModel)
    : (sortKey ? [{ key: sortKey, dir: sortDir }] : []);

  function handleSort(col) {
    if (!col.sortable) return;
    if (multiSort) {
      const additive = false; // plain click; shift handled below
      const next = nextSortModel(effectiveModel, col.key, additive);
      if (onSortModelChange) onSortModelChange(next); else setInternalModel(next);
    } else if (onSort) {
      const next = sortKey === col.key && sortDir === 'asc' ? 'desc' : 'asc';
      onSort(col.key, next);
    }
  }
  function handleSortKeyboard(e, col) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    if (!col.sortable) return;
    if (multiSort) {
      const next = nextSortModel(effectiveModel, col.key, e.shiftKey);
      if (onSortModelChange) onSortModelChange(next); else setInternalModel(next);
    } else {
      handleSort(col);
    }
  }
  function handleSortClick(e, col) {
    if (multiSort && e.shiftKey && col.sortable) {
      const next = nextSortModel(effectiveModel, col.key, true);
      if (onSortModelChange) onSortModelChange(next); else setInternalModel(next);
      return;
    }
    handleSort(col);
  }

  // ── Column visibility + order ───────────────────────────────────────────
  const allKeys = columns.map((c) => c.key);
  const [internalColState, setInternalColState] = React.useState(() => ({
    order: columnStateProp?.order ?? allKeys,
    hidden: columnStateProp?.hidden ?? defaultHidden,
  }));
  const colState = columnStateProp ?? internalColState;
  const setColState = (next) => {
    if (onColumnStateChange) onColumnStateChange(next); else setInternalColState(next);
  };
  const hiddenSet = new Set(colState.hidden);
  // Effective, ordered, visible columns. Falls back to source order for any key missing from order.
  const orderedKeys = [...colState.order.filter((k) => allKeys.includes(k)),
    ...allKeys.filter((k) => !colState.order.includes(k))];
  const visibleColumns = orderedKeys
    .map((k) => columns.find((c) => c.key === k))
    .filter((c) => c && !hiddenSet.has(c.key));

  const toggleHidden = (key) => {
    const hidden = hiddenSet.has(key)
      ? colState.hidden.filter((k) => k !== key)
      : [...colState.hidden, key];
    setColState({ ...colState, hidden });
  };
  const reorder = (key, delta) => setColState({ ...colState, order: moveColumn(orderedKeys, key, delta) });

  const alignClass = (align) =>
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

  const virtualMode = !loading && rows.length > virtualThreshold;
  const { parentRef, virtualRows, totalSize } = useVirtualList({ count: rows.length, estimateSize: 48 });
  const paddingTop = virtualMode && virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom = virtualMode && virtualRows.length > 0
    ? totalSize - (virtualRows[virtualRows.length - 1].start + virtualRows[virtualRows.length - 1].size)
    : 0;
  const displayRows = virtualMode ? virtualRows.map((vr) => rows[vr.index]) : rows;

  const thead = (
    <thead className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700">
      <tr>
        {visibleColumns.map((col) => {
          const dir = sortDirOf(effectiveModel, col.key);
          return (
            <th
              key={col.key}
              scope="col"
              aria-sort={col.sortable ? (dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : 'none') : undefined}
              style={col.width ? { width: col.width } : undefined}
              className={cn(
                'px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-500',
                alignClass(col.align),
                col.sortable && 'cursor-pointer select-none hover:text-neutral-900 dark:hover:text-neutral-100'
              )}
              tabIndex={col.sortable ? 0 : undefined}
              onClick={(e) => handleSortClick(e, col)}
              onKeyDown={(e) => handleSortKeyboard(e, col)}
            >
              <span className="inline-flex items-center">
                {col.label}
                {col.sortable && <SortIcon dir={dir} priority={sortPriority(effectiveModel, col.key)} multi={multiSort} />}
              </span>
            </th>
          );
        })}
      </tr>
    </thead>
  );

  const renderBodyCell = (col, row) => {
    if (col.editable && onCellEdit) {
      return (
        <EditableCell
          value={renderCell ? renderCell(col.key, row) : row[col.key]}
          align={col.align}
          onCommit={(value) => onCellEdit(row, col.key, value)}
        />
      );
    }
    return renderCell ? renderCell(col.key, row) : (row[col.key] ?? '—');
  };

  const tbody = (
    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
      {loading ? (
        Array.from({ length: 4 }).map((_, i) => (
          <tr key={i} aria-hidden="true">
            {visibleColumns.map((col) => (
              <td key={col.key} className={cn('px-4', rowPad)}>
                <div className="h-3.5 rounded bg-neutral-100 dark:bg-neutral-700 animate-pulse" style={{ width: `${50 + (i * 13 + col.key.length * 7) % 40}%` }} />
              </td>
            ))}
          </tr>
        ))
      ) : rows.length === 0 ? (
        <tr>
          <td colSpan={visibleColumns.length} className="px-4 py-12 text-center text-neutral-400 text-sm">
            {empty ?? 'No data'}
          </td>
        </tr>
      ) : (
        <>
          {virtualMode && paddingTop > 0 && <tr style={{ height: `${paddingTop}px` }} aria-hidden="true" />}
          {displayRows.map((row, i) => {
            const originalIndex = virtualMode ? virtualRows[i].index : i;
            return (
              <tr
                key={row[rowKey] ?? originalIndex}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  'transition-colors duration-fast',
                  originalIndex % 2 === 1 && 'bg-neutral-50/50 dark:bg-neutral-800/30',
                  onRowClick && 'cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700/50'
                )}
              >
                {visibleColumns.map((col) => (
                  <td key={col.key} className={cn('px-4 text-neutral-900 dark:text-neutral-100', rowPad, alignClass(col.align))}>
                    {renderBodyCell(col, row)}
                  </td>
                ))}
              </tr>
            );
          })}
          {virtualMode && paddingBottom > 0 && <tr style={{ height: `${paddingBottom}px` }} aria-hidden="true" />}
        </>
      )}
    </tbody>
  );

  const columnMenu = columnControls && (
    <div className="mb-2 flex justify-end">
      <Popover
        align="end"
        trigger={
          <Button variant="secondary" size="sm" leftIcon={<SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />}>
            Columns
          </Button>
        }
        contentClassName="w-56 p-2"
      >
        <ul className="space-y-0.5">
          {orderedKeys.map((key, idx) => {
            const col = columns.find((c) => c.key === key);
            if (!col) return null;
            return (
              <li key={key} className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-700">
                <label className="flex flex-1 items-center gap-2 text-sm text-neutral-900 dark:text-neutral-100">
                  <input
                    type="checkbox"
                    checked={!hiddenSet.has(key)}
                    onChange={() => toggleHidden(key)}
                    className="h-3.5 w-3.5 accent-brand-navy"
                  />
                  {col.label}
                </label>
                <button type="button" onClick={() => reorder(key, -1)} disabled={idx === 0}
                  aria-label={`Move ${col.label} up`}
                  className="rounded p-0.5 text-neutral-500 hover:text-brand-navy disabled:opacity-30 disabled:hover:text-neutral-500">
                  <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <button type="button" onClick={() => reorder(key, 1)} disabled={idx === orderedKeys.length - 1}
                  aria-label={`Move ${col.label} down`}
                  className="rounded p-0.5 text-neutral-500 hover:text-brand-navy disabled:opacity-30 disabled:hover:text-neutral-500">
                  <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      </Popover>
    </div>
  );

  const tableEl = (
    <table className="w-full text-sm" aria-busy={loading || undefined}>
      {caption && <caption className="sr-only">{caption}</caption>}
      {thead}
      {tbody}
    </table>
  );

  if (virtualMode) {
    return (
      <div className={className} {...props}>
        {columnMenu}
        <div className="w-full overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-700">
          <div ref={parentRef} style={{ maxHeight, overflowY: 'auto' }}>
            {tableEl}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className} {...props}>
      {columnMenu}
      <div className="w-full overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-700">
        {tableEl}
      </div>
    </div>
  );
}
