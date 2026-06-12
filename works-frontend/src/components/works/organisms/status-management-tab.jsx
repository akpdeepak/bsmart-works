import { useEffect, useRef, useState, useCallback } from 'react';
import { ChevronUp, ChevronDown, Trash2, Plus, Flag } from 'lucide-react';
import { Button } from '@/components/works/button';
import { EmptyState } from '@/components/works/atoms/empty-state';
import { Settings } from 'lucide-react';
import { ALL_TYPES, CATEGORIES, resolveTypeIcon } from '@/lib/work-item-types';
import { cn } from '@/lib/utils';

// Category + outcome vocabularies (backend-canonical values → friendly labels).
const CATEGORY_OPTIONS = [
  { value: 'TODO',        label: 'To Do' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'DONE',        label: 'Done' },
];
const OUTCOME_OPTIONS = [
  { value: 'NEUTRAL',  label: 'Neutral' },
  { value: 'POSITIVE', label: 'Completed' },
  { value: 'NEGATIVE', label: 'Closed-out' },
];

// Category chip tint (tokens only — RB-30 §1).
const CAT_CHIP = {
  TODO:        'bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200',
  IN_PROGRESS: 'bg-brand-navy/10 text-brand-navy dark:text-brand-navy-tint',
  DONE:        'bg-semantic-success/10 text-semantic-success',
};

const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
const hrs = (v) => (v === null || v === undefined ? '' : String(v));

/**
 * Status Management — per-type status definitions, backed by the workflow engine
 * (workflow / workflow_status). Add, modify, delete, reorder, recategorise, recolour, and set
 * lapse thresholds (warn / breach hours) for each work-item type. Self-contained: fetches
 * /status-config (which seeds workspace defaults on first read) and mutates through the existing
 * /workflows/{id}/statuses CRUD endpoints.
 */
