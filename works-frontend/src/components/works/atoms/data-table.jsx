import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronsUpDown, ChevronUp, Pencil, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVirtualList } from '@/hooks/use-virtual-list';
import { DENSITY_ROW_Y } from '@/lib/density';
import { moveColumn, nextSortModel, sortDirOf, sortPriority } from '@/lib/data-table-sort';

function SortIcon({ col, sortKey, sortDir, sortModel = [] }) {
  if (!col.sortable) return null;
  const priority = sortPriority(sortModel, col.key);
  const modelDir = sortDirOf(sortModel, col.key);
  if (priority) {
    return (
      <span className="ml-1 inline-flex items-center gap-0.5">
        {modelDir === 'asc'
          ? <ChevronUp className="h-3.5 w-3.5 shrink-0 text-brand-navy" aria-hidden="true" />
          : <ChevronDown className="h-3.5 w-3.5 shrink-0 text-brand-navy" aria-hidden="true" />}
        {sortModel.length > 1 && <span className="text-2xs font-bold text-brand-navy">{priority}</span>}
      </span>
    );
  }
  if (sortKey !== col.key) {
    return <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-30" aria-hidden="true" />;
  }
  return sortDir === 'asc'
    ? <ChevronUp className="ml-1 h-3.5 w-3.5 shrink-0 text-brand-navy" aria-hidden="true" />
    : <ChevronDown className="ml-1 h-3.5 w-3.5 shrink-0 text-brand-navy" aria-hidden="true" />;
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
  multiSort = false,
  sortModel = [],
  onSortModelChange,
  columnControls = false,
  columnState,
  onColumnStateChange,
  defaultHidden = [],
  onCellEdit,
  ...props
}) {
  const [editingCell, setEditingCell] = useState(null);
  const [draftValue, setDraftValue] = useState('');
  const columnOrder = columnState?.order?.length ? columnState.order : columns.map((col) => col.key);
  const hiddenColumns = new Set(columnState?.hidden ?? defaultHidden);
  const visibleColumns = columnOrder
    .map((key) => columns.find((col) => col.key === key))
    .filter((col) => col && !hiddenColumns.has(col.key));
  const rowHeight = DENSITY_ROW_Y[density] ?? DENSITY_ROW_Y.comfortable ?? 48;

  function handleSort(col, event) {
    if (!col.sortable) return;
    if (onSortModelChange) {
      const next = nextSortModel(sortModel, col.key, multiSort && event?.shiftKey);
      onSortModelChange(next);
      if (next[0]) onSort?.(next[0].key, next[0].dir);
      return;
    }
    if (!onSort) return;
    const next = sortKey === col.key && sortDir === 'asc' ? 'desc' : 'asc';
    onSort(col.key, next);
  }

  function toggleColumn(key) {
    const nextHidden = new Set(hiddenColumns);
    if (nextHidden.has(key)) nextHidden.delete(key);
    else nextHidden.add(key);
    onColumnStateChange?.({ order: columnOrder, hidden: [...nextHidden] });
  }

  function reorderColumn(key, delta) {
    onColumnStateChange?.({ order: moveColumn(columnOrder, key, delta), hidden: [...hiddenColumns] });
  }

  function beginEdit(row, col) {
    if (!col.editable || !onCellEdit) return;
    setEditingCell({ rowId: row[rowKey], columnKey: col.key });
    setDraftValue(row[col.key] ?? '');
  }

  function cancelEdit() {
    setEditingCell(null);
    setDraftValue('');
  }

  function commitEdit(row, col) {
    const current = row[col.key] ?? '';
    if (draftValue !== current) onCellEdit?.(row, col.key, draftValue);
    cancelEdit();
  }

  const alignClass = (align) =>
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

  const virtualMode = !loading && rows.length > virtualThreshold;
  const { parentRef, virtualRows, totalSize } = useVirtualList({
    count: rows.length,
    estimateSize: rowHeight,
  });

  const paddingTop = virtualMode && virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom =
    virtualMode && virtualRows.length > 0
      ? totalSize - (virtualRows[virtualRows.length - 1].start + virtualRows[virtualRows.length - 1].size)
      : 0;
  const displayRows = virtualMode ? virtualRows.map((vr) => rows[vr.index]) : rows;

  const thead = (
    <thead className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900">
      <tr>
        {visibleColumns.map((col) => (
          <th
            key={col.key}
            scope="col"
            aria-sort={
              col.sortable && (sortDirOf(sortModel, col.key) || sortKey === col.key)
                ? (sortDirOf(sortModel, col.key) || sortDir) === 'asc' ? 'ascending' : 'descending'
                : col.sortable ? 'none' : undefined
            }
            style={col.width ? { width: col.width } : undefined}
            className={cn(
              'px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-500',
              alignClass(col.align),
              col.sortable && 'cursor-pointer select-none hover:text-neutral-900 dark:hover:text-neutral-100',
            )}
            onClick={(event) => handleSort(col, event)}
          >
            <span className="inline-flex items-center">
              {col.label}
              <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} sortModel={sortModel} />
            </span>
          </th>
        ))}
      </tr>
    </thead>
  );

  const tbody = (
    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
      {loading ? (
        Array.from({ length: 4 }).map((_, i) => (
          <tr key={i} aria-hidden="true">
            {visibleColumns.map((col) => (
              <td key={col.key} className="px-4 py-3">
                <div
                  className="h-3.5 animate-pulse rounded bg-neutral-100 dark:bg-neutral-700"
                  style={{ width: `${50 + (i * 13 + col.key.length * 7) % 40}%` }}
                />
              </td>
            ))}
          </tr>
        ))
      ) : rows.length === 0 ? (
        <tr>
          <td colSpan={visibleColumns.length} className="px-4 py-12 text-center text-sm text-neutral-400">
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
                  onRowClick && 'cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700/50',
                )}
              >
                {visibleColumns.map((col) => (
                  <td key={col.key} className={cn('px-4 py-3 text-neutral-900 dark:text-neutral-100', alignClass(col.align))}>
                    <CellContent
                      row={row}
                      col={col}
                      rowKey={rowKey}
                      renderCell={renderCell}
                      editingCell={editingCell}
                      draftValue={draftValue}
                      setDraftValue={setDraftValue}
                      beginEdit={beginEdit}
                      cancelEdit={cancelEdit}
                      commitEdit={commitEdit}
                      canEdit={Boolean(onCellEdit)}
                    />
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

  const controls = columnControls ? (
    <ColumnControls
      columns={columns}
      hiddenColumns={hiddenColumns}
      columnOrder={columnOrder}
      onToggle={toggleColumn}
      onMove={reorderColumn}
    />
  ) : null;

  if (virtualMode) {
    return (
      <div className={cn('w-full overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-700', className)} {...props}>
        {controls}
        <div ref={parentRef} style={{ maxHeight, overflowY: 'auto' }}>
          <table className="w-full text-sm" aria-busy={loading || undefined}>
            {caption && <caption className="sr-only">{caption}</caption>}
            {thead}
            {tbody}
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('w-full overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-700', className)} {...props}>
      {controls}
      <table className="w-full text-sm" aria-busy={loading || undefined}>
        {caption && <caption className="sr-only">{caption}</caption>}
        {thead}
        {tbody}
      </table>
    </div>
  );
}

function CellContent({
  row,
  col,
  rowKey,
  renderCell,
  editingCell,
  draftValue,
  setDraftValue,
  beginEdit,
  cancelEdit,
  commitEdit,
  canEdit,
}) {
  const isEditing = editingCell?.rowId === row[rowKey] && editingCell?.columnKey === col.key;
  const inputRef = useRef(null);
  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          value={draftValue}
          onChange={(event) => setDraftValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commitEdit(row, col);
            if (event.key === 'Escape') cancelEdit();
          }}
          aria-label={`Edit ${col.label}`}
          className="min-w-0 flex-1 rounded-md border border-neutral-200 bg-white px-2 py-1 text-sm text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
        />
        <button type="button" onClick={() => commitEdit(row, col)} aria-label="Save cell" className="rounded-md p-1 text-semantic-success hover:bg-semantic-success/10">
          <Check className="h-4 w-4" aria-hidden="true" />
        </button>
        <button type="button" onClick={cancelEdit} aria-label="Cancel cell edit" className="rounded-md p-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    );
  }

  const value = renderCell ? renderCell(col.key, row) : (row[col.key] ?? '-');
  if (!col.editable || !canEdit) return value;
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        beginEdit(row, col);
      }}
      className="group inline-flex max-w-full items-center gap-1 rounded-md text-left hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
    >
      <span className="truncate">{value}</span>
      <Pencil className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-60 group-focus-visible:opacity-60" aria-hidden="true" />
    </button>
  );
}

