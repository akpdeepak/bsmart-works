// bSmart Works — customer chat support client (iteration 20, Cap N).
// Every call goes through the single apiClient (CLAUDE.md §3); this module just shapes the
// chat endpoints. Two surfaces share the chat backend with different identities:
//   • portalChatClient — driven by the CUSTOMER portal token (passed explicitly, like the rest of
//     the portal), hitting /support-chat/portal/**.
//   • agentChatClient — driven by the internal workspace-member session, hitting /support-chat/**.
// The backend applies tenant scope, RBAC, the AI Control Plane and the deterministic fallback, so
// callers always get a usable thread — each message's `aiMeta` says whether AI actually ran.

import { api } from '@/lib/apiClient';

const ws = (workspaceId) => encodeURIComponent(workspaceId);

function portalHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Customer portal side (explicit customer token) ──────────────────────────────
// `token` is the customer portal token (the same one CustomerPortal.jsx threads through).
export function portalChatClient(token) {
  const headers = portalHeaders(token);
  return {
    start: (message, { subject = null, customerName = null } = {}) =>
      api.send('/support-chat/portal/conversations', {
        method: 'POST',
        body: { message, subject, customerName },
        headers,
      }),
    postMessage: (conversationId, message) =>
      api.send(`/support-chat/portal/conversations/${encodeURIComponent(conversationId)}/messages`, {
        method: 'POST',
        body: { message },
        headers,
      }),
    getConversation: (conversationId) =>
      api.send(`/support-chat/portal/conversations/${encodeURIComponent(conversationId)}`, { headers }),
  };
}

// ── Agent side (internal workspace-member session) ──────────────────────────────
export const agentChatClient = {
  listConversations: (workspaceId, status = null) =>
    api.send(`/support-chat/conversations?workspaceId=${ws(workspaceId)}${
      status ? `&status=${encodeURIComponent(status)}` : ''}`),
  getConversation: (workspaceId, id) =>
    api.send(`/support-chat/conversations/${encodeURIComponent(id)}?workspaceId=${ws(workspaceId)}`),
  assign: (workspaceId, id) =>
    api.send(`/support-chat/conversations/${encodeURIComponent(id)}/assign?workspaceId=${ws(workspaceId)}`, {
      method: 'PUT',
    }),
  reply: (workspaceId, id, body) =>
    api.send(`/support-chat/conversations/${encodeURIComponent(id)}/reply?workspaceId=${ws(workspaceId)}`, {
      method: 'POST',
      body: { body },
    }),
  resolve: (workspaceId, id) =>
    api.send(`/support-chat/conversations/${encodeURIComponent(id)}/resolve?workspaceId=${ws(workspaceId)}`, {
      method: 'PUT',
    }),
};

// Tone token for a conversation status badge (no literals leak into components, RB-30 §2).
export function chatStatusTone(status) {
  switch (status) {
    case 'ESCALATED':
      return 'warning';
    case 'RESOLVED':
      return 'success';
    case 'AI_HANDLED':
      return 'brand';
    default:
      return 'info';
  }
}

// Human-readable status label.
export function chatStatusLabel(status) {
  switch (status) {
    case 'AI_HANDLED':
      return 'AI handled';
    case 'ESCALATED':
      return 'Needs agent';
    case 'RESOLVED':
      return 'Resolved';
    case 'OPEN':
      return 'Open';
    default:
      return status || 'Open';
  }
}
