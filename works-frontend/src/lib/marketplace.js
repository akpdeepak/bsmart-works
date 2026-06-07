// bSmart Works — App Marketplace + Developer Portal client (iteration 20, Cap R).
// Every call goes through the single apiClient (CLAUDE.md §3); this module just shapes the
// marketplace and developer-portal endpoints. The backend applies RBAC, workspace scoping and
// permission scoping (granted ⊆ requested) — callers pass the workspaceId on every call.

import { api } from '@/lib/apiClient';

const ws = (workspaceId) => encodeURIComponent(workspaceId);

export const marketplaceClient = {
  // ── Catalog (global-browsable, read) ──────────────────────────────────────
  listings: (workspaceId) => api.send(`/marketplace/listings?workspaceId=${ws(workspaceId)}`),
  listing: (workspaceId, id) =>
    api.send(`/marketplace/listings/${encodeURIComponent(id)}?workspaceId=${ws(workspaceId)}`),
  publish: (workspaceId, body) =>
    api.send(`/marketplace/listings?workspaceId=${ws(workspaceId)}`, { method: 'POST', body }),

  // ── Installs (workspace-scoped) ───────────────────────────────────────────
  installed: (workspaceId) => api.send(`/marketplace/installed?workspaceId=${ws(workspaceId)}`),
  install: (workspaceId, body) =>
    api.send(`/marketplace/install?workspaceId=${ws(workspaceId)}`, { method: 'POST', body }),
  setEnabled: (workspaceId, id, enabled) =>
    api.send(`/marketplace/installed/${encodeURIComponent(id)}/enabled?workspaceId=${ws(workspaceId)}`,
      { method: 'PUT', body: { enabled } }),
  uninstall: (workspaceId, id) =>
    api.send(`/marketplace/installed/${encodeURIComponent(id)}?workspaceId=${ws(workspaceId)}`,
      { method: 'DELETE' }),
};

export const developerPortalClient = {
  sdk: (workspaceId) => api.send(`/developer-portal/sdk?workspaceId=${ws(workspaceId)}`),
  sandboxCredentials: (workspaceId) =>
    api.send(`/developer-portal/sandbox-credentials?workspaceId=${ws(workspaceId)}`, { method: 'POST' }),
};

// Parse a comma-separated scope string (as stored) into a clean array.
export function parseScopes(csv) {
  if (!csv) return [];
  return csv.split(',').map((s) => s.trim()).filter(Boolean);
}