function ColumnControls({ columns, hiddenColumns, columnOrder, onToggle, onMove }) {
  return (
    <details className="border-b border-neutral-200 bg-neutral-50 px-3 py-2 text-xs dark:border-neutral-700 dark:bg-neutral-900">
      <summary className="cursor-pointer font-semibold text-neutral-700 dark:text-neutral-200">Columns</summary>
      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {columnOrder.map((key, index) => {
          const col = columns.find((candidate) => candidate.key === key);
          if (!col) return null;
          return (
            <div key={col.key} className="flex items-center justify-between gap-2 rounded-md border border-neutral-200 bg-white px-2 py-1.5 dark:border-neutral-700 dark:bg-neutral-800">
              <label className="flex min-w-0 items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
                <input type="checkbox" checked={!hiddenColumns.has(col.key)} onChange={() => onToggle(col.key)} />
                <span className="truncate">{col.label}</span>
              </label>
              <span className="flex shrink-0 items-center gap-1">
                <button type="button" onClick={() => onMove(col.key, -1)} disabled={index === 0} aria-label={`Move ${col.label} left`} className="rounded p-1 text-neutral-500 hover:bg-neutral-100 disabled:opacity-40 dark:hover:bg-neutral-700">
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <button type="button" onClick={() => onMove(col.key, 1)} disabled={index === columnOrder.length - 1} aria-label={`Move ${col.label} right`} className="rounded p-1 text-neutral-500 hover:bg-neutral-100 disabled:opacity-40 dark:hover:bg-neutral-700">
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </span>
            </div>
          );
        })}
      </div>
    </details>
  );
}
