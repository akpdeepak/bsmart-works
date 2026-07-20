import { api } from './api';

export const internalChatClient = {
  listConversations(workspaceId) {
    return api.get(`/api/v1/internal-messaging/conversations?workspaceId=${encodeURIComponent(workspaceId)}`);
  },

  createConversation(workspaceId, payload) {
    return api.post(`/api/v1/internal-messaging/conversations?workspaceId=${encodeURIComponent(workspaceId)}`, payload);
  },

  getConversation(workspaceId, id) {
    return api.get(`/api/v1/internal-messaging/conversations/${encodeURIComponent(id)}?workspaceId=${encodeURIComponent(workspaceId)}`);
  },

  sendMessage(workspaceId, id, text) {
    return api.post(`/api/v1/internal-messaging/conversations/${encodeURIComponent(id)}/messages?workspaceId=${encodeURIComponent(workspaceId)}`, { body: text });
  }
};
