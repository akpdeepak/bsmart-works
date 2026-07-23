import { api } from './apiClient';

// EPIC-9 internal messaging — the canonical work-context messaging surface (the orphan phase4
// `/messenger` backend was retired in GH-522). Paths are API-relative: `apiClient` already carries
// the `/api/v1` base, and the client exposes `raw`/`send` only.

const conversations = (workspaceId) =>
  `/internal-messaging/conversations?workspaceId=${encodeURIComponent(workspaceId)}`;

export const internalChatClient = {
  listConversations(workspaceId) {
    return api.send(conversations(workspaceId));
  },

  createConversation(workspaceId, payload) {
    return api.send(conversations(workspaceId), { method: 'POST', body: payload });
  },

  getConversation(workspaceId, id) {
    return api.send(`/internal-messaging/conversations/${encodeURIComponent(id)}`
      + `?workspaceId=${encodeURIComponent(workspaceId)}`);
  },

  sendMessage(workspaceId, id, text) {
    return api.send(`/internal-messaging/conversations/${encodeURIComponent(id)}/messages`
      + `?workspaceId=${encodeURIComponent(workspaceId)}`, { method: 'POST', body: { body: text } });
  },
};