export default function StatusManagementTab({ api, workspaceId, reportError }) {
  const [configs, setConfigs] = useState(null); // null = loading
  const [selectedType, setSelectedType] = useState(ALL_TYPES[0]?.typeKey ?? null);
  const [adding, setAdding] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', category: 'TODO', color: '#94A3B8' });
  const [busy, setBusy] = useState(false);
  const addInputRef = useRef(null);
  useEffect(() => { if (adding) addInputRef.current?.focus(); }, [adding]);

  const load = useCallback(() => {
    if (!workspaceId) return;
    api.send(`/status-config?workspaceId=${encodeURIComponent(workspaceId)}`)
      .then((rows) => setConfigs(Array.isArray(rows) ? rows : []))
      .catch((e) => { setConfigs([]); reportError?.(e); });
  }, [api, workspaceId, reportError]);

  useEffect(() => { load(); }, [load]);

  const current = configs?.find((c) => c.typeKey === selectedType) ?? null;
  const statuses = current?.statuses ?? [];
  const wfId = current?.workflowId ?? null;
  const countFor = (typeKey) => configs?.find((c) => c.typeKey === typeKey)?.statuses?.length ?? 0;

  // ── Mutations (reuse /workflows/{wfId}/statuses CRUD) ──────────────────────────
  const mutate = async (fn) => {
    if (busy) return;
    setBusy(true);
    try { await fn(); load(); }
    catch (e) { reportError?.(e); }
    finally { setBusy(false); }
  };

  const patchStatus = (s, patch) => mutate(() =>
    api.send(`/workflows/${wfId}/statuses/${s.id}`, { method: 'PUT', body: { ...s, ...patch } }));

  const deleteStatus = (s) => {
    if (!window.confirm(`Delete status "${s.name}"? Items currently in this status keep their value until moved.`)) return;
    mutate(() => api.send(`/workflows/${wfId}/statuses/${s.id}`, { method: 'DELETE' }).catch((e) => {
      // DELETE returns 204 (no body) — api.send tries to parse JSON; treat empty as success.
      if (e?.status && e.status !== 204) throw e;
    }));
  };

  const move = (idx, dir) => {
    const next = idx + dir;
    if (next < 0 || next >= statuses.length) return;
    const reordered = [...statuses];
    [reordered[idx], reordered[next]] = [reordered[next], reordered[idx]];
    const order = reordered.map((s, pos) => ({ id: s.id, position: pos }));
    mutate(() => api.send(`/workflows/${wfId}/statuses/reorder`, { method: 'PUT', body: order }));
  };

  const setInitial = (s) => mutate(async () => {
    const prev = statuses.find((x) => x.isInitial && x.id !== s.id);
    if (prev) await api.send(`/workflows/${wfId}/statuses/${prev.id}`, { method: 'PUT', body: { ...prev, isInitial: false } });
    await api.send(`/workflows/${wfId}/statuses/${s.id}`, { method: 'PUT', body: { ...s, isInitial: true } });
  });

  const addStatus = () => {
    if (!addForm.name.trim() || !wfId) return;
    mutate(() => api.send(`/workflows/${wfId}/statuses`, {
      method: 'POST',
      body: {
        name: addForm.name.trim(),
        category: addForm.category,
        color: addForm.color,
        position: statuses.length,
        isInitial: statuses.length === 0,
        outcome: 'NEUTRAL',
      },
    }));
    setAddForm({ name: '', category: 'TODO', color: '#94A3B8' });
    setAdding(false);
  };

  if (configs === null) {
    return (
      <div className="py-10" aria-busy="true" aria-label="Loading statuses">
        <div className="h-4 w-40 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse mb-3" />
        <div className="h-24 w-full bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex gap-6" style={{ minHeight: '520px' }}>
      {/* Left — type list grouped by category */}
      <div className="w-52 flex-shrink-0 space-y-5">
        {Object.entries(CATEGORIES).map(([catKey, cat]) => (
          <div key={catKey}>
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5 px-2">{cat.label}</p>
            <div className="space-y-0.5">
              {ALL_TYPES.filter((t) => t.category === catKey).map((t) => {
                const Icon = resolveTypeIcon(t.icon);
                const sel = selectedType === t.typeKey;
                return (
                  <button key={t.typeKey} onClick={() => { setSelectedType(t.typeKey); setAdding(false); }}
                    className={cn(
                      'w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-sm transition-colors',
                      sel ? 'bg-brand-navy text-white' : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                    )}>
                    <span className="flex items-center gap-2 min-w-0">
                      {Icon && <Icon className={cn('h-3.5 w-3.5 flex-shrink-0', sel ? 'text-white' : 'text-neutral-400')} aria-hidden="true" />}
                      <span className="truncate">{t.label}</span>
                    </span>
                    <span className={cn('text-xs', sel ? 'text-white/70' : 'text-neutral-400')}>{countFor(t.typeKey)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Right — status editor for the selected type */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">
              {ALL_TYPES.find((t) => t.typeKey === selectedType)?.label} statuses
            </h2>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
              Each status maps to one of three categories. Warn / breach hours drive the time-in-status colour on the work item.
            </p>
          </div>
          {!adding && wfId && (
            <Button variant="secondary" size="sm" onClick={() => setAdding(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" aria-hidden="true" /> Add status
            </Button>
          )}
        </div>

        {!wfId ? (
          <EmptyState icon={Settings} title="No statuses yet" subtitle="Default statuses will appear here once loaded." />
        ) : (
          <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden">
            {/* Column header */}
            <div className="grid grid-cols-[28px_1fr_120px_84px_84px_110px_64px] gap-2 items-center px-4 py-2 border-b border-neutral-100 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              <span></span>
              <span>Status</span>
              <span>Category</span>
              <span>Warn (h)</span>
              <span>Breach (h)</span>
              <span>Outcome</span>
              <span className="text-right">Remove</span>
            </div>

            {statuses.map((s, idx) => (
              <StatusRow
                key={`${s.id}:${s.name}:${s.warnHours}:${s.breachHours}:${s.color}`}
                s={s}
                idx={idx}
                total={statuses.length}
                busy={busy}
                onPatch={patchStatus}
                onMove={move}
                onDelete={deleteStatus}
                onSetInitial={setInitial}
              />
            ))}

            {/* Add-status row */}
            {adding && (
              <div className="grid grid-cols-[28px_1fr_120px_84px_84px_110px_64px] gap-2 items-center px-4 py-2.5 bg-brand-navy/5 border-t border-neutral-100 dark:border-neutral-700">
                <input type="color" value={addForm.color} onChange={(e) => setAddForm((f) => ({ ...f, color: e.target.value }))}
                  className="h-6 w-6 rounded cursor-pointer border border-neutral-200 dark:border-neutral-600 bg-transparent p-0" aria-label="Status color" />
                <input ref={addInputRef} type="text" value={addForm.name} placeholder="New status name"
                  onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') addStatus(); if (e.key === 'Escape') setAdding(false); }}
                  className="text-sm border border-neutral-200 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100 rounded px-2 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40" />
                <select value={addForm.category} onChange={(e) => setAddForm((f) => ({ ...f, category: e.target.value }))}
                  className="text-xs border border-neutral-200 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-200 rounded px-1.5 py-1 focus:outline-none">
                  {CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <span className="text-xs text-neutral-300 text-center col-span-2">—</span>
                <div className="col-span-2 flex items-center justify-end gap-1.5">
                  <Button size="sm" variant="action" onClick={addStatus}>Add</Button>
                  <button onClick={() => setAdding(false)} className="text-xs text-neutral-500 hover:text-neutral-700 px-1">Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Single editable status row ────────────────────────────────────────────────
// Local field state is seeded from props once; the parent re-keys this row on any server-side
// value change (after a refetch), which remounts it with fresh values — so no sync effect is
// needed. Commits happen on blur, by which point focus has already left the input.
function StatusRow({ s, idx, total, busy, onPatch, onMove, onDelete, onSetInitial }) {
  const [name, setName] = useState(s.name);
  const [warn, setWarn] = useState(hrs(s.warnHours));
  const [breach, setBreach] = useState(hrs(s.breachHours));

  const commitName = () => { const v = name.trim(); if (v && v !== s.name) onPatch(s, { name: v }); else setName(s.name); };
  const commitWarn = () => { if (num(warn) !== s.warnHours) onPatch(s, { warnHours: num(warn) }); };
  const commitBreach = () => { if (num(breach) !== s.breachHours) onPatch(s, { breachHours: num(breach) }); };

  return (
    <div className="grid grid-cols-[28px_1fr_120px_84px_84px_110px_64px] gap-2 items-center px-4 py-2 border-b border-neutral-50 dark:border-neutral-700 last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-700/40">
      {/* Reorder + color */}
      <div className="flex flex-col items-center -my-1">
        <button onClick={() => onMove(idx, -1)} disabled={idx === 0 || busy} aria-label="Move up"
          className="text-neutral-300 hover:text-neutral-600 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronUp className="h-3.5 w-3.5" aria-hidden="true" /></button>
        <button onClick={() => onMove(idx, 1)} disabled={idx === total - 1 || busy} aria-label="Move down"
          className="text-neutral-300 hover:text-neutral-600 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronDown className="h-3.5 w-3.5" aria-hidden="true" /></button>
      </div>

      {/* Color + name + initial */}
      <div className="flex items-center gap-2 min-w-0">
        <input type="color" value={s.color || '#94A3B8'} onChange={(e) => onPatch(s, { color: e.target.value })}
          className="h-5 w-5 rounded cursor-pointer border border-neutral-200 dark:border-neutral-600 bg-transparent p-0 flex-shrink-0" aria-label={`Color for ${s.name}`} />
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} onBlur={commitName}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          className="text-sm bg-transparent border border-transparent hover:border-neutral-200 dark:hover:border-neutral-600 focus:border-brand-navy-tint rounded px-1.5 py-1 min-w-0 flex-1 focus:outline-none text-neutral-900 dark:text-neutral-100" />
        <button onClick={() => onSetInitial(s)} disabled={busy} title={s.isInitial ? 'Initial status' : 'Set as initial status'}
          aria-label={s.isInitial ? 'Initial status' : 'Set as initial status'}
          className={cn('flex-shrink-0 p-0.5', s.isInitial ? 'text-brand-orange' : 'text-neutral-300 hover:text-neutral-500')}>
          <Flag className={cn('h-3.5 w-3.5', s.isInitial && 'fill-current')} aria-hidden="true" />
        </button>
      </div>

      {/* Category */}
      <select value={s.category} onChange={(e) => onPatch(s, { category: e.target.value })} disabled={busy}
        className={cn('text-xs rounded px-1.5 py-1 border-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 font-medium', CAT_CHIP[s.category] || CAT_CHIP.TODO)}>
        {CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>

      {/* Warn / breach hours */}
      <input type="number" min="0" step="0.25" value={warn} onChange={(e) => setWarn(e.target.value)} onBlur={commitWarn}
        placeholder="—"
        className="text-xs text-center border border-neutral-200 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-200 rounded px-1.5 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40" />
      <input type="number" min="0" step="0.25" value={breach} onChange={(e) => setBreach(e.target.value)} onBlur={commitBreach}
        placeholder="—"
        className="text-xs text-center border border-neutral-200 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-200 rounded px-1.5 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40" />

      {/* Outcome */}
      <select value={s.outcome || 'NEUTRAL'} onChange={(e) => onPatch(s, { outcome: e.target.value })} disabled={busy}
        className="text-xs border border-neutral-200 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-200 rounded px-1.5 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40">
        {OUTCOME_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>

      {/* Delete */}
      <div className="text-right">
        <button onClick={() => onDelete(s)} disabled={busy} aria-label={`Delete ${s.name}`}
          className="text-neutral-300 hover:text-semantic-danger disabled:opacity-30 p-1">
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
