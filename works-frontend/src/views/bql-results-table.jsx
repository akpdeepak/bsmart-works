import { useState } from 'react';
import { ArrowUp, ArrowDown, Columns3, Download, Check, X, Rows3 } from 'lucide-react';
import { Button } from '@/components/works/button';
import { StatusBadge } from '@/components/works/status-badge';
import { statusToCategory } from '@/components/works/status';
import { PriorityBadge } from '@/components/works/priority-badge';

// Column catalogue for the BQL navigator. `sort` is the backend ORDER BY key (only allow-listed
// columns are sortable, mirroring BqlController.SORTABLE); columns without one aren't clickable.
const COLUMNS = [
  { key: 'id', label: 'Key', sort: null, mono: true },
  { key: 'title', label: 'Summary', sort: 'title', grow: true },
  { key: 'status', label: 'Status', sort: 'status' },
  { key: 'type', label: 'Type', sort: null },
  { key: 'priority', label: 'Priority', sort: 'priority' },
  { key: 'assignee_id', label: 'Assignee', sort: null },
  { key: 'created_by', label: 'Reporter', sort: null },
  { key: 'project_id', label: 'Project', sort: null },
  { key: 'sprint_id', label: 'Sprint', sort: null },
  { key: 'story_points', label: 'Points', sort: 'story_points' },
  { key: 'due_date', label: 'Due', sort: 'due_date', date: true },
  { key: 'created_at', label: 'Created', sort: 'created_at', date: true },
  { key: 'updated_at', label: 'Updated', sort: 'updated_at', date: true },
];

const DEFAULT_VISIBLE = ['id', 'title', 'status', 'type', 'priority', 'assignee_id', 'due_date'];
const STORAGE_KEY = 'bql.navigator.columns';
// ID columns → which nameMaps lookup resolves them to a human-readable name (JIRA shows names, not ids).
const ID_MAP = { assignee_id: 'users', created_by: 'users', project_id: 'projects', sprint_id: 'sprints' };

const DENSITY_KEY = 'bql.navigator.density';

function loadVisible() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved) && saved.length) return saved;
  } catch { /* ignore */ }
  return DEFAULT_VISIBLE;
}

function loadDensity() {
  try {
    return localStorage.getItem(DENSITY_KEY) === 'compact' ? 'compact' : 'comfortable';
  } catch { return 'comfortable'; }
}

function cellText(col, item, nameMaps) {
  const v = item[col.key];
  if (v == null || v === '') return '';
  if (col.date) return String(v).slice(0, 10);
  const mapKey = ID_MAP[col.key];
  const name = mapKey && nameMaps?.[mapKey]?.[v];
  return name || String(v);
}

function toCsv(rows, cols, nameMaps) {
  const esc = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
  const header = cols.map(c => esc(c.label)).join(',');
  const body = rows.map(r => cols.map(c => esc(cellText(c, r, nameMaps))).join(',')).join('\n');
  return `${header}\n${body}`;
}

