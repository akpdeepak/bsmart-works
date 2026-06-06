import { useState } from 'react';

// The count/limit pill in a board column header. Shows just the count when no WIP limit is set,
// "count/limit" when one is, and turns red (RB-30 semantic-danger) when the column is over its
// limit. Managers (canEdit) click it to set or clear the limit inline; everyone else sees it
// read-only. A blank value clears the limit (onSet(null) → unbounded column).
export function BoardWipBadge({ count, limit, canEdit = false, onSet }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState('');
  const over = limit != null && count > limit;

  const commit = () => {
    setEditing(false);
    const trimmed = val.trim();
    const next = trimmed === '' ? null : Math.max(0, parseInt(trimmed, 10) || 0);
    if (next !== (limit ?? null)) onSet?.(next);
  };

  if (editing) {
    return (
      <input
        type="number"
        min={0}
        className="w-14 rounded-full border border-brand-navy/40 bg-white dark:bg-neutral-700 px-1.5 py-0.5 text-xs text-neutral-700 dark:text-neutral-200"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
        aria-label="WIP limit"
      />
    );
  }

  const badge = (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium shadow-sm ${over ? 'bg-semantic-danger/10 text-semantic-danger' : 'bg-white dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'}`}
      title={over ? 'Over WIP limit' : limit != null ? `WIP limit ${limit}` : undefined}
    >
      {limit == null ? count : `${count}/${limit}`}
    </span>
  );

  if (!canEdit) return badge;
  return (
    <button
      type="button"
      onClick={() => { setVal(limit == null ? '' : String(limit)); setEditing(true); }}
      title="Set WIP limit"
      className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
    >
      {badge}
    </button>
  );
}
