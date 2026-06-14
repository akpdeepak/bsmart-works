import { useEffect, useState } from 'react';
import { UserPlus, X, Share2 } from 'lucide-react';
import { kpiClient } from '@/lib/kpi';
import { useWorkspaceUsers } from '@/hooks/queries/useWorkspaceUsers';
import { Button } from '@/components/works/button';

// Molecule — voluntary individual metric-sharing control (Cap L, iteration 12; spec §3.8).
// The owner chooses to expose THEIR OWN personal metrics to one specific viewer (e.g. a
// manager before a 1:1). This is the only path by which one user's individual numbers
// become visible to another — managers can never drill into individuals otherwise
// (RB-40 §1). All HTTP via the kpi client / apiClient (CLAUDE.md §3). Tokens only, five
// interactive states, WCAG-AA labels + keyboard operability (RB-30 §1/§6).

export function MetricShareControl({ workspaceId }) {
  const [shares, setShares] = useState(null); // null = loading; [] = loaded-empty
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState('');
  const [adding, setAdding] = useState(false);
  const [revoking, setRevoking] = useState(null); // viewerUserId being revoked

  // The workspace member list (for the viewer picker) comes from the shared ONE-Source hook.
  const members = useWorkspaceUsers(workspaceId).data || [];

  // Load the current shares once per workspace (kpiClient is the source for sharing state).
  useEffect(() => {
    if (!workspaceId) return undefined;
    let active = true;
    Promise.resolve()
      .then(() => kpiClient.shares(workspaceId))
      .then((s) => {
        if (!active) return;
        setShares(Array.isArray(s) ? s : []);
        setError(null);
      })
      .catch((e) => { if (active) { setError(e.message || 'Could not load shares.'); setShares([]); } });
    return () => { active = false; };
  }, [workspaceId]);

  const sharedIds = new Set((shares || []).map((s) => s.viewerUserId));
  const candidates = members.filter((m) => !sharedIds.has(m.id));
  const nameFor = (id) => {
    const m = members.find((x) => x.id === id);
    return m ? (m.fullName || m.email || id) : id;
  };

  const addShare = () => {
    if (!selected || adding) return;
    setAdding(true);
    setError(null);
    kpiClient.share(workspaceId, selected)
      .then((created) => {
        setShares((prev) => [...(prev || []), created]);
        setSelected('');
      })
      .catch((e) => setError(e.message || 'Could not share metrics.'))
      .finally(() => setAdding(false));
  };

  const revokeShare = (viewerUserId) => {
    setRevoking(viewerUserId);
    setError(null);
    kpiClient.unshare(workspaceId, viewerUserId)
      .then(() => setShares((prev) => (prev || []).filter((s) => s.viewerUserId !== viewerUserId)))
      .catch((e) => setError(e.message || 'Could not revoke share.'))
      .finally(() => setRevoking(null));
  };

  return (
    <section
      aria-labelledby="metric-share-heading"
      className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900"
    >
      <div className="mb-2 flex items-center gap-2">
        <Share2 aria-hidden="true" className="h-4 w-4 text-brand-navy-tint" />
        <h3 id="metric-share-heading" className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
          Share my metrics with…
        </h3>
      </div>
      <p className="mb-3 text-xs text-neutral-600 dark:text-neutral-400">
        Your individual metrics are private. Choose specific people to share them with — for example,
        your manager before a 1:1. You can revoke access at any time.
      </p>

      {error && (
        <div className="mb-3 rounded-lg bg-semantic-danger-surface p-3 text-sm text-semantic-danger" role="alert">
          {error}
        </div>
      )}

      {/* Add a viewer */}
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <div>
          <label htmlFor="metric-share-viewer" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-600">
            Add viewer
          </label>
          <select
            id="metric-share-viewer"
            value={selected}
            disabled={shares === null || candidates.length === 0}
            onChange={(e) => setSelected(e.target.value)}
            className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-900 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          >
            <option value="">
              {candidates.length === 0 ? 'No one left to add' : 'Select a person…'}
            </option>
            {candidates.map((m) => (
              <option key={m.id} value={m.id}>{m.fullName || m.email || m.id}</option>
            ))}
          </select>
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          leftIcon={<UserPlus aria-hidden="true" className="h-4 w-4" />}
          loading={adding}
          disabled={!selected}
          onClick={addShare}
        >
          Share
        </Button>
      </div>

      {/* Current shares */}
      {shares === null ? (
        <div className="space-y-2" aria-hidden="true">
          {[0, 1].map((i) => (
            <div key={i} className="h-8 animate-pulse rounded-md bg-neutral-100 dark:bg-neutral-800" />
          ))}
        </div>
      ) : shares.length === 0 ? (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          You are not sharing your metrics with anyone yet.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {shares.map((s) => (
            <li
              key={s.viewerUserId}
              className="flex items-center justify-between gap-2 rounded-md border border-neutral-200 px-3 py-1.5 dark:border-neutral-700"
            >
              <span className="text-sm text-neutral-900 dark:text-neutral-100">{nameFor(s.viewerUserId)}</span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                leftIcon={<X aria-hidden="true" className="h-4 w-4" />}
                loading={revoking === s.viewerUserId}
                onClick={() => revokeShare(s.viewerUserId)}
                aria-label={`Revoke metric sharing with ${nameFor(s.viewerUserId)}`}
              >
                Revoke
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
