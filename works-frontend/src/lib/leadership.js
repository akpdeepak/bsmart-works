// bSmart Works — Leadership Console client (Cap X, iteration 16).
// Every call goes through the single apiClient (CLAUDE.md §3); this module just shapes the
// leadership rollup, board-deck and executive-briefing endpoints. The backend applies RBAC,
// workspace scoping and (for the AI surfaces) the AI Control Plane + deterministic fallback.

import { api } from '@/lib/apiClient';

const ws = (workspaceId) => encodeURIComponent(workspaceId);

export const leadershipClient = {
  // ── Cross-team rollup + strategic surfaces ────────────────────────────────
  rollup: (workspaceId) => api.send(`/leadership/rollup?workspaceId=${ws(workspaceId)}`),
  resourceAllocation: (workspaceId) => api.send(`/leadership/resource-allocation?workspaceId=${ws(workspaceId)}`),
  riskPortfolio: (workspaceId) => api.send(`/leadership/risk-portfolio?workspaceId=${ws(workspaceId)}`),
  customerHealth: (workspaceId) => api.send(`/leadership/customer-health?workspaceId=${ws(workspaceId)}`),
  strategicThemes: (workspaceId) => api.send(`/leadership/strategic-themes?workspaceId=${ws(workspaceId)}`),
  strategyExecution: (workspaceId) => api.send(`/leadership/strategy-execution?workspaceId=${ws(workspaceId)}`),
  boardDeck: (workspaceId, quarter, aiInContext = true) =>
    api.send(`/leadership/board-deck?workspaceId=${ws(workspaceId)}`, { method: 'POST', body: { quarter, aiInContext } }),

  // ── AI executive briefing (schedulable, editable card) ────────────────────
  briefings: (workspaceId) => api.send(`/executive-briefings?workspaceId=${ws(workspaceId)}`),
  createBriefing: (briefing) => api.send('/executive-briefings', { method: 'POST', body: briefing }),
  updateBriefing: (id, briefing) => api.send(`/executive-briefings/${id}`, { method: 'PUT', body: briefing }),
  generateBriefing: (id, aiInContext = true) =>
    api.send(`/executive-briefings/${id}/generate`, { method: 'POST', body: { aiInContext } }),
  deleteBriefing: (id) => api.send(`/executive-briefings/${id}`, { method: 'DELETE' }),
};
