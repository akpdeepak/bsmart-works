// bSmart Works — Admin Operations Center client (Cap Y, iteration 16).
// Every call goes through the single apiClient (CLAUDE.md §3); this module just shapes the admin
// ops endpoints: workspace health, AI cost, integration health, license seats, user-lifecycle
// playbooks/runs, the audit-log explorer, access review and compliance evidence packages.
// The backend gates every one of these to a workspace administrator and scopes it to the tenant.

import { api } from '@/lib/apiClient';

const ws = (workspaceId) => encodeURIComponent(workspaceId);

export const adminOpsClient = {
  // ── Workspace health + AI cost + integrations + seats ─────────────────────
  health: (workspaceId) => api.send(`/admin/health?workspaceId=${ws(workspaceId)}`),
  aiCost: (workspaceId) => api.send(`/admin/ai-cost?workspaceId=${ws(workspaceId)}`),
  setAiBudget: (workspaceId, monthlyCapCents) =>
    api.send(`/admin/ai-budget?workspaceId=${ws(workspaceId)}`, { method: 'PUT', body: { monthlyCapCents } }),
  integrationHealth: (workspaceId) => api.send(`/admin/integration-health?workspaceId=${ws(workspaceId)}`),
  retryDelivery: (workspaceId, deliveryId) =>
    api.send(`/admin/integration-health/retry/${deliveryId}?workspaceId=${ws(workspaceId)}`, { method: 'POST' }),
  licenseSeats: (workspaceId) => api.send(`/admin/license-seats?workspaceId=${ws(workspaceId)}`),
  updateLicenseSeats: (workspaceId, body) =>
    api.send(`/admin/license-seats?workspaceId=${ws(workspaceId)}`, { method: 'PUT', body }),

  // ── User lifecycle automation (onboarding / offboarding) ──────────────────
  playbooks: (workspaceId) => api.send(`/onboarding/playbooks?workspaceId=${ws(workspaceId)}`),
  runs: (workspaceId) => api.send(`/onboarding/runs?workspaceId=${ws(workspaceId)}`),
  run: (runId) => api.send(`/onboarding/runs/${runId}`),
  startRun: (workspaceId, body) =>
    api.send(`/onboarding/runs?workspaceId=${ws(workspaceId)}`, { method: 'POST', body }),
  completeStep: (runId, stepId, body = {}) =>
    api.send(`/onboarding/runs/${runId}/steps/${stepId}/complete`, { method: 'POST', body }),
  cancelRun: (runId) => api.send(`/onboarding/runs/${runId}/cancel`, { method: 'POST' }),

  // ── Audit log explorer ────────────────────────────────────────────────────
  auditLog: (workspaceId, params = {}) => {
    const qs = new URLSearchParams({ workspaceId, ...clean(params) }).toString();
    return api.send(`/audit-log?${qs}`);
  },
  auditEventTypes: (workspaceId) => api.send(`/audit-log/event-types?workspaceId=${ws(workspaceId)}`),
  savedQueries: (workspaceId) => api.send(`/audit-log/saved-queries?workspaceId=${ws(workspaceId)}`),
  saveQuery: (query) => api.send('/audit-log/saved-queries', { method: 'POST', body: query }),
  deleteSavedQuery: (id) => api.send(`/audit-log/saved-queries/${id}`, { method: 'DELETE' }),

  // ── Access review ──────────────────────────────────────────────────────────
  accessReviews: (workspaceId) => api.send(`/access-reviews?workspaceId=${ws(workspaceId)}`),
  accessMembers: (workspaceId, thresholdDays = 90) =>
    api.send(`/access-reviews/members?workspaceId=${ws(workspaceId)}&thresholdDays=${thresholdDays}`),
  startAccessReview: (workspaceId, thresholdDays = 90) =>
    api.send(`/access-reviews?workspaceId=${ws(workspaceId)}`, { method: 'POST', body: { thresholdDays } }),
  deactivateMember: (reviewId, userId) =>
    api.send(`/access-reviews/${reviewId}/deactivate`, { method: 'POST', body: { userId } }),
  completeAccessReview: (reviewId, summary) =>
    api.send(`/access-reviews/${reviewId}/complete`, { method: 'POST', body: { summary } }),

  // ── HEART / activation-funnel metrics (WI-10, HEART-METRICS.md §7) ──────────
  heartMetrics: (workspaceId) => api.send(`/funnel/heart?workspaceId=${ws(workspaceId)}`),

  // ── Compliance evidence packages ───────────────────────────────────────────
  evidencePackages: (workspaceId) => api.send(`/evidence-packages?workspaceId=${ws(workspaceId)}`),
  evidencePackage: (id) => api.send(`/evidence-packages/${id}`),
  generateEvidence: (workspaceId, framework) =>
    api.send(`/evidence-packages?workspaceId=${ws(workspaceId)}`, { method: 'POST', body: { framework } }),
};

// Drop null/undefined/empty params so they don't appear as empty query filters.
function clean(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v != null && v !== '').map(([k, v]) => [k, String(v)])
  );
}
