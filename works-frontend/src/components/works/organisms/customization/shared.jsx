import { useEffect, useLayoutEffect, useRef } from 'react';
import { SlidersHorizontal, AlertTriangle, CheckCircle2, Lock, Unlock, Plus, Save } from 'lucide-react';

// Shared building blocks for the Customization surface tabs (RB-30 §6: tokens only, every
// interactive element labelled, explicit loading / empty / error states). Extracted from
// customization-view.jsx so each tab owns its render in its own file while reusing one set of
// presentational primitives, class tokens, the impact dialog and the pure helpers.

export const BTN_PRIMARY = 'inline-flex items-center gap-2 rounded-lg bg-brand-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-navy/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed';
export const BTN_GHOST = 'inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 disabled:opacity-50 disabled:cursor-not-allowed dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800';
export const BTN_DANGER = 'inline-flex items-center gap-2 rounded-lg border border-semantic-danger/30 px-3 py-2 text-sm font-medium text-semantic-danger transition-colors hover:bg-semantic-danger/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-semantic-danger/40 disabled:opacity-50';
export const INPUT = 'w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100';
export const LABEL = 'block text-xs font-semibold uppercase tracking-wide text-neutral-600 mb-1';
export const CARD = 'rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900';

export function Section({ title, lockPath, locked, canLock, onToggleLock, children }) {
  return (
    <div className={CARD}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{title}</h2>
        {locked && !canLock && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-neutral-600">
            <Lock className="h-3.5 w-3.5" aria-hidden="true" /> Locked
          </span>
        )}
        {canLock && lockPath && (
          <button type="button" onClick={() => onToggleLock(lockPath)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-pressed={locked} aria-label={`${locked ? 'Unlock' : 'Lock'} ${title}`}>
            {locked ? <Lock className="h-3.5 w-3.5" aria-hidden="true" /> : <Unlock className="h-3.5 w-3.5" aria-hidden="true" />}
            {locked ? 'Locked' : 'Unlocked'}
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <div>
      <span className={LABEL}>{label}</span>
      {children}
    </div>
  );
}

export function DiffTable({ title, rows }) {
  return (
    <div className={CARD}>
      <h3 className="mb-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">{title}</h3>
      {!rows.length ? (
        <p className="text-sm text-neutral-600">No differences.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-neutral-600">
              <th className="py-1 pr-3">Path</th><th className="py-1 pr-3">Change</th>
              <th className="py-1 pr-3">From</th><th className="py-1">To</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={`${r.path}-${i}`} className="border-t border-neutral-100 dark:border-neutral-800">
                <td className="py-1 pr-3 font-mono text-xs text-neutral-900 dark:text-neutral-200">{r.path}</td>
                <td className="py-1 pr-3"><ChangeBadge op={r.op} /></td>
                <td className="py-1 pr-3 text-neutral-600">{r.oldValue || '—'}</td>
                <td className="py-1 text-neutral-900 dark:text-neutral-200">{r.newValue || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function ChangeBadge({ op }) {
  const map = {
    ADDED: 'bg-semantic-success/10 text-semantic-success',
    REMOVED: 'bg-semantic-danger/10 text-semantic-danger',
    CHANGED: 'bg-semantic-warning/10 text-semantic-warning',
  };
  return <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${map[op] || 'bg-neutral-100 text-neutral-600'}`}>{op}</span>;
}

export function BuilderShell({ title, description, canManage, saving, onSave, onAdd, addLabel, empty, children }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{title}</h2>
          <p className="text-sm text-neutral-600">{description}</p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <button type="button" className={BTN_GHOST} onClick={onAdd}><Plus className="h-4 w-4" aria-hidden="true" /> {addLabel}</button>
            <button type="button" className={BTN_PRIMARY} disabled={saving} onClick={onSave}><Save className="h-4 w-4" aria-hidden="true" /> {saving ? 'Saving…' : 'Save'}</button>
          </div>
        )}
      </div>
      {empty ? <Empty title={`No ${title.toLowerCase()} yet`} hint={canManage ? `Use “${addLabel}” to create one.` : 'An admin can add these.'} /> : children}
    </div>
  );
}

// ── Impact dialog ────────────────────────────────────────────────────────────────
export function ImpactDialog({ impact, onCancel, onConfirm }) {
  const { report, title } = impact;
  const cancelRef = useRef(null);
  // a11y (RB-30 §6): a modal must be keyboard-operable — focus moves into it on open and Escape
  // dismisses it. Without these the dialog could only be closed by tabbing to the Cancel button.
  // The Escape listener lives on document (not the dialog node) because `role="dialog"` is a
  // non-interactive element and jsx-a11y forbids key handlers on it.
  useLayoutEffect(() => {
    cancelRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);
  return (
    <div
      className="fixed inset-0 z-modal flex items-center justify-center bg-neutral-900/40 p-4"
      role="dialog" aria-modal="true" aria-labelledby="impact-dialog-title"
    >
      <div className="w-full max-w-lg rounded-xl border border-neutral-200 bg-white p-5 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
        <h3 id="impact-dialog-title" className="text-lg font-bold text-neutral-900 dark:text-neutral-100">{title}</h3>
        <p className="mt-1 text-sm text-neutral-600">Impact analysis before this change lands:</p>
        <div className="mt-3 grid grid-cols-3 gap-3 text-center">
          <Stat n={report.affectedItems} label="Items" />
          <Stat n={report.affectedUsers} label="Users" />
          <Stat n={report.affectedAutomations} label="Automations" />
        </div>
        {report.warnings?.length > 0 && (
          <ul className="mt-3 space-y-1">
            {report.warnings.map((w, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-semantic-warning" aria-hidden="true" /> {w}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-neutral-600">{report.changes?.length || 0} field change(s) total.</p>
        <div className="mt-4 flex justify-end gap-2">
          <button ref={cancelRef} type="button" className={BTN_GHOST} onClick={onCancel}>Cancel</button>
          <button type="button" className={BTN_PRIMARY} onClick={onConfirm}><CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Continue</button>
        </div>
      </div>
    </div>
  );
}

function Stat({ n, label }) {
  return (
    <div className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
      <p className="text-2xl font-bold text-brand-navy dark:text-neutral-100">{n}</p>
      <p className="text-xs uppercase tracking-wide text-neutral-600">{label}</p>
    </div>
  );
}

// ── Shared states ────────────────────────────────────────────────────────────────
export function Loading() {
  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-4 h-8 w-48 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
      <div className="space-y-3">
        {[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800" />)}
      </div>
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="rounded-lg border border-semantic-danger/30 bg-semantic-danger/5 p-6 text-center">
      <AlertTriangle className="mx-auto h-8 w-8 text-semantic-danger" aria-hidden="true" />
      <p className="mt-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">{message}</p>
      <button type="button" className={`${BTN_GHOST} mt-3`} onClick={onRetry}>Try again</button>
    </div>
  );
}

export function Empty({ title, hint }) {
  return (
    <div className="rounded-lg border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
      <SlidersHorizontal className="mx-auto h-10 w-10 text-neutral-300" aria-hidden="true" />
      <p className="mt-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">{title}</p>
      <p className="text-sm text-neutral-600">{hint}</p>
    </div>
  );
}
