// ToastStack — fixed bottom-right stacking toast container.
// Renders up to MAX_VISIBLE toasts; shows "+N more" when pending > 0.
// Each ToastItem auto-dismisses after `duration` ms and is manually dismissible via × button.
// Tone classes map to semantic-* tokens (no raw hex / arbitrary values).
import { useEffect } from 'react';
import { useToastQueue } from '@/hooks/use-toast-queue';
import { dismissToast } from '@/lib/toast-queue';
import { cn } from '@/lib/utils';

const TONE_CLASSES = {
  info:    'bg-semantic-info-surface border-semantic-info text-semantic-info',
  success: 'bg-semantic-success-surface border-semantic-success text-semantic-success',
  warning: 'bg-semantic-warning-surface border-semantic-warning text-semantic-warning',
  danger:  'bg-semantic-danger-surface border-semantic-danger text-semantic-danger',
};

function ToastItem({ toast }) {
  useEffect(() => {
    const id = setTimeout(() => dismissToast(toast.id), toast.duration);
    return () => clearTimeout(id);
  }, [toast.id, toast.duration]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        'flex items-start gap-3 rounded-lg border px-4 py-3 shadow-md min-w-64 max-w-sm text-sm',
        'transition-opacity duration-base ease-out-quint',
        TONE_CLASSES[toast.tone] ?? TONE_CLASSES.info,
      )}
    >
      <span className="flex-1">{toast.message}</span>
      {toast.action && (
        <button
          type="button"
          onClick={toast.action.onClick}
          className="font-medium underline underline-offset-2 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded"
        >
          {toast.action.label}
        </button>
      )}
      <button
        type="button"
        onClick={() => dismissToast(toast.id)}
        aria-label="Dismiss"
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded"
      >
        ×
      </button>
    </div>
  );
}

export function ToastStack() {
  const { visible, queue } = useToastQueue();
  return (
    <div
      className="fixed bottom-4 right-4 z-toast flex flex-col-reverse gap-2"
      aria-label="Notifications"
    >
      {visible.map(t => <ToastItem key={t.id} toast={t} />)}
      {queue.length > 0 && (
        <p className="text-xs text-neutral-600 text-right pr-1">+{queue.length} more</p>
      )}
    </div>
  );
}
