import { Plus, Trash2 } from 'lucide-react';
import { BTN_GHOST, BTN_DANGER, INPUT, CARD, Field, BuilderShell } from './shared';
import { rid } from './helpers';

// ── Forms builder ──────────────────────────────────────────────────────────────
export function FormsTab({ doc, setDoc, canManage, saving, onSave }) {
  const forms = Array.isArray(doc.forms) ? doc.forms : [];
  const update = (next) => setDoc({ ...doc, forms: next });
  function addForm() { update([...forms, { id: rid('form'), name: 'New form', target: 'work_item', fields: [] }]); }
  function removeForm(i) { update(forms.filter((_, idx) => idx !== i)); }
  function setForm(i, patch) { update(forms.map((f, idx) => (idx === i ? { ...f, ...patch } : f))); }
  function addField(i) { setForm(i, { fields: [...(forms[i].fields || []), { key: rid('field'), label: 'Field', type: 'text', required: false }] }); }
  function setField(i, j, patch) { setForm(i, { fields: forms[i].fields.map((f, idx) => (idx === j ? { ...f, ...patch } : f)) }); }
  function removeField(i, j) { setForm(i, { fields: forms[i].fields.filter((_, idx) => idx !== j) }); }

  return (
    <BuilderShell title="Custom forms" description="Design data-entry forms with typed fields. Saved into the versioned config."
      canManage={canManage} saving={saving} onSave={() => onSave(doc)} onAdd={addForm} addLabel="Add form" empty={!forms.length}>
      {forms.map((form, i) => (
        <div key={form.id} className={CARD}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Form name"><input className={INPUT} value={form.name} disabled={!canManage} aria-label="Form name" onChange={(e) => setForm(i, { name: e.target.value })} /></Field>
            <Field label="Target"><input className={INPUT} value={form.target || ''} disabled={!canManage} aria-label="Form target" onChange={(e) => setForm(i, { target: e.target.value })} /></Field>
          </div>
          <div className="mt-3 space-y-2">
            {(form.fields || []).map((fld, j) => (
              <div key={fld.key} className="flex flex-wrap items-end gap-2">
                <div className="flex-1"><Field label="Label"><input className={INPUT} value={fld.label} disabled={!canManage} aria-label="Field label" onChange={(e) => setField(i, j, { label: e.target.value })} /></Field></div>
                <Field label="Type">
                  <select className={INPUT} value={fld.type} disabled={!canManage} aria-label="Field type" onChange={(e) => setField(i, j, { type: e.target.value })}>
                    {['text', 'number', 'date', 'select', 'checkbox', 'textarea'].map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <label className="inline-flex items-center gap-1 px-1 pb-2 text-xs text-neutral-700 dark:text-neutral-300">
                  <input type="checkbox" checked={!!fld.required} disabled={!canManage} aria-label="Required" onChange={(e) => setField(i, j, { required: e.target.checked })} /> Req
                </label>
                {canManage && <button type="button" className={BTN_DANGER} onClick={() => removeField(i, j)} aria-label="Remove field"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>}
              </div>
            ))}
          </div>
          {canManage && (
            <div className="mt-3 flex justify-between">
              <button type="button" className={BTN_GHOST} onClick={() => addField(i)}><Plus className="h-4 w-4" aria-hidden="true" /> Add field</button>
              <button type="button" className={BTN_DANGER} onClick={() => removeForm(i)}><Trash2 className="h-4 w-4" aria-hidden="true" /> Remove form</button>
            </div>
          )}
        </div>
      ))}
    </BuilderShell>
  );
}