// JIRA-style issue navigator for BQL results: sortable columns, a column chooser, CSV export, and
// rows that always open their work item (the parent resolves by id, fetching if needed).
export default function BqlResultsTable({ results, sort, nameMaps = {}, priorityOptions = [],
  columnKeys = null, onColumnsChange, onSort, onOpen, onShowMore, onBulk, canShowMore }) {
  const [internalKeys, setInternalKeys] = useState(loadVisible);
  const [chooserOpen, setChooserOpen] = useState(false);
  // Columns are controlled by the parent when onColumnsChange is supplied (so a saved view can carry
  // its own layout); otherwise the table owns them via localStorage. An empty/absent controlled value
  // falls back to the saved/default set.
  const controlledCols = typeof onColumnsChange === 'function';
  const visibleKeys = controlledCols ? (columnKeys && columnKeys.length ? columnKeys : loadVisible()) : internalKeys;
  // Bulk-edit selection (JIRA-style): pick rows, apply one change to all (server re-checks per item).
  const [selected, setSelected] = useState(() => new Set());
  const [bulkAction, setBulkAction] = useState('priority');
  const [bulkValue, setBulkValue] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);
  // Row density (JIRA-style): comfortable (default) vs compact, persisted across sessions.
  const [density, setDensity] = useState(loadDensity);

  const cols = COLUMNS.filter(c => visibleKeys.includes(c.key));
  const [sortKey, sortDir] = (sort || 'created_at desc').split(/\s+/);
  const bulkEnabled = typeof onBulk === 'function';
  const cellPad = density === 'compact' ? 'px-3 py-1.5' : 'px-4 py-2.5';

  const toggleDensity = () => setDensity(d => {
    const next = d === 'compact' ? 'comfortable' : 'compact';
    try { localStorage.setItem(DENSITY_KEY, next); } catch { /* ignore */ }
    return next;
  });

  const toggleRow = (id) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const allSelected = results.length > 0 && results.every(r => selected.has(r.id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(results.map(r => r.id)));
  const clearSelection = () => setSelected(new Set());

  const applyBulk = () => {
    const ids = [...selected];
    if (!ids.length || (bulkAction !== 'assignee' && !bulkValue.trim())) return;
    setBulkBusy(true);
    Promise.resolve(onBulk(bulkAction, bulkValue.trim(), ids))
      .then(() => { setBulkValue(''); clearSelection(); })
      .finally(() => setBulkBusy(false));
  };

  const toggleColumn = (key) => {
    const next = visibleKeys.includes(key) ? visibleKeys.filter(k => k !== key) : [...visibleKeys, key];
    const ordered = COLUMNS.filter(c => next.includes(c.key)).map(c => c.key);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ordered)); } catch { /* ignore */ }
    if (controlledCols) onColumnsChange(ordered); else setInternalKeys(ordered);
  };

  const headerClick = (col) => {
    if (!col.sort) return;
    const dir = sortKey === col.sort && sortDir !== 'asc' ? 'asc' : 'desc';
    onSort(`${col.sort} ${dir}`);
  };

  const exportCsv = () => {
    const blob = new Blob([toCsv(results, cols, nameMaps)], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bql-results.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderCell = (col, item) => {
    if (col.key === 'status' && item.status) {
      return <StatusBadge category={statusToCategory(item.status)}>{item.status}</StatusBadge>;
    }
    if (col.key === 'priority' && item.priority) {
      return <PriorityBadge priority={item.priority} />;
    }
    return <span className={col.mono ? 'font-mono text-xs text-neutral-600 dark:text-neutral-400' : ''}>{cellText(col, item, nameMaps)}</span>;
  };

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-md dark:border-neutral-700 dark:bg-neutral-800">
      <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3 dark:border-neutral-700/60">
        <span className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-1 text-sm font-semibold text-neutral-700 dark:bg-neutral-900 dark:text-neutral-200">
          {results.length} result{results.length !== 1 ? 's' : ''}
        </span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" leftIcon={<Rows3 aria-hidden="true" className="h-3.5 w-3.5" />}
            onClick={toggleDensity} aria-pressed={density === 'compact'}
            title={density === 'compact' ? 'Comfortable rows' : 'Compact rows'}>
            {density === 'compact' ? 'Comfortable' : 'Compact'}
          </Button>
          <Button variant="ghost" size="sm" leftIcon={<Download aria-hidden="true" className="h-3.5 w-3.5" />}
            onClick={exportCsv} disabled={results.length === 0}>Export CSV</Button>
          <div className="relative">
            <Button variant="ghost" size="sm" leftIcon={<Columns3 aria-hidden="true" className="h-3.5 w-3.5" />}
              onClick={() => setChooserOpen(o => !o)} aria-expanded={chooserOpen}>Columns</Button>
            {chooserOpen && (
              <div className="absolute right-0 z-dropdown mt-1 max-h-72 w-48 overflow-y-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
                <p className="px-3 py-1.5 text-2xs font-semibold uppercase tracking-wide text-neutral-400">Columns</p>
                {COLUMNS.map(c => {
                  const on = visibleKeys.includes(c.key);
                  return (
                    <button key={c.key} type="button" onClick={() => toggleColumn(c.key)}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-neutral-700 transition-colors hover:bg-neutral-50 dark:text-neutral-200 dark:hover:bg-neutral-700/50">
                      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${on ? 'border-brand-navy bg-brand-navy text-white' : 'border-neutral-300 dark:border-neutral-600'}`}>
                        {on && <Check aria-hidden="true" className="h-3 w-3" />}
                      </span>
                      {c.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bulk-edit toolbar — only when rows are selected; the server re-checks edit rights per item. */}
      {bulkEnabled && selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-brand-navy-tint/20 bg-brand-navy/5 px-4 py-2.5 dark:bg-brand-navy-tint/10">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-navy dark:text-neutral-100">
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-navy px-1.5 text-2xs text-white">{selected.size}</span>
            selected
          </span>
          <label className="sr-only" htmlFor="bulk-action">Bulk action</label>
          <select id="bulk-action" className="input w-auto py-1 text-xs" value={bulkAction}
            onChange={e => { setBulkAction(e.target.value); setBulkValue(''); }}>
            <option value="priority">Set priority</option>
            <option value="addLabel">Add label</option>
            <option value="removeLabel">Remove label</option>
          </select>
          <label className="sr-only" htmlFor="bulk-value">Value</label>
          {bulkAction === 'priority' && priorityOptions.length > 0 ? (
            <select id="bulk-value" className="input w-auto py-1 text-xs" value={bulkValue}
              onChange={e => setBulkValue(e.target.value)}>
              <option value="">value…</option>
              {priorityOptions.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          ) : (
            <input id="bulk-value" className="input w-auto py-1 text-xs" placeholder="value"
              value={bulkValue} onChange={e => setBulkValue(e.target.value)} />
          )}
          <Button variant="action" size="sm" onClick={applyBulk} loading={bulkBusy}
            disabled={!bulkValue.trim()}>Apply</Button>
          <Button variant="ghost" size="sm" leftIcon={<X aria-hidden="true" className="h-3.5 w-3.5" />}
            onClick={clearSelection}>Clear</Button>
        </div>
      )}

      <div className="max-h-96 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-base bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500 shadow-sm dark:bg-neutral-900 dark:text-neutral-400">
            <tr>
              {bulkEnabled && (
                <th scope="col" className="w-8 px-3 py-2.5">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll}
                    aria-label="Select all rows" className="cursor-pointer accent-brand-navy" />
                </th>
              )}
              {cols.map(col => (
                <th key={col.key} scope="col"
                  className={`${cellPad} text-left font-semibold ${col.sort ? 'cursor-pointer select-none transition-colors hover:text-brand-navy' : ''}`}
                  onClick={() => headerClick(col)}
                  aria-sort={col.sort && sortKey === col.sort ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}>
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sort === sortKey && (sortDir === 'asc'
                      ? <ArrowUp aria-hidden="true" className="h-3 w-3 text-brand-navy" />
                      : <ArrowDown aria-hidden="true" className="h-3 w-3 text-brand-navy" />)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700/60">
            {results.map((item, i) => (
              <tr key={item.id || i}
                className={`transition-colors hover:bg-brand-navy/5 dark:hover:bg-brand-navy-tint/10 ${selected.has(item.id) ? 'bg-brand-navy/5 dark:bg-brand-navy-tint/10' : ''}`}>
                {bulkEnabled && (
                  <td className="px-3 py-2.5">
                    <input type="checkbox" checked={selected.has(item.id)}
                      onChange={() => toggleRow(item.id)}
                      aria-label={`Select ${item.id}`} className="cursor-pointer accent-brand-navy" />
                  </td>
                )}
                {cols.map((col, ci) => (
                  <td key={col.key} className={`${cellPad} text-neutral-900 dark:text-neutral-100 ${col.grow ? 'font-medium' : ''} ${col.date ? 'whitespace-nowrap text-neutral-600 dark:text-neutral-400' : ''}`}>
                    {ci === 0 ? (
                      // The first cell is the row's open affordance — a real button so it works by
                      // mouse AND keyboard without making the whole <tr> an interactive control
                      // (which would nest the bulk-select checkbox inside it — nested-interactive, RB-30 §6).
                      <button type="button" onClick={() => onOpen(item)}
                        className="rounded-sm text-left font-medium text-brand-navy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-navy-tint/40 dark:text-neutral-100">
                        {renderCell(col, item)}
                      </button>
                    ) : renderCell(col, item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canShowMore && (
        <div className="border-t border-neutral-100 px-4 py-2.5 text-center dark:border-neutral-700/60">
          <Button variant="ghost" size="sm" onClick={onShowMore}>Show more</Button>
        </div>
      )}
    </div>
  );
}
