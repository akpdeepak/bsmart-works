import { Trash2 } from 'lucide-react';
import { BTN_DANGER, INPUT, CARD, Field, BuilderShell } from './shared';
import { rid } from './helpers';

// ── Extensions builder ───────────────────────────────────────────────────────────
export function ExtensionsTab({ doc, setDoc, extPoints, canManage, saving, onSave }) {
  const exts = Array.isArray(doc.extensions) ? doc.extensions : [];
  const hooks = extPoints.length ? extPoints : [{ id: 'work_item.before_create', label: 'Before work item created' }];
  const update = (next) => setDoc({ ...doc, extensions: next });
  function add() { update([...exts, { id: rid('ext'), name: 'New extension', hook: hooks[0].id, code: '', enabled: false }]); }
  function setExt(i, patch) { update(exts.map((e, idx) => (idx === i ? { ...e, ...patch } : e))); }
  function remove(i) { update(exts.filter((_, idx) => idx !== i)); }

  return (
    <BuilderShell title="Code extensions" description="Bind JavaScript to a named extension point for cases the UI cannot express."
      canManage={canManage} saving={saving} onSave={() => onSave(doc)} onAdd={add} addLabel="Add extension" empty={!exts.length}>
      <div className="rounded-lg border border-brand-navy/20 bg-brand-navy/5 p-3 text-sm text-neutral-700 dark:text-neutral-300">
        Extensions are stored, versioned and audited here. Execution runs in an isolated sandbox
        (security-reviewed) and is delivered as a follow-up — definitions saved now will not run yet.
      </div>
      {exts.map((ext, i) => (
        <div key={ext.id} className={CARD}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Name"><input className={INPUT} value={ext.name} disabled={!canManage} aria-label="Extension name" onChange={(e) => setExt(i, { name: e.target.value })} /></Field>
            <Field label="Extension point">
              <select className={INPUT} value={ext.hook} disabled={!canManage} aria-label="Extension point" onChange={(e) => setExt(i, { hook: e.target.value })}>
                {hooks.map((h) => <option key={h.id} value={h.id}>{h.label}</option>)}
              </select>
            </Field>
          </div>
          <div className="mt-3">
            <Field label="Code (JavaScript)">
              <textarea className={`${INPUT} h-32 font-mono`} value={ext.code} disabled={!canManage} aria-label="Extension code"
                onChange={(e) => setExt(i, { code: e.target.value })} />
            </Field>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <label className="inline-flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
              <input type="checkbox" checked={!!ext.enabled} disabled={!canManage} aria-label="Enabled" onChange={(e) => setExt(i, { enabled: e.target.checked })} /> Enabled
            </label>
            {canManage && <button type="button" className={BTN_DANGER} onClick={() => remove(i)}><Trash2 className="h-4 w-4" aria-hidden="true" /> Remove</button>}
          </div>
        </div>
      ))}
    </BuilderShell>
  );
}
