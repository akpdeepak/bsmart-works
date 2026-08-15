import { api } from './apiClient';

// EPIC-9 internal messaging — the canonical work-context messaging surface (the orphan phase4
// `/messenger` backend was retired in GH-522). Paths are API-relative: `apiClient` already carries
// the `/api/v1` base, and the client exposes `raw`/`send` only.

const conversationsBase = (workspaceId) =>
  `/internal-messaging/conversations?workspaceId=${encodeURIComponent(workspaceId)}`;

const conversationPath = (workspaceId, id) =>
  `/internal-messaging/conversations/${encodeURIComponent(id)}?workspaceId=${encodeURIComponent(workspaceId)}`;

const messagePath = (workspaceId, msgId) =>
  `/internal-messaging/messages/${encodeURIComponent(msgId)}`;

const wsParam = (workspaceId) => `workspaceId=${encodeURIComponent(workspaceId)}`;

export const internalChatClient = {
  // ── Conversations ──────────────────────────────────────────────────────────

  listConversations(workspaceId) {
    return api.send(conversationsBase(workspaceId));
  },

  createConversation(workspaceId, payload) {
    return api.send(conversationsBase(workspaceId), { method: 'POST', body: payload });
  },

  getConversation(workspaceId, id) {
    return api.send(conversationPath(workspaceId, id));
  },

  sendMessage(workspaceId, id, text) {
    return api.send(
      `/internal-messaging/conversations/${encodeURIComponent(id)}/messages?${wsParam(workspaceId)}`,
      { method: 'POST', body: { body: text } },
    );
  },

  // ── Participants ───────────────────────────────────────────────────────────

  listParticipants(workspaceId, conversationId) {
    return api.send(
      `/internal-messaging/conversations/${encodeURIComponent(conversationId)}/participants?${wsParam(workspaceId)}`,
    );
  },

  addParticipant(workspaceId, conversationId, userId) {
    return api.send(
      `/internal-messaging/conversations/${encodeURIComponent(conversationId)}/participants?${wsParam(workspaceId)}`,
      { method: 'POST', body: { userId } },
    );
  },

  removeParticipant(workspaceId, conversationId, userId) {
    return api.send(
      `/internal-messaging/conversations/${encodeURIComponent(conversationId)}/participants/${encodeURIComponent(userId)}?${wsParam(workspaceId)}`,
      { method: 'DELETE' },
    );
  },

  // ── Reactions ─────────────────────────────────────────────────────────────

  addReaction(workspaceId, messageId, emoji) {
    return api.send(
      `${messagePath(workspaceId, messageId)}/reactions?${wsParam(workspaceId)}`,
      { method: 'POST', body: { emoji } },
    );
  },

  removeReaction(workspaceId, messageId, emoji) {
    return api.send(
      `${messagePath(workspaceId, messageId)}/reactions/${encodeURIComponent(emoji)}?${wsParam(workspaceId)}`,
      { method: 'DELETE' },
    );
  },

  // ── Read receipts ──────────────────────────────────────────────────────────

  markRead(workspaceId, conversationId, lastMessageId) {
    return api.send(
      `/internal-messaging/conversations/${encodeURIComponent(conversationId)}/read?${wsParam(workspaceId)}`,
      { method: 'POST', body: { lastMessageId } },
    );
  },

  // ── Pins ──────────────────────────────────────────────────────────────────

  pinMessage(workspaceId, conversationId, messageId) {
    return api.send(
      `${messagePath(workspaceId, messageId)}/pin?${wsParam(workspaceId)}&conversationId=${encodeURIComponent(conversationId)}`,
      { method: 'POST', body: {} },
    );
  },

  unpinMessage(workspaceId, conversationId, messageId) {
    return api.send(
      `${messagePath(workspaceId, messageId)}/pin?${wsParam(workspaceId)}&conversationId=${encodeURIComponent(conversationId)}`,
      { method: 'DELETE' },
    );
  },

  // ── AI actions (review-only — results are never auto-persisted) ────────────

  summarizeConversation(workspaceId, conversationId) {
    return api.send(
      `/internal-messaging/conversations/${encodeURIComponent(conversationId)}/summarize?${wsParam(workspaceId)}`,
      { method: 'POST', body: {} },
    );
  },

  extractActionItems(workspaceId, conversationId) {
    return api.send(
      `/internal-messaging/conversations/${encodeURIComponent(conversationId)}/extract-actions?${wsParam(workspaceId)}`,
      { method: 'POST', body: {} },
    );
  },
};
