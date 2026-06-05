// bSmart Works — KPI Framework client (iteration 12, Cap L). Every call goes through the single
// apiClient (CLAUDE.md §3); this module just shapes the /kpi endpoints. Privacy is enforced server
// side (RB-40 §1): personal metrics are self-or-shared only, and the manager view returns aggregated
// data with no path to an individual's numbers.

import { api } from '@/lib/apiClient';

const ws = (workspaceId) => encodeURIComponent(workspaceId);

export const kpiClient = {
  catalog: (workspaceId) => api.send(`/kpi/catalog?workspaceId=${ws(workspaceId)}`),
  definitions: (workspaceId) => api.send(`/kpi/definitions?workspaceId=${ws(workspaceId)}`),
  createDefinition: (workspaceId, def) =>
    api.send(`/kpi/definitions?workspaceId=${ws(workspaceId)}`, { method: 'POST', body: def }),

  personal: (workspaceId, userId) =>
    api.send(`/kpi/personal?workspaceId=${ws(workspaceId)}${userId ? `&userId=${encodeURIComponent(userId)}` : ''}`),
  team: (workspaceId, teamId) =>
    api.send(`/kpi/team?workspaceId=${ws(workspaceId)}&teamId=${encodeURIComponent(teamId)}`),
  project: (workspaceId, projectId) =>
    api.send(`/kpi/project?workspaceId=${ws(workspaceId)}&projectId=${encodeURIComponent(projectId)}`),
  manager: (workspaceId) => api.send(`/kpi/manager?workspaceId=${ws(workspaceId)}`),
  org: (workspaceId) => api.send(`/kpi/org?workspaceId=${ws(workspaceId)}`),
  health: (workspaceId, teamId) =>
    api.send(`/kpi/health?workspaceId=${ws(workspaceId)}&teamId=${encodeURIComponent(teamId)}`),
  distribution: (workspaceId, scopeLevel = 'ORG', scopeId) =>
    api.send(`/kpi/distribution?workspaceId=${ws(workspaceId)}&scopeLevel=${encodeURIComponent(scopeLevel)}${scopeId ? `&scopeId=${encodeURIComponent(scopeId)}` : ''}`),
  narrative: (workspaceId, teamId, aiInContext = true) =>
    api.send(`/kpi/narrative?workspaceId=${ws(workspaceId)}`, { method: 'POST', body: { teamId, aiInContext } }),

  shares: (workspaceId) => api.send(`/kpi/shares?workspaceId=${ws(workspaceId)}`),
  share: (workspaceId, viewerUserId) =>
    api.send(`/kpi/shares?workspaceId=${ws(workspaceId)}`, { method: 'POST', body: { viewerUserId } }),
  unshare: (workspaceId, viewerUserId) =>
    api.send(`/kpi/shares/${encodeURIComponent(viewerUserId)}?workspaceId=${ws(workspaceId)}`, { method: 'DELETE' }),
};

// The five privacy layers, in the order the layer switcher presents them.
export const KPI_LAYERS = ['INDIVIDUAL', 'TEAM', 'PROJECT', 'MANAGER', 'ORG'];

// Health band → semantic token name (never colour literals — CLAUDE.md §4).
export function healthTone(band) {
  if (band === 'healthy') return 'success';
  if (band === 'watch') return 'warning';
  return 'danger';
}
