// WI-11 — feature-flag client (UIUX-EXECUTION-PLAN.md).
// Server-side flags only: no third-party SDK, no client-side tracking (RB-40 §3, DPDP).
// GET /feature-flags?workspaceId= returns all flags with per-workspace overrides applied.

import { api } from '@/lib/apiClient';

const ws = (workspaceId) => encodeURIComponent(workspaceId);

export const featureFlagsClient = {
  getAll: (workspaceId) => api.send(`/feature-flags?workspaceId=${ws(workspaceId)}`),

  setOverride: (workspaceId, flagName, enabled, variant = null) =>
    api.send(`/feature-flags/${encodeURIComponent(flagName)}/override?workspaceId=${ws(workspaceId)}`, {
      method: 'PUT',
      body: { enabled, variant },
    }),

  resetOverride: (workspaceId, flagName) =>
    api.send(`/feature-flags/${encodeURIComponent(flagName)}/override?workspaceId=${ws(workspaceId)}`, {
      method: 'DELETE',
    }),
};
