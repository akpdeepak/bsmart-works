import { useRef, useState } from 'react';
import { Bookmark, ChevronDown, ChevronUp, Pencil, Trash2, X, Check } from 'lucide-react';
import { Button } from '@/components/works/button';
import { useSavedViews, useSavedViewMutations } from '@/hooks/queries/useSavedViews';

/**
 * SavedViewsPanel — first-class management of saved views per list section (WI-15).
 *
 * Renders saved views as a vertical list with:
 *   - click-to-load (calls onLoad(view))
 *   - inline rename (pencil → input → Enter/blur saves)
 *   - move-up / move-down reorder (persisted via displayOrder)
 *   - delete with inline confirm (X → confirm row → Yes / No)
 *
 * Props:
 *   workspaceId  — required; scopes the view list
 *   projectId    — optional; filters to a single project
 *   activeViewId — the currently loaded view id (highlighted)
 *   onLoad(view) — called when the user clicks a view name to load it
 */
export function SavedViewsPanel({ workspaceId, projectId, activeViewId, onLoad }) {
  const { data: views = [], isLoading } = useSavedViews(workspaceId, projectId);
  const { rename, remove, reorder } = useSavedViewMutations(workspaceId, projectId);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [confirmId, setConfirmId] = useState(null);
  const editRef = useRef(null);

  function startEdit(view) {
    setEditingId(view.id);
    setEditName(view.name);
    setConfirmId(null);
    setTimeout(() => editRef.current?.select(), 0);
  }

  function commitEdit(id) {
    const trimmed = editName.trim();
    if (trimmed.length >= 1 && trimmed !== views.find((v) => v.id === id)?.name) {
      rename.mutate({ id, name: trimmed });
    }
    setEditingId(null);
  }

  function handleEditKey(e, id) {
    if (e.key === 'Enter') { e.preventDefault(); commitEdit(id); }
    if (e.key === 'Escape') { e.preventDefault(); setEditingId(null); }
  }

  function moveUp(idx) {
    if (idx === 0) return;
    const above = views[idx - 1];
    const cur = views[idx];
    const aboveOrder = above.displayOrder ?? idx - 1;
    const curOrder = cur.displayOrder ?? idx;
    reorder.mutate({ id: cur.id, displayOrder: aboveOrder - 0.5 });
    reorder.mutate({ id: above.id, displayOrder: curOrder + 0.5 });
  }

  function moveDown(idx) {
    if (idx >= views.length - 1) return;
    const below = views[idx + 1];
    const cur = views[idx];
    const belowOrder = below.displayOrder ?? idx + 1;
    const curOrder = cur.displayOrder ?? idx;
    reorder.mutate({ id: cur.id, displayOrder: belowOrder + 0.5 });
    reorder.mutate({ id: below.id, displayOrder: curOrder - 0.5 });
  }

  if (isLoading) {
    return (
      <div className="space-y-1.5 px-1 py-2" role="status" aria-busy="true" aria-label="Loading saved views">
        {[1, 2, 3].map((n) => (
          <div key={n} className="h-7 animate-pulse rounded-md bg-neutral-100 dark:bg-neutral-700" />
        ))}
      </div>
    );
  }

  if (views.length === 0) {
    return (
      <p className="px-2 py-3 text-xs text-neutral-400 dark:text-neutral-600">
        No saved views yet.
      </p>
    );
  }

  return (
    <ul aria-label="Saved views" className="space-y-0.5">
      {views.map((view, idx) => {
        const isActive = view.id === activeViewId;
        const isEditing = editingId === view.id;
        const isConfirming = confirmId === view.id;

        return (
          <li key={view.id} className="group">
            {isConfirming ? (
              <div className="flex items-center gap-1.5 rounded-md bg-semantic-danger/5 px-2 py-1.5">
                <Trash2 aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-semantic-danger" />
                <span className="flex-1 truncate text-xs text-semantic-danger">Delete &ldquo;{view.name}&rdquo;?</span>
                <Button size="sm" variant="danger" onClick={() => { remove.mutate(view.id); setConfirmId(null); }}>
                  Yes
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmId(null)}>No</Button>
              </div>
            ) : (
              <div className={`flex items-center gap-1 rounded-md px-2 py-1.5 transition-colors ${isActive ? 'bg-brand-navy/10 dark:bg-brand-navy/20' : 'hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}>
                <Bookmark aria-hidden="true" className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-brand-navy' : 'text-neutral-400'}`} />

                {isEditing ? (
                  <input
                    ref={editRef}
                    type="text"
                    value={editName}
                    aria-label="Rename view"
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => commitEdit(view.id)}
                    onKeyDown={(e) => handleEditKey(e, view.id)}
                    className="min-w-0 flex-1 rounded border border-brand-navy bg-white px-1 py-0 text-xs text-neutral-900 outline-none focus:ring-1 focus:ring-brand-navy dark:bg-neutral-800 dark:text-neutral-100"
                  />
                ) : (
                  <button
                    type="button"
                    className="min-w-0 flex-1 truncate text-left text-xs font-medium text-neutral-800 hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 dark:text-neutral-200"
                    onClick={() => onLoad?.(view)}
                    aria-current={isActive ? 'true' : undefined}
                  >
                    {view.name}
                  </button>
                )}

                {/* Reorder + rename + delete — visible on hover or when editing */}
                <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                  <button type="button" onClick={() => moveUp(idx)} disabled={idx === 0}
                    aria-label={`Move "${view.name}" up`}
                    className="rounded p-0.5 text-neutral-400 hover:text-neutral-700 disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 dark:hover:text-neutral-200">
                    <ChevronUp className="h-3 w-3" aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => moveDown(idx)} disabled={idx >= views.length - 1}
                    aria-label={`Move "${view.name}" down`}
                    className="rounded p-0.5 text-neutral-400 hover:text-neutral-700 disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 dark:hover:text-neutral-200">
                    <ChevronDown className="h-3 w-3" aria-hidden="true" />
                  </button>
                  {isEditing ? (
                    <button type="button" onClick={() => commitEdit(view.id)}
                      aria-label="Save rename"
                      className="rounded p-0.5 text-semantic-success hover:text-semantic-success focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40">
                      <Check className="h-3 w-3" aria-hidden="true" />
                    </button>
                  ) : (
                    <button type="button" onClick={() => startEdit(view)}
                      aria-label={`Rename "${view.name}"`}
                      className="rounded p-0.5 text-neutral-400 hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 dark:hover:text-neutral-200">
                      <Pencil className="h-3 w-3" aria-hidden="true" />
                    </button>
                  )}
                  <button type="button" onClick={() => { setConfirmId(view.id); setEditingId(null); }}
                    aria-label={`Delete "${view.name}"`}
                    className="rounded p-0.5 text-neutral-400 hover:text-semantic-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40">
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
