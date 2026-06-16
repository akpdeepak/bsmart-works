// KR-017 — Status transition popover.
// Shows allowed next statuses for the current article status, a comment
// textarea, and a Confirm button. Calls the appropriate callback when
// the user confirms. Closes on Escape or outside click.
//
// KR-018: when transitioning DRAFT → IN_REVIEW, shows optional reviewer
//         member-id input and reviewer due-date picker.
// KR-020: when transitioning IN_REVIEW → PUBLISHED, shows a "Schedule for later"
//         toggle; if enabled, collects a datetime-local and calls onSchedule
//         instead of onPublish.
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
 *   onSubmit: (comment?: string, reviewerId?: string, reviewerDueDate?: string) => void,
 *   onPublish: (comment?: string) => void,
 *   onSchedule: (scheduledAt: string, comment?: string) => void,
 *   onReject: (comment?: string) => void,
 *   onArchive: (comment?: string) => void,
 *   onRestore: (comment?: string) => void,
 * }} props
 */
export function StatusTransitionPopover({
  status, open, onClose,
  onSubmit, onPublish, onSchedule, onReject, onArchive, onRestore,
}) {
  const [selectedAction, setSelectedAction] = useState(null);
  const [comment, setComment] = useState('');
  // KR-018: reviewer assignment fields (submit transition only)
  const [reviewerId, setReviewerId] = useState('');
  const [reviewerDueDate, setReviewerDueDate] = useState('');
  // KR-020: schedule for later (publish transition only)
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const ref = useRef(null);

  const currentStatus = status || 'DRAFT';
  const options = TRANSITIONS[currentStatus] || [];
  const callbacks = { onSubmit, onPublish, onReject, onArchive, onRestore };

  const isSubmitAction  = selectedAction === 'submit';
  const isPublishAction = selectedAction === 'publish';

  // Reset state when popover opens
  useEffect(() => {
    if (open) {
      setSelectedAction(options[0]?.action ?? null);
      setComment('');
      setReviewerId('');
      setReviewerDueDate('');
      setScheduleEnabled(false);
      setScheduledAt('');
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

    if (action === 'publish' && scheduleEnabled) {
      // KR-020: schedule instead of immediate publish
      if (onSchedule) onSchedule(scheduledAt || undefined, comment.trim() || undefined);
      onClose();
      return;
    }

    if (action === 'submit') {
      // KR-018: pass reviewer fields alongside comment
      const cb = ACTION_CALLBACKS['submit']?.(callbacks);
      if (cb) cb(comment.trim() || undefined,
                 reviewerId.trim() || undefined,
                 reviewerDueDate || undefined);
      onClose();
      return;
    }

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

          {/* KR-018: reviewer assignment — shown only for submit transition */}
          {isSubmitAction && (
            <div className="space-y-2">
              <div>
                <label
                  htmlFor="reviewer-id-input"
                  className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1"
                >
                  Reviewer (optional)
                </label>
                <input
                  id="reviewer-id-input"
                  type="text"
                  value={reviewerId}
                  onChange={(e) => setReviewerId(e.target.value)}
                  placeholder="Reviewer member ID"
                  className="w-full text-sm border border-neutral-200 dark:border-neutral-700 rounded-md px-3 py-1.5 bg-transparent text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
                />
              </div>
              <div>
                <label
                  htmlFor="reviewer-due-date-input"
                  className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1"
                >
                  Reviewer due date (optional)
                </label>
                <input
                  id="reviewer-due-date-input"
                  type="datetime-local"
                  value={reviewerDueDate}
                  onChange={(e) => setReviewerDueDate(e.target.value)}
                  className="w-full text-sm border border-neutral-200 dark:border-neutral-700 rounded-md px-3 py-1.5 bg-transparent text-neutral-900 dark:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
                />
              </div>
            </div>
          )}

          {/* KR-020: schedule for later — shown only for publish transition */}
          {isPublishAction && (
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={scheduleEnabled}
                  onChange={(e) => setScheduleEnabled(e.target.checked)}
                  className="rounded border-neutral-300 dark:border-neutral-600 text-brand-navy focus-visible:ring-brand-navy-tint/40"
                  aria-label="Schedule for later"
                />
                Schedule for later
              </label>
              {scheduleEnabled && (
                <div>
                  <label
                    htmlFor="scheduled-at-input"
                    className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1"
                  >
                    Publish at
                  </label>
                  <input
                    id="scheduled-at-input"
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-full text-sm border border-neutral-200 dark:border-neutral-700 rounded-md px-3 py-1.5 bg-transparent text-neutral-900 dark:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
                  />
                </div>
              )}
            </div>
          )}

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
              {isPublishAction && scheduleEnabled ? 'Schedule' : 'Confirm'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
