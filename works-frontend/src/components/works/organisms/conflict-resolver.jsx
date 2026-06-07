import { Modal } from '@/components/works/molecules/modal';
import { cn } from '@/lib/utils';

// Organism (iteration 18, Cap S — offline mode "Conflict resolution UI"). When a queued offline
// draft can't be applied because the item changed on the server, this shows both versions side by
// side and lets the user keep theirs (overwrite) or keep the server's (discard the draft). Purely
// presentational: the parent supplies the conflicts and handles the chosen resolution. Tokens only,
// five states on the actions, WCAG-AA.
export function ConflictResolver({ conflicts = [], onResolve, onClose }) {
  if (conflicts.length === 0) return null;

  return (
    <Modal title="Resolve sync conflicts" onClose={onClose} size="xl">
      <p className="mb-4 text-sm text-neutral-600">
        These items changed on the server while you were offline. Choose which version to keep for each.
      </p>
      <ul className="space-y-5">
        {conflicts.map((c) => (
          <li key={c.id} className="rounded-md border border-neutral-200 p-3 dark:border-neutral-700">
            <p className="mb-2 font-mono text-xs text-neutral-500">{c.id}</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Version heading="Your offline edit" value={c.draft} accent />
              <Version heading="Current server version" value={c.server} />
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <Action label="Keep server version" variant="ghost" onClick={() => onResolve?.(c, 'theirs')} />
              <Action label="Keep my changes" variant="primary" onClick={() => onResolve?.(c, 'mine')} />
            </div>
          </li>
        ))}
      </ul>
    </Modal>
  );
}

function Version({ heading, value = {}, accent }) {
  return (
    <div
      className={cn(
        'rounded-md p-2 text-sm',
        accent ? 'bg-brand-navy/5 dark:bg-brand-navy-tint/10' : 'bg-neutral-50 dark:bg-neutral-800',
      )}
    >
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-600">{heading}</p>
      <dl className="space-y-1">
        <Field label="Title" v={value.title} />
        <Field label="Status" v={value.status} />
        <Field label="Description" v={value.description} />
      </dl>
    </div>
  );
}

function Field({ label, v }) {
  if (v === undefined || v === null || v === '') return null;
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 text-xs text-neutral-500">{label}:</dt>
      <dd className="text-neutral-900 dark:text-neutral-100">{v}</dd>
    </div>
  );
}

function Action({ label, onClick, variant }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-fast active:translate-y-px',
        'focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variant === 'primary'
          ? 'bg-brand-navy text-white hover:bg-brand-navy-tint'
          : 'border border-neutral-300 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-800',
      )}
    >
      {label}
    </button>
  );
}
