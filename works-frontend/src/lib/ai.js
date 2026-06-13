// bSmart Works — AI Control Plane + iteration-11 capability client (RB-40 §2).
// Every call goes through the single apiClient (CLAUDE.md §3); this module just shapes the
// AI endpoints. The backend applies scope/budget/cache/audit and the deterministic fallback,
// so callers always get a usable response — `meta.fallback` says whether AI actually ran.

import { api } from '@/lib/apiClient';

const ws = (workspaceId) => encodeURIComponent(workspaceId);

export const aiClient = {
  // ── Control plane management ──────────────────────────────────────────────
  capabilities: (workspaceId) => api.send(`/ai/capabilities?workspaceId=${ws(workspaceId)}`),
  policies: (workspaceId) => api.send(`/ai/policies?workspaceId=${ws(workspaceId)}`),
  setPolicy: (workspaceId, policy) =>
    api.send(`/ai/policies?workspaceId=${ws(workspaceId)}`, { method: 'PUT', body: policy }),
  budget: (workspaceId) => api.send(`/ai/budget?workspaceId=${ws(workspaceId)}`),
  setBudget: (workspaceId, monthlyCapCents) =>
    api.send(`/ai/budget?workspaceId=${ws(workspaceId)}`, { method: 'PUT', body: { monthlyCapCents } }),
  auditLog: (workspaceId, page = 0, size = 50) =>
    api.send(`/ai/invocations?workspaceId=${ws(workspaceId)}&page=${page}&size=${size}`),
  settings: (workspaceId) => api.send(`/ai/settings?workspaceId=${ws(workspaceId)}`),
  setSettings: (workspaceId, body) =>
    api.send(`/ai/settings?workspaceId=${ws(workspaceId)}`, { method: 'PUT', body }),

  // ── Iteration-11 capability surfaces ──────────────────────────────────────
  parseCommand: (workspaceId, text, aiInContext = true) =>
    api.send(`/ai/command/parse?workspaceId=${ws(workspaceId)}`, { method: 'POST', body: { text, aiInContext } }),
  executePlan: (workspaceId, steps) =>
    api.send(`/ai/command/execute?workspaceId=${ws(workspaceId)}`, { method: 'POST', body: { steps } }),
  triage: (workspaceId, body) =>
    api.send(`/ai/triage?workspaceId=${ws(workspaceId)}`, { method: 'POST', body }),
  generate: (workspaceId, kind, context, aiInContext = true) =>
    api.send(`/ai/generate?workspaceId=${ws(workspaceId)}`, { method: 'POST', body: { kind, context, aiInContext } }),
  explainAnomaly: (workspaceId, metric, series) =>
    api.send(`/ai/explain-anomaly?workspaceId=${ws(workspaceId)}`, { method: 'POST', body: { metric, series } }),
  suggestComplianceRules: (workspaceId, prompt) =>
    api.send(`/ai/suggest-compliance-rules?workspaceId=${ws(workspaceId)}`, { method: 'POST', body: { prompt } }),
  predictSla: (workspaceId, projectId) =>
    api.send(`/ai/predict-sla?workspaceId=${ws(workspaceId)}`, { method: 'POST', body: { projectId } }),
  kbAsk: (workspaceId, question) =>
    api.send(`/ai/kb/ask?workspaceId=${ws(workspaceId)}`, { method: 'POST', body: { question } }),
  kbSuggest: (workspaceId, text) =>
    api.send(`/ai/kb/suggest?workspaceId=${ws(workspaceId)}`, { method: 'POST', body: { text } }),
  route: (workspaceId, text) =>
    api.send(`/ai/route?workspaceId=${ws(workspaceId)}`, { method: 'POST', body: { text } }),

  // ── Iteration-20 conversational dashboards (Cap O) ────────────────────────
  // NL → widget spec. compile() returns { spec, usedAi, fallback, policyState, tier } — the spec
  // is always the deterministic parse, so the preview renders even when AI is off/over budget
  // (RB-40 §2). Nothing is persisted until saveConversationalDashboard.
  listConversationalDashboards: (workspaceId) =>
    api.send(`/ai/conversational-dashboards?workspaceId=${ws(workspaceId)}`),
  compileConversationalDashboard: (workspaceId, prompt, aiInContext = true) =>
    api.send(`/ai/conversational-dashboards/compile?workspaceId=${ws(workspaceId)}`, {
      method: 'POST',
      body: { prompt, aiInContext },
    }),
  saveConversationalDashboard: (workspaceId, title, prompt) =>
    api.send(`/ai/conversational-dashboards?workspaceId=${ws(workspaceId)}`, {
      method: 'POST',
      body: { title, prompt },
    }),
  deleteConversationalDashboard: (workspaceId, id) =>
    api.send(`/ai/conversational-dashboards/${encodeURIComponent(id)}?workspaceId=${ws(workspaceId)}`, {
      method: 'DELETE',
    }),
};

// Map a CompiledSpec verdict ({ usedAi, fallback, policyState, tier }) onto the shape AiMetaBadge
// reads ({ fallback, cacheHit, tier, policyState }) so AI provenance renders consistently (RB-40 §2).
export function compiledSpecToMeta(compiled) {
  if (!compiled) return null;
  return {
    fallback: !!compiled.fallback,
    cacheHit: false,
    tier: compiled.tier,
    policyState: compiled.policyState,
  };
}

// Whether the workspace exposes any AI at all — the AI button disappears entirely when not.
export function anyCapabilityEnabled(capabilities) {
  return Array.isArray(capabilities) && capabilities.some((c) => c.enabled);
}

// Whether one specific capability is enabled (most-restrictive-wins is already resolved server-side,
// RB-40 §2). Surfaces gate on THEIR capability, not "any AI", so e.g. NL→BQL hides only when
// nl_to_bql is off — not whenever some unrelated capability is on.
export function capabilityEnabled(capabilities, id) {
  return Array.isArray(capabilities) && capabilities.some((c) => c.id === id && c.enabled);
}

// Browser SpeechRecognition handle (voice command input), or null when unsupported.
export function getSpeechRecognition() {
  if (typeof window === 'undefined') return null;
  const Impl = window.SpeechRecognition || window.webkitSpeechRecognition;
  return Impl ? new Impl() : null;
}
