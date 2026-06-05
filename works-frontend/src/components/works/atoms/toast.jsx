import { Check, AlertCircle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Atom — toast notification with an always-mounted live region so screen readers reliably
// announce changes (CLAUDE.md §6): role/aria-live is "status"/"polite" for success + undo,
// and "alert"/"assertive" for errors. Lucide icons, never emoji (§8); z-toast + motion
// tokens, never z-[..] (§4.21). The outer region is pointer-events-none so it never blocks
// the UI behind it; the visible pill re-enables pointer events for the Undo action.
const ICONS = { success: Check, error: AlertCircle, undo: Trash2 };

export function Toast({ toast, canUndo = false, onUndo }) {
  const isError = toast?.type === 'error';
  const Icon = toast ? ICONS[toast.type] ?? Check : null;

  return (
    <div
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      aria-atomic="true"
      className="pointer-events-none fixed bottom-6 left-1/2 z-toast -translate-x-1/2"
    >
      {toast && (
        <div
          className={cn(
            'pointer-events-auto flex items-center gap-3 rounded-xl px-5 py-3 text-sm font-medium text-white shadow-xl',
            isError ? 'bg-semantic-danger' : 'bg-neutral-900 dark:bg-neutral-700'
          )}
        >
          {Icon && <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />}
          <span>{toast.message}</span>
          {toast.type === 'undo' && canUndo && (
            <button
              type="button"
              onClick={onUndo}
              className="ml-1 rounded border border-brand-orange/40 px-2 py-0.5 text-xs font-bold text-brand-orange transition-colors duration-fast hover:bg-brand-orange/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40"
            >
              Undo
            </button>
          )}
        </div>
      )}
    </div>
  );
}
