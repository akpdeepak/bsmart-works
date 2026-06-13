import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * DashboardDrillModal — drill-down dialog that lists the work items behind a clicked
 * widget element. Each row opens that item's detail (no navigation away from the
 * dashboard).
 *
 * Extracted from App.jsx (TD-003). a11y (issue 276, RB-30 §6): a real dialog — role="dialog" +
 * aria-modal + aria-labelledby, a focus trap while open, initial focus moved in and restored to
 * the trigger on close, and a labelled backdrop <button> instead of the previous unnamed
 * role="presentation" overlay. z-index uses the named z-modal token (RB-30 §9), not z-50.
 */
export function DashboardDrillModal({ drill, onClose, onOpenItem }) {
  const items = drill.items || [];
  // The widget passes the slice it was drilled from (§3.4): the dimension + the clicked value. We
  // surface it so it's clear the list is exactly that slice's underlying items — not the whole
  // dashboard. Absent for a whole-widget drill (e.g. a scorecard total).
  const ctx = drill.filterContext;
  const sliceLabel = ctx && ctx.value != null ? `${ctx.dimension}: ${ctx.value}` : null;
  const dialogRef = useRef(null);
  const titleId = useId();

  // Focus management + key handling, mirroring the canonical <Modal> (focus trap, Escape, restore).
  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const node = dialogRef.current;
    (node?.querySelectorAll(FOCUSABLE)[0] ?? node)?.focus();

    function onKeyDown(e) {
      if (e.key === 'Escape') { e.stopPropagation(); onClose?.(); return; }
      if (e.key !== 'Tab' || !node) return;
      const focusables = node.querySelectorAll(FOCUSABLE);
      if (focusables.length === 0) { e.preventDefault(); return; }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
      <button type="button" aria-label="Close" onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-neutral-900/50 dark:bg-black/70" />
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}
        className="relative bg-white dark:bg-neutral-800 rounded-xl shadow-lg border border-neutral-100 dark:border-neutral-700 w-full max-w-md max-h-[80vh] flex flex-col outline-none">
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
          <div className="min-w-0">
            <h2 id={titleId} className="text-sm font-semibold text-neutral-900 dark:text-white truncate">{drill.title}</h2>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
              {items.length} {items.length === 1 ? 'item' : 'items'}
              {sliceLabel && <span className="text-neutral-500 dark:text-neutral-500"> · {sliceLabel}</span>}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close"
            className="flex-shrink-0 ml-2 text-lg leading-none text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="overflow-y-auto p-2">
          {items.length === 0 ? (
            <p className="text-xs text-neutral-600 dark:text-neutral-600 p-4 text-center">No matching items.</p>
          ) : items.map(i => (
            <button key={i.id} type="button" onClick={() => onOpenItem(i)}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 rounded-md text-left hover:bg-neutral-50 dark:hover:bg-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 transition-colors">
              <span className="min-w-0 flex-1 truncate text-sm text-neutral-800 dark:text-neutral-200">{i.title}</span>
              <span className="flex items-center gap-2 flex-shrink-0">
                {i.priority && <span className="text-xs text-neutral-600 dark:text-neutral-400">{i.priority}</span>}
                <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">{i.status}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
