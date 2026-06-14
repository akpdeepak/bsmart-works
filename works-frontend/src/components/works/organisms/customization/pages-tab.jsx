import { Plus, Trash2 } from 'lucide-react';
import { BTN_GHOST, BTN_DANGER, INPUT, CARD, Field, BuilderShell } from './shared';
import { rid } from './helpers';

// ── Pages builder ──────────────────────────────────────────────────────────────
export function PagesTab({ doc, setDoc, canManage, saving, onSave }) {
  const pages = Array.isArray(doc.pages) ? doc.pages : [];
  const update = (next) => setDoc({ ...doc, pages: next });
  function addPage() { update([...pages, { id: rid('page'), name: 'New page', roles: ['ADMIN'], widgets: [] }]); }
  function setPage(i, patch) { update(pages.map((p, idx) => (idx === i ? { ...p, ...patch } : p))); }
  function removePage(i) { update(pages.filter((_, idx) => idx !== i)); }
  function addWidget(i) { setPage(i, { widgets: [...(pages[i].widgets || []), { type: 'list', title: 'Widget' }] }); }
  function setWidget(i, j, patch) { setPage(i, { widgets: pages[i].widgets.map((w, idx) => (idx === j ? { ...w, ...patch } : w)) }); }
  function removeWidget(i, j) { setPage(i, { widgets: pages[i].widgets.filter((_, idx) => idx !== j) }); }

  return (
    <BuilderShell title="Custom pages" description="Build landing pages from widgets with per-role assignment."
      canManage={canManage} saving={saving} onSave={() => onSave(doc)} onAdd={addPage} addLabel="Add page" empty={!pages.length}>
      {pages.map((page, i) => (
        <div key={page.id} className={CARD}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Page name"><input className={INPUT} value={page.name} disabled={!canManage} aria-label="Page name" onChange={(e) => setPage(i, { name: e.target.value })} /></Field>
            <Field label="Roles (comma-separated)"><input className={INPUT} value={(page.roles || []).join(', ')} disabled={!canManage} aria-label="Page roles" onChange={(e) => setPage(i, { roles: e.target.value.split(',').map((r) => r.trim()).filter(Boolean) })} /></Field>
          </div>
          <div className="mt-3 space-y-2">
            {(page.widgets || []).map((w, j) => (
              <div key={`${page.id}-w-${j}`} className="flex flex-wrap items-end gap-2">
                <div className="flex-1"><Field label="Title"><input className={INPUT} value={w.title} disabled={!canManage} aria-label="Widget title" onChange={(e) => setWidget(i, j, { title: e.target.value })} /></Field></div>
                <Field label="Type">
                  <select className={INPUT} value={w.type} disabled={!canManage} aria-label="Widget type" onChange={(e) => setWidget(i, j, { type: e.target.value })}>
                    {['list', 'chart', 'stat', 'text', 'table'].map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                {canManage && <button type="button" className={BTN_DANGER} onClick={() => removeWidget(i, j)} aria-label="Remove widget"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>}
              </div>
            ))}
          </div>
          {canManage && (
            <div className="mt-3 flex justify-between">
              <button type="button" className={BTN_GHOST} onClick={() => addWidget(i)}><Plus className="h-4 w-4" aria-hidden="true" /> Add widget</button>
              <button type="button" className={BTN_DANGER} onClick={() => removePage(i)}><Trash2 className="h-4 w-4" aria-hidden="true" /> Remove page</button>
            </div>
          )}
        </div>
      ))}
    </BuilderShell>
  );
}
