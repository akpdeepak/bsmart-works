// bSmart Works — Automation engine client (iteration 13, Cap C). All HTTP via the single apiClient
// (CLAUDE.md §3). New rules start disabled (test-before-activate); test mode previews the affected
// items without mutating anything.

import { api } from '@/lib/apiClient';

const ws = (workspaceId) => encodeURIComponent(workspaceId);

export const automationClient = {
  catalog: (workspaceId) => api.send(`/automations/catalog?workspaceId=${ws(workspaceId)}`),
  list: (workspaceId) => api.send(`/automations?workspaceId=${ws(workspaceId)}`),
  get: (workspaceId, id) => api.send(`/automations/${encodeURIComponent(id)}?workspaceId=${ws(workspaceId)}`),
  create: (workspaceId, rule) =>
    api.send(`/automations?workspaceId=${ws(workspaceId)}`, { method: 'POST', body: rule }),
  update: (workspaceId, id, rule) =>
    api.send(`/automations/${encodeURIComponent(id)}?workspaceId=${ws(workspaceId)}`, { method: 'PUT', body: rule }),
  remove: (workspaceId, id) =>
    api.send(`/automations/${encodeURIComponent(id)}?workspaceId=${ws(workspaceId)}`, { method: 'DELETE' }),
  toggle: (workspaceId, id, enabled) =>
    api.send(`/automations/${encodeURIComponent(id)}/toggle?workspaceId=${ws(workspaceId)}&enabled=${enabled}`, { method: 'POST' }),
  test: (workspaceId, id) =>
    api.send(`/automations/${encodeURIComponent(id)}/test?workspaceId=${ws(workspaceId)}`, { method: 'POST' }),
  run: (workspaceId, id) =>
    api.send(`/automations/${encodeURIComponent(id)}/run?workspaceId=${ws(workspaceId)}`, { method: 'POST' }),
  runs: (workspaceId, page = 0, size = 50) =>
    api.send(`/automations/runs?workspaceId=${ws(workspaceId)}&page=${page}&size=${size}`),
  suggest: (workspaceId) =>
    api.send(`/automations/suggest?workspaceId=${ws(workspaceId)}`, { method: 'POST', body: {} }),
};

// Run status → semantic token name (never colour literals — CLAUDE.md §4).
export function runTone(status) {
  if (status === 'SUCCESS' || status === 'DELIVERED') return 'success';
  if (status === 'DRY_RUN' || status === 'NOOP') return 'neutral';
  if (status === 'DEAD_LETTER' || status === 'FAILED') return 'danger';
  return 'neutral';
}
