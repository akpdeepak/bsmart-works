import { X } from 'lucide-react';

/**
 * DashboardDrillModal — drill-down modal that lists the work items behind a clicked
 * widget element. Each row opens that item's detail (no navigation away from the
 * dashboard).
 *
 * Extracted from App.jsx (TD-003).
 */
export function DashboardDrillModal({ drill, onClose, onOpenItem }) {
  const items = drill.items || [];
  // The widget passes the slice it was drilled from (§3.4): the dimension + the clicked value. We
  // surface it so it's clear the list is exactly that slice's underlying items — not the whole
  // dashboard. Absent for a whole-widget drill (e.g. a scorecard total).
  const ctx = drill.filterContext;
  const sliceLabel = ctx && ctx.value != null ? `${ctx.dimension}: ${ctx.value}` : null;
  return (
    <div className="fixed inset-0 bg-neutral-900/50 dark:bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={e => { if (e.key === 'Escape') onClose(); }}
      role="presentation" tabIndex={-1} aria-label={drill.title}>
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg border border-neutral-100 dark:border-neutral-700 w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-white truncate">{drill.title}</h2>
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
