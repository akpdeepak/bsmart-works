import { useState } from 'react';
import { X, Archive, Trash2 } from 'lucide-react';
import { Button } from '@/components/works/button';

/**
 * KR-038: Sticky bulk-action bar for multi-selected articles.
 *
 * Shown when selectedIds.size > 0. RBAC is enforced server-side (RB-10 §2) — this bar is
 * display-only; the server rejects actions the caller cannot perform.
 *
 * Props:
 *   selectedIds  Set<string>   — selected article IDs
 *   onArchive    () => void    — called when Archive is clicked (after confirmation if needed)
 *   onDelete     () => void    — called when Delete is confirmed
 *   onClear      () => void    — deselects all
 *   busy         bool          — disables buttons during API call
 */
export function BulkActionBar({ selectedIds, onArchive, onDelete, onClear, busy = false }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const count = selectedIds.size;

  if (count === 0) return null;

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setConfirmDelete(false);
    onDelete();
  };

  const handleArchive = () => {
    setConfirmDelete(false);
    onArchive();
  };

  const handleClear = () => {
    setConfirmDelete(false);
    onClear();
  };

  return (
    <div
      role="toolbar"
      aria-label={`Bulk actions for ${count} selected article${count !== 1 ? 's' : ''}`}
      className="sticky top-0 z-sticky flex flex-wrap items-center gap-2 rounded-lg border border-brand-navy-tint/30 bg-brand-navy-tint/5 px-3 py-2 mb-3"
    >
      <span className="text-xs font-semibold text-brand-navy dark:text-white">
        {count} article{count !== 1 ? 's' : ''} selected
      </span>

      <Button
        variant="secondary"
        size="sm"
        onClick={handleArchive}
        disabled={busy}
        aria-label={`Archive ${count} selected article${count !== 1 ? 's' : ''}`}
      >
        <Archive className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
        Archive ({count})
      </Button>

      {confirmDelete ? (
        <>
          <span className="text-xs text-semantic-danger font-medium">Confirm permanent delete?</span>
          <Button
            variant="danger"
            size="sm"
            onClick={handleDelete}
            disabled={busy}
            aria-label={`Confirm delete ${count} selected article${count !== 1 ? 's' : ''}`}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
            Delete ({count})
          </Button>
          <button
            type="button"
            onClick={() => setConfirmDelete(false)}
            className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded px-2 py-1"
            aria-label="Cancel delete"
          >
            Cancel
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={handleDelete}
          disabled={busy}
          className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-semantic-danger hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-semantic-danger/40 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={`Delete ${count} selected article${count !== 1 ? 's' : ''}`}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          Delete ({count})
        </button>
      )}

      <button
        type="button"
        onClick={handleClear}
        className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 ml-auto"
        aria-label="Clear selection"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
        Clear
      </button>
    </div>
  );
}

export default BulkActionBar;
