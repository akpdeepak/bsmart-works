import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// Atom — base data table. Handles: column headers with optional sort indicators, zebra-stripe
// rows, empty state, and a loading skeleton. Virtualisation, multi-sort, and column ops come in
// WI-33. columns: Array<{ key, label, sortable?, align?, width? }>. renderCell(key, row) renders
// a cell; falls back to row[key]. onSort(key, 'asc'|'desc') fires when a sortable header is clicked
// (parent drives the sort state). Controlled: sortKey + sortDir as props.

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
  ...props
}) {
  function handleSort(col) {
    if (!col.sortable || !onSort) return;
    const next = sortKey === col.key && sortDir === 'asc' ? 'desc' : 'asc';
    onSort(col.key, next);
  }

  const alignClass = (align) =>
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

  return (
    <div className={cn('w-full overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-700', className)} {...props}>
      <table className="w-full text-sm" aria-busy={loading || undefined}>
        {caption && <caption className="sr-only">{caption}</caption>}
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
            rows.map((row, i) => (
              <tr
                key={row[rowKey] ?? i}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  'transition-colors duration-fast',
                  i % 2 === 1 && 'bg-neutral-50/50 dark:bg-neutral-800/30',
                  onRowClick && 'cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700/50'
                )}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn('px-4 py-3 text-neutral-900 dark:text-neutral-100', alignClass(col.align))}>
                    {renderCell ? renderCell(col.key, row) : (row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
