import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVirtualList } from '@/hooks/use-virtual-list';

// Atom — base data table. Handles: column headers with optional sort indicators, zebra-stripe
// rows, empty state, loading skeleton, and opt-in virtual scrolling for large row sets.
// Virtual scrolling activates automatically when rows.length > virtualThreshold (default: 100).
// Uses padding rows at the top/bottom of <tbody> to maintain correct scroll height without
// breaking table layout (absolutely-positioned <tr> inside <tbody> would break column widths).
// columns: Array<{ key, label, sortable?, align?, width? }>. renderCell(key, row) renders
// a cell; falls back to row[key]. onSort(key, 'asc'|'desc') fires when a sortable header is clicked
// (parent drives the sort state). Controlled: sortKey + sortDir as props.
// maxHeight (string, default '37.5rem') caps the scroll container in virtual mode.

function SortIcon({ col, sortKey, sortDir }) {
  if (!col.sortable) return null;
  if (sortKey !== col.key) {
    return <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-30" aria-hidden="true" />;
  }
  return sortDir === 'asc'
    ? <ChevronUp  className="ml-1 h-3.5 w-3.5 shrink-0 text-brand-navy" aria-hidden="true" />
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
  ...props
}) {
  function handleSort(col) {
    if (!col.sortable || !onSort) return;
    const next = sortKey === col.key && sortDir === 'asc' ? 'desc' : 'asc';
    onSort(col.key, next);
  }

  const alignClass = (align) =>
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

  // Virtual mode: activated when row count exceeds threshold and not in loading state.
  // Hook is always called (hooks must not be conditional) but its output is only used in virtual mode.
  const virtualMode = !loading && rows.length > virtualThreshold;

  const { parentRef, virtualRows, totalSize } = useVirtualList({
    count: rows.length,
    estimateSize: 48,
  });

  // Padding rows simulate the off-screen items' height so the scroll container fills correctly.
  // This is the table-compatible approach — absolute-positioned <tr> elements break column widths.
  const paddingTop = virtualMode && virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom =
    virtualMode && virtualRows.length > 0
      ? totalSize -
        (virtualRows[virtualRows.length - 1].start +
          virtualRows[virtualRows.length - 1].size)
      : 0;

  const displayRows = virtualMode ? virtualRows.map((vr) => rows[vr.index]) : rows;

  const thead = (
    <thead className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700">
      <tr>
        {columns.map((col) => (
          <th
            key={col.key}
            scope="col"
            aria-sort={
              col.sortable && sortKey === col.key
                ? sortDir === 'asc' ? 'ascending' : 'descending'
                : col.sortable ? 'none' : undefined
            }
            style={col.width ? { width: col.width } : undefined}
            className={cn(
              'px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-500',
              alignClass(col.align),
              col.sortable && 'cursor-pointer select-none hover:text-neutral-900 dark:hover:text-neutral-100'
            )}
            onClick={() => handleSort(col)}
          >
            <span className="inline-flex items-center">
              {col.label}
              <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
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
            {columns.map((col) => (
              <td key={col.key} className="px-4 py-3">
                <div className="h-3.5 rounded bg-neutral-100 dark:bg-neutral-700 animate-pulse" style={{ width: `${50 + (i * 13 + col.key.length * 7) % 40}%` }} />
              </td>
            ))}
          </tr>
        ))
      ) : rows.length === 0 ? (
        <tr>
          <td colSpan={columns.length} className="px-4 py-12 text-center text-neutral-400 text-sm">
            {empty ?? 'No data'}
          </td>
        </tr>
      ) : (
        <>
          {virtualMode && paddingTop > 0 && (
            <tr style={{ height: `${paddingTop}px` }} aria-hidden="true" />
          )}
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
                {columns.map((col) => (
                  <td key={col.key} className={cn('px-4 py-3 text-neutral-900 dark:text-neutral-100', alignClass(col.align))}>
                    {renderCell ? renderCell(col.key, row) : (row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            );
          })}
          {virtualMode && paddingBottom > 0 && (
            <tr style={{ height: `${paddingBottom}px` }} aria-hidden="true" />
          )}
        </>
      )}
    </tbody>
  );

  if (virtualMode) {
    // In virtual mode: outer div handles horizontal scroll + border/radius; inner div is the
    // height-capped scroll container attached to parentRef for the virtualizer.
    return (
      <div className={cn('w-full overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-700', className)} {...props}>
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
      <table className="w-full text-sm" aria-busy={loading || undefined}>
        {caption && <caption className="sr-only">{caption}</caption>}
        {thead}
        {tbody}
      </table>
    </div>
  );
}
