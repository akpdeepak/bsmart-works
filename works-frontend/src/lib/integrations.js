// bSmart Works — Integrations + webhooks + API tokens client (iteration 13, Cap Q / Cap A).
// All HTTP via the single apiClient (CLAUDE.md §3).

import { api } from '@/lib/apiClient';

const ws = (workspaceId) => encodeURIComponent(workspaceId);

export const integrationsClient = {
  // ── Connectors (Slack / GitHub / GitLab / email / calendar / SSO / SCIM) ──
  providers: (workspaceId) => api.send(`/integrations/providers?workspaceId=${ws(workspaceId)}`),
  list: (workspaceId) => api.send(`/integrations?workspaceId=${ws(workspaceId)}`),
  connect: (workspaceId, provider, name, config) =>
    api.send(`/integrations/connect?workspaceId=${ws(workspaceId)}`, { method: 'POST', body: { provider, name, config } }),
  disconnect: (workspaceId, id) =>
    api.send(`/integrations/${encodeURIComponent(id)}/disconnect?workspaceId=${ws(workspaceId)}`, { method: 'POST' }),
  test: (workspaceId, id) =>
    api.send(`/integrations/${encodeURIComponent(id)}/test?workspaceId=${ws(workspaceId)}`),
  inboundEmail: (workspaceId, subject, body, projectId) =>
    api.send(`/integrations/email/inbound?workspaceId=${ws(workspaceId)}`, { method: 'POST', body: { subject, body, projectId } }),

  // ── Outbound webhooks ──
  webhooks: (workspaceId) => api.send(`/webhooks?workspaceId=${ws(workspaceId)}`),
  createWebhook: (workspaceId, sub) =>
    api.send(`/webhooks?workspaceId=${ws(workspaceId)}`, { method: 'POST', body: sub }),
  deleteWebhook: (workspaceId, id) =>
    api.send(`/webhooks/${encodeURIComponent(id)}?workspaceId=${ws(workspaceId)}`, { method: 'DELETE' }),
  deliveries: (workspaceId, page = 0, size = 50) =>
    api.send(`/webhooks/deliveries?workspaceId=${ws(workspaceId)}&page=${page}&size=${size}`),
  redeliver: (workspaceId, id) =>
    api.send(`/webhooks/deliveries/${encodeURIComponent(id)}/redeliver?workspaceId=${ws(workspaceId)}`, { method: 'POST' }),

  // ── Public-API tokens (OAuth/bearer foundation) ──
  tokens: (workspaceId) => api.send(`/api-tokens?workspaceId=${ws(workspaceId)}`),
  issueToken: (workspaceId, name, scopes) =>
    api.send(`/api-tokens?workspaceId=${ws(workspaceId)}`, { method: 'POST', body: { name, scopes } }),
  revokeToken: (workspaceId, id) =>
    api.send(`/api-tokens/${encodeURIComponent(id)}/revoke?workspaceId=${ws(workspaceId)}`, { method: 'POST' }),
};
