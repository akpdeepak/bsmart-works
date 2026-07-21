// bSmart Works — iteration-20 advanced-AI client (Cap O): custom assistants, multi-step agents,
// AI memory and conversational dashboards. Every call goes through the single apiClient
// (CLAUDE.md §3); the backend applies the AI Control Plane (scope/budget/cache/audit + the
// deterministic fallback), so callers always get a usable response — the `usedAi`/`fallback`
// flags on each reply say whether AI actually ran.

import { api } from '@/lib/apiClient';

const ws = (workspaceId) => encodeURIComponent(workspaceId);

export const assistantsClient = {
  list: (workspaceId, enabledOnly = false) =>
    api.send(`/ai/assistants?workspaceId=${ws(workspaceId)}&enabledOnly=${enabledOnly}`),
  create: (workspaceId, body) =>
    api.send(`/ai/assistants?workspaceId=${ws(workspaceId)}`, { method: 'POST', body }),
  update: (workspaceId, id, body) =>
    api.send(`/ai/assistants/${id}?workspaceId=${ws(workspaceId)}`, { method: 'PUT', body }),
  remove: (workspaceId, id) =>
    api.send(`/ai/assistants/${id}?workspaceId=${ws(workspaceId)}`, { method: 'DELETE' }),
  chat: (workspaceId, id, message) =>
    api.send(`/ai/assistants/${id}/chat?workspaceId=${ws(workspaceId)}`, { method: 'POST', body: { message } }),
};

export const agentsClient = {
  runs: (workspaceId) => api.send(`/ai/agents/runs?workspaceId=${ws(workspaceId)}`),
  run: (workspaceId, goal) =>
    api.send(`/ai/agents/run?workspaceId=${ws(workspaceId)}`, { method: 'POST', body: { goal } }),
  getRun: (workspaceId, id) => api.send(`/ai/agents/runs/${id}?workspaceId=${ws(workspaceId)}`),
};

export const memoryClient = {
  list: (workspaceId) => api.send(`/ai/memory?workspaceId=${ws(workspaceId)}`),
  remember: (workspaceId, body) =>
    api.send(`/ai/memory?workspaceId=${ws(workspaceId)}`, { method: 'POST', body }),
  forget: (workspaceId, id) =>
    api.send(`/ai/memory/${id}?workspaceId=${ws(workspaceId)}`, { method: 'DELETE' }),
};

export const conversationalDashboardsClient = {
  list: (workspaceId) => api.send(`/ai/conversational-dashboards?workspaceId=${ws(workspaceId)}`),
  compile: (workspaceId, prompt) =>
    api.send(`/ai/conversational-dashboards/compile?workspaceId=${ws(workspaceId)}`, { method: 'POST', body: { prompt } }),
  save: (workspaceId, title, prompt) =>
    api.send(`/ai/conversational-dashboards?workspaceId=${ws(workspaceId)}`, { method: 'POST', body: { title, prompt } }),
  remove: (workspaceId, id) =>
    api.send(`/ai/conversational-dashboards/${id}?workspaceId=${ws(workspaceId)}`, { method: 'DELETE' }),
};

export const artifactsClient = {
  generate: (workspaceId, prompt) =>
    api.send(`/ai/artifacts/generate?workspaceId=${ws(workspaceId)}`, { method: 'POST', body: { prompt } }),
};


// Short human label for a control-plane verdict on an AI reply.
export function aiVerdictLabel(reply) {
  if (!reply) return '';
  if (reply.usedAi && !reply.fallback) return reply.tier === 'HAIKU' ? 'AI · fast' : 'AI';
  return 'Offline';
}
