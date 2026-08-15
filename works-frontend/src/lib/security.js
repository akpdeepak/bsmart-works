// bSmart Works — enterprise security client (iteration 19 Cap T, RB-40 §4).
// Every call goes through the single apiClient (CLAUDE.md §3); this module just shapes the
// security endpoints. The backend enforces RBAC (view_audit_log to read, manage_security to
// write) and workspace scoping, so the UI gating here is convenience, not the real guard.

import { api } from '@/lib/apiClient';
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination';

const ws = (workspaceId) => encodeURIComponent(workspaceId);
const q = (s) => encodeURIComponent(s ?? '');

export const securityClient = {
  // ── Settings: data residency + BYOK ───────────────────────────────────────
  settings: (workspaceId) => api.send(`/security/settings?workspaceId=${ws(workspaceId)}`),
  saveSettings: (workspaceId, body) =>
    api.send(`/security/settings?workspaceId=${ws(workspaceId)}`, { method: 'PUT', body }),

  // ── Conditional access ─────────────────────────────────────────────────────
  policies: (workspaceId) => api.send(`/security/conditional-access?workspaceId=${ws(workspaceId)}`),
  createPolicy: (workspaceId, body) =>
    api.send(`/security/conditional-access?workspaceId=${ws(workspaceId)}`, { method: 'POST', body }),
  updatePolicy: (workspaceId, id, body) =>
    api.send(`/security/conditional-access/${id}?workspaceId=${ws(workspaceId)}`, { method: 'PUT', body }),
  deletePolicy: (workspaceId, id) =>
    api.send(`/security/conditional-access/${id}?workspaceId=${ws(workspaceId)}`, { method: 'DELETE' }),
  evaluate: (workspaceId, { role, ip, country, deviceTrusted }) =>
    api.send(`/security/conditional-access/evaluate?workspaceId=${ws(workspaceId)}`
      + `&role=${q(role)}&ip=${q(ip)}&country=${q(country)}&deviceTrusted=${!!deviceTrusted}`),

  // ── Audit log (tamper-evident) ─────────────────────────────────────────────
  auditLog: (workspaceId, { action = '', actor = '', query = '', page = 0, size = DEFAULT_PAGE_SIZE } = {}) =>
    api.send(`/security/audit-log?workspaceId=${ws(workspaceId)}`
      + `&action=${q(action)}&actor=${q(actor)}&q=${q(query)}&page=${page}&size=${size}`),
  verifyAuditLog: (workspaceId) => api.send(`/security/audit-log/verify?workspaceId=${ws(workspaceId)}`),
  exportAuditLog: (workspaceId) => api.send(`/security/audit-log/export?workspaceId=${ws(workspaceId)}`),

  // ── SIEM streaming ──────────────────────────────────────────────────────────
  streams: (workspaceId) => api.send(`/security/streams?workspaceId=${ws(workspaceId)}`),
  createStream: (workspaceId, body) =>
    api.send(`/security/streams?workspaceId=${ws(workspaceId)}`, { method: 'POST', body }),
  deleteStream: (workspaceId, id) =>
    api.send(`/security/streams/${id}?workspaceId=${ws(workspaceId)}`, { method: 'DELETE' }),

  // ── Access anomalies ────────────────────────────────────────────────────────
  anomalies: (workspaceId, status = '') =>
    api.send(`/security/anomalies?workspaceId=${ws(workspaceId)}&status=${q(status)}`),
  resolveAnomaly: (workspaceId, id, dismiss = false) =>
    api.send(`/security/anomalies/${id}/resolve?workspaceId=${ws(workspaceId)}&dismiss=${!!dismiss}`,
      { method: 'POST' }),

  // ── Data subject requests (GDPR / DPDP) ────────────────────────────────────
  dataRequests: (workspaceId) => api.send(`/security/data-requests?workspaceId=${ws(workspaceId)}`),
  exportSubject: (workspaceId, subjectUserId) =>
    api.send(`/security/data-requests/export?workspaceId=${ws(workspaceId)}&subjectUserId=${q(subjectUserId)}`,
      { method: 'POST' }),
  eraseSubject: (workspaceId, subjectUserId) =>
    api.send(`/security/data-requests/erase?workspaceId=${ws(workspaceId)}&subjectUserId=${q(subjectUserId)}`,
      { method: 'POST' }),

  // ── Compliance evidence bundles ─────────────────────────────────────────────
  evidence: (workspaceId) => api.send(`/security/evidence?workspaceId=${ws(workspaceId)}`),
  generateEvidence: (workspaceId, framework) =>
    api.send(`/security/evidence/generate?workspaceId=${ws(workspaceId)}&framework=${q(framework)}`,
      { method: 'POST' }),
  downloadEvidence: (workspaceId, id) =>
    api.send(`/security/evidence/${id}/download?workspaceId=${ws(workspaceId)}`, { method: 'POST' }),

  // ── Pen-test register ───────────────────────────────────────────────────────
  pentests: (workspaceId) => api.send(`/security/pentests?workspaceId=${ws(workspaceId)}`),

  // ── Passkeys (self-service) ─────────────────────────────────────────────────
  passkeys: () => api.send(`/auth/passkeys`),
  beginRegisterPasskey: () => api.send(`/auth/passkeys/register/begin`, { method: 'POST' }),
  finishRegisterPasskey: (body) =>
    api.send(`/auth/passkeys/register/finish`, { method: 'POST', body }),
  deletePasskey: (id) => api.send(`/auth/passkeys/${id}`, { method: 'DELETE' }),

  // ── Passwordless passkey sign-in (pre-auth) ─────────────────────────────────
  beginAuthenticatePasskey: (email) =>
    api.send(`/auth/passkey/authenticate/begin`, { method: 'POST', body: { email } }),
  finishAuthenticatePasskey: (body) =>
    api.send(`/auth/passkey/authenticate/finish`, { method: 'POST', body }),
};
