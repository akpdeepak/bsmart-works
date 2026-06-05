// bSmart Works — Developer Workspace client (Cap U, iteration 14).
// Every call goes through the single apiClient (CLAUDE.md §3); this module just shapes the
// developer-workspace, focus-mode, code-context and Definition-of-Done endpoints. The web UI, the
// VS Code / JetBrains extensions and the `works` CLI all consume this same REST surface.

import { api } from '@/lib/apiClient';

const ws = (workspaceId) => encodeURIComponent(workspaceId);
const wi = (workItemId) => encodeURIComponent(workItemId);

export const devClient = {
  // ── Developer Workspace home + surfaces ───────────────────────────────────
  home: (workspaceId) => api.send(`/developer-workspace?workspaceId=${ws(workspaceId)}`),
  velocity: (workspaceId) => api.send(`/developer-workspace/velocity?workspaceId=${ws(workspaceId)}`),
  reviewQueue: (workspaceId) => api.send(`/developer-workspace/review-queue?workspaceId=${ws(workspaceId)}`),
  standup: (workspaceId, aiInContext = true) =>
    api.send(`/developer-workspace/standup?workspaceId=${ws(workspaceId)}`, { method: 'POST', body: { aiInContext } }),
  explainCode: (workItemId, aiInContext = true) =>
    api.send(`/developer-workspace/explain-code?workItemId=${wi(workItemId)}`, { method: 'POST', body: { aiInContext } }),
  commitSummary: (workspaceId, message, aiInContext = true) =>
    api.send(`/developer-workspace/commit-summary?workspaceId=${ws(workspaceId)}`, { method: 'POST', body: { message, aiInContext } }),

  // ── Focus mode + time blocking ────────────────────────────────────────────
  focusBlocks: (workspaceId) => api.send(`/focus-blocks?workspaceId=${ws(workspaceId)}`),
  focusStatus: () => api.send('/focus-blocks/status'),
  scheduleFocus: (workspaceId, block) =>
    api.send(`/focus-blocks?workspaceId=${ws(workspaceId)}`, { method: 'POST', body: block }),
  cancelFocus: (id) => api.send(`/focus-blocks/${id}`, { method: 'DELETE' }),

  // ── Code context (commit/branch/PR links) ─────────────────────────────────
  codeContext: (workItemId) => api.send(`/code/context?workItemId=${wi(workItemId)}`),
  linkCode: (body) => api.send('/code/links', { method: 'POST', body }),
  pullRequests: (workspaceId, status) =>
    api.send(`/code/pull-requests?workspaceId=${ws(workspaceId)}${status ? `&status=${encodeURIComponent(status)}` : ''}`),

  // ── Definition-of-Done checklists ─────────────────────────────────────────
  dodChecklists: (workspaceId) => api.send(`/dod-checklists?workspaceId=${ws(workspaceId)}`),
  dodForWorkItem: (workItemId) => api.send(`/dod-checklists/for-work-item?workItemId=${wi(workItemId)}`),
  toggleDodItem: (workItemId, itemId, checked) =>
    api.send('/dod-checklists/toggle', { method: 'POST', body: { workItemId, itemId, checked } }),
};

// Format a focus-status "until" timestamp as HH:MM for the avatar indicator.
export function focusUntilLabel(status) {
  if (!status || !status.inFocus || !status.until) return null;
  const d = new Date(status.until);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `In focus until ${hh}:${mm}`;
}
