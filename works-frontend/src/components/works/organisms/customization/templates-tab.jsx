import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { configClient } from '@/lib/customization';
import { BTN_PRIMARY, BTN_DANGER, INPUT, CARD, Field, Empty } from './shared';

// ── Templates tab ────────────────────────────────────────────────────────────────
export function TemplatesTab({ workspaceId, templates, canManage, toast, onChanged, withImpact }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [shareable, setShareable] = useState(false);

  async function save() {
    try {
      await configClient.saveTemplate(workspaceId, name, description, shareable);
      toast('Saved current configuration as a template.', 'success');
      setName(''); setDescription(''); setShareable(false);
      onChanged();
    } catch (e) {
      toast(e.message || 'Save failed.', 'error');
    }
  }
  async function apply(t) {
    const tplDoc = t.document;
    withImpact(tplDoc, `Apply template "${t.name}"`, async () => {
      try {
        const saved = await configClient.applyTemplate(workspaceId, t.id);
        toast(`Applied "${t.name}" (version ${saved.currentVersion}).`, 'success');
        onChanged();
      } catch (e) {
        toast(e.message || 'Apply failed.', 'error');
      }
    });
  }
  async function remove(t) {
    try {
      await configClient.deleteTemplate(workspaceId, t.id);
      toast(`Deleted template "${t.name}".`, 'success');
      onChanged();
    } catch (e) {
      toast(e.message || 'Delete failed.', 'error');
    }
  }

  return (
    <div className="space-y-5">
      {canManage && (
        <div className={CARD}>
          <h2 className="mb-3 text-base font-semibold text-neutral-900 dark:text-neutral-100">Save current as template</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Name"><input className={INPUT} value={name} aria-label="Template name" onChange={(e) => setName(e.target.value)} /></Field>
            <Field label="Description"><input className={INPUT} value={description} aria-label="Template description" onChange={(e) => setDescription(e.target.value)} /></Field>
          </div>
          <label className="mt-3 inline-flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
            <input type="checkbox" checked={shareable} onChange={(e) => setShareable(e.target.checked)} />
            Shareable (visible to every workspace)
          </label>
          <div className="mt-3 flex justify-end">
            <button type="button" className={BTN_PRIMARY} disabled={!name.trim()} onClick={save}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Save template
            </button>
          </div>
        </div>
      )}
      {!templates.length ? (
        <Empty title="No templates yet" hint="Save the current configuration as a template to reuse it." />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {templates.map((t) => (
            <li key={t.id} className={CARD}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{t.name}</p>
                  <p className="text-xs text-neutral-600">{t.description || 'No description'}</p>
                </div>
                {t.shareable && <span className="rounded bg-brand-navy/10 px-1.5 py-0.5 text-xs font-medium text-brand-navy">Shareable</span>}
              </div>
              {canManage && (
                <div className="mt-3 flex gap-2">
                  <button type="button" className={BTN_PRIMARY} onClick={() => apply(t)}>Apply</button>
                  {t.ownerWorkspaceId === workspaceId && (
                    <button type="button" className={BTN_DANGER} onClick={() => remove(t)} aria-label={`Delete ${t.name}`}>
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
