import { useState } from 'react';
import { FlaskConical, Plus, Trash2 } from 'lucide-react';
import { configClient } from '@/lib/customization';
import { absoluteDateTime } from '@/lib/format';
import { BTN_PRIMARY, BTN_GHOST, BTN_DANGER, INPUT, CARD, Field, Empty } from './shared';
import { pretty } from './helpers';

// ── Sandbox tab ────────────────────────────────────────────────────────────────
export function SandboxTab({ workspaceId, sandboxes, canManage, toast, onChanged, withImpact }) {
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(null); // { id, document }

  async function create() {
    try {
      await configClient.createSandbox(workspaceId, name);
      toast(`Created sandbox "${name}".`, 'success');
      setName('');
      onChanged();
    } catch (e) {
      toast(e.message || 'Create failed.', 'error');
    }
  }
  async function open(s) {
    try {
      const full = await configClient.sandbox(workspaceId, s.id);
      setEditing({ id: s.id, document: pretty(full.document) });
    } catch (e) {
      toast(e.message || 'Could not open sandbox.', 'error');
    }
  }
  async function saveDraft() {
    try {
      await configClient.updateSandbox(workspaceId, editing.id, editing.document);
      toast('Sandbox draft saved.', 'success');
      setEditing(null);
      onChanged();
    } catch (e) {
      toast(e.message || 'Save failed.', 'error');
    }
  }
  async function promote(s) {
    let full;
    try { full = await configClient.sandbox(workspaceId, s.id); } catch (e) { toast(e.message, 'error'); return; }
    withImpact(full.document, `Promote sandbox "${s.name}"`, async () => {
      try {
        const saved = await configClient.promoteSandbox(workspaceId, s.id);
        toast(`Promoted "${s.name}" to live (version ${saved.currentVersion}).`, 'success');
        onChanged();
      } catch (e) {
        toast(e.message || 'Promote failed.', 'error');
      }
    });
  }
  async function discard(s) {
    try {
      await configClient.discardSandbox(workspaceId, s.id);
      toast(`Discarded "${s.name}".`, 'success');
      onChanged();
    } catch (e) {
      toast(e.message || 'Discard failed.', 'error');
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-semantic-warning/30 bg-semantic-warning/5 p-3 text-sm text-neutral-700 dark:text-neutral-300">
        <span className="inline-flex items-center gap-1 font-medium text-semantic-warning">
          <FlaskConical className="h-4 w-4" aria-hidden="true" /> Sandbox
        </span>{' '}
        — changes here stay isolated until you promote them. Promotion runs impact analysis first.
      </div>
      {canManage && (
        <div className={`${CARD} flex flex-wrap items-end gap-3`}>
          <div className="flex-1"><Field label="New sandbox name"><input className={INPUT} value={name} aria-label="Sandbox name" onChange={(e) => setName(e.target.value)} /></Field></div>
          <button type="button" className={BTN_PRIMARY} disabled={!name.trim()} onClick={create}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Create from live
          </button>
        </div>
      )}
      {!sandboxes.length ? (
        <Empty title="No sandboxes" hint="Create a sandbox to preview config changes safely." />
      ) : (
        <ul className="space-y-2">
          {sandboxes.map((s) => (
            <li key={s.id} className={`${CARD} flex flex-wrap items-center justify-between gap-3`}>
              <div>
                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{s.name}
                  <span className="ml-2 rounded bg-neutral-100 px-1.5 py-0.5 text-xs font-medium text-neutral-600 dark:bg-neutral-800">{s.status}</span>
                </p>
                <p className="text-xs text-neutral-600">Forked from version {s.baseVersion} · {absoluteDateTime(s.createdAt)}</p>
              </div>
              {canManage && s.status === 'DRAFT' && (
                <div className="flex gap-2">
                  <button type="button" className={BTN_GHOST} onClick={() => open(s)}>Edit</button>
                  <button type="button" className={BTN_PRIMARY} onClick={() => promote(s)}>Promote</button>
                  <button type="button" className={BTN_DANGER} onClick={() => discard(s)} aria-label={`Discard ${s.name}`}>
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {editing && (
        <div className={CARD}>
          <h3 className="mb-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Edit sandbox document</h3>
          <textarea className={`${INPUT} h-64 font-mono`} value={editing.document} aria-label="Sandbox document"
            onChange={(e) => setEditing({ ...editing, document: e.target.value })} />
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" className={BTN_GHOST} onClick={() => setEditing(null)}>Cancel</button>
            <button type="button" className={BTN_PRIMARY} onClick={saveDraft}>Save draft</button>
          </div>
        </div>
      )}
    </div>
  );
}
