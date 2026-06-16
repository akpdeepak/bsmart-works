// KR-017 — Status transition popover.
// Shows allowed next statuses for the current article status, a comment
// textarea, and a Confirm button. Calls the appropriate callback when
// the user confirms. Closes on Escape or outside click.
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

// Transitions allowed from each status, matching ArticleWorkflowService.java.
// Each entry: { label, action, variant } where variant drives Confirm button style.
const TRANSITIONS = {
  DRAFT:     [{ label: 'Submit for Review', action: 'submit',  variant: 'action'    }],
  IN_REVIEW: [
    { label: 'Publish',          action: 'publish', variant: 'action'    },
    { label: 'Request Changes',  action: 'reject',  variant: 'secondary' },
  ],
  PUBLISHED: [{ label: 'Archive', action: 'archive', variant: 'secondary' }],
  ARCHIVED:  [{ label: 'Restore to Draft', action: 'restore', variant: 'secondary' }],
};

const ACTION_CALLBACKS = {
  submit:  (cbs) => cbs.onSubmit,
  publish: (cbs) => cbs.onPublish,
  reject:  (cbs) => cbs.onReject,
  archive: (cbs) => cbs.onArchive,
  restore: (cbs) => cbs.onRestore,
};

/**
 * @param {{
 *   status: string,
 *   open: boolean,
 *   onClose: () => void,
 *   onSubmit: () => void,
 *   onPublish: () => void,
 *   onReject: () => void,
 *   onArchive: () => void,
 *   onRestore: () => void,
 * }} props
 */
export function StatusTransitionPopover({
  status, open, onClose,
  onSubmit, onPublish, onReject, onArchive, onRestore,
}) {
  const [selectedAction, setSelectedAction] = useState(null);
  const [comment, setComment] = useState('');
  const ref = useRef(null);

  const currentStatus = status || 'DRAFT';
  const options = TRANSITIONS[currentStatus] || [];
  const callbacks = { onSubmit, onPublish, onReject, onArchive, onRestore };

  // Reset state when popover opens
  useEffect(() => {
    if (open) {
      setSelectedAction(options[0]?.action ?? null);
      setComment('');
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close on Escape or outside click
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleConfirm = () => {
    const action = selectedAction || options[0]?.action;
    if (!action) return;
    const cb = ACTION_CALLBACKS[action]?.(callbacks);
    if (cb) cb(comment.trim() || undefined);
    onClose();
  };

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Change article status"
      className="absolute left-0 top-full mt-1 z-dropdown w-72 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg p-4 space-y-3"
    >
      <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
        Change status
      </p>

      {options.length === 0 ? (
        <p className="text-sm text-neutral-500">No transitions available from <strong>{currentStatus}</strong>.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Next status options">
            {options.map(({ label, action }) => (
              <button
                key={action}
                type="button"
                aria-pressed={selectedAction === action}
                onClick={() => setSelectedAction(action)}
                className={cn(
                  'text-xs px-2.5 py-1 rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40',
                  selectedAction === action
                    ? 'bg-brand-navy text-white border-brand-navy'
                    : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-brand-navy hover:text-brand-navy',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <textarea
            aria-label="Transition comment"
            placeholder="Why are you changing this status? (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            className="w-full text-sm border border-neutral-200 dark:border-neutral-700 rounded-md px-3 py-2 bg-transparent text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
          />

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded px-2 py-1"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="text-xs px-3 py-1.5 rounded-md bg-brand-navy text-white hover:bg-brand-navy-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 transition-colors"
            >
              Confirm
            </button>
          </div>
        </>
      )}
    </div>
  );
}
