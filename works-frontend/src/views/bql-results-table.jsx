import { useState } from 'react';
import { ArrowUp, ArrowDown, Columns3, Download, Check } from 'lucide-react';
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

function loadVisible() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved) && saved.length) return saved;
  } catch { /* ignore */ }
  return DEFAULT_VISIBLE;
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
export default function BqlResultsTable({ results, sort, nameMaps = {}, onSort, onOpen, onShowMore, canShowMore }) {
  const [visibleKeys, setVisibleKeys] = useState(loadVisible);
  const [chooserOpen, setChooserOpen] = useState(false);

  const cols = COLUMNS.filter(c => visibleKeys.includes(c.key));
  const [sortKey, sortDir] = (sort || 'created_at desc').split(/\s+/);

  const toggleColumn = (key) => {
    setVisibleKeys(prev => {
      const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
      const ordered = COLUMNS.filter(c => next.includes(c.key)).map(c => c.key);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ordered)); } catch { /* ignore */ }
      return ordered;
    });
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
    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-700 flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          {results.length} result{results.length !== 1 ? 's' : ''}
        </span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" leftIcon={<Download aria-hidden="true" className="h-3.5 w-3.5" />}
            onClick={exportCsv} disabled={results.length === 0}>Export CSV</Button>
          <div className="relative">
            <Button variant="ghost" size="sm" leftIcon={<Columns3 aria-hidden="true" className="h-3.5 w-3.5" />}
              onClick={() => setChooserOpen(o => !o)} aria-expanded={chooserOpen}>Columns</Button>
            {chooserOpen && (
              <div className="absolute right-0 mt-1 z-overlay w-44 max-h-72 overflow-y-auto bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg py-1">
                {COLUMNS.map(c => (
                  <button key={c.key} type="button" onClick={() => toggleColumn(c.key)}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700">
                    <span className="w-3.5 shrink-0">
                      {visibleKeys.includes(c.key) && <Check aria-hidden="true" className="h-3.5 w-3.5 text-brand-navy" />}
                    </span>
                    {c.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-h-96 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-neutral-50 dark:bg-neutral-900 text-xs uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
            <tr>
              {cols.map(col => (
                <th key={col.key} scope="col"
                  className={`px-4 py-2 text-left font-semibold ${col.sort ? 'cursor-pointer select-none hover:text-brand-navy' : ''}`}
                  onClick={() => headerClick(col)}
                  aria-sort={col.sort && sortKey === col.sort ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}>
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sort === sortKey && (sortDir === 'asc'
                      ? <ArrowUp aria-hidden="true" className="h-3 w-3" />
                      : <ArrowDown aria-hidden="true" className="h-3 w-3" />)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
            {results.map((item, i) => (
              <tr key={item.id || i} role="button" tabIndex={0}
                className="cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-navy-tint/40"
                onClick={() => onOpen(item)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(item); } }}>
                {cols.map(col => (
                  <td key={col.key} className={`px-4 py-2.5 text-neutral-900 dark:text-neutral-100 ${col.grow ? 'font-medium' : ''} ${col.date ? 'whitespace-nowrap text-neutral-600 dark:text-neutral-400' : ''}`}>
                    {renderCell(col, item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canShowMore && (
        <div className="px-4 py-2 border-t border-neutral-100 dark:border-neutral-700 text-center">
          <Button variant="ghost" size="sm" onClick={onShowMore}>Show more</Button>
        </div>
      )}
    </div>
  );
}
