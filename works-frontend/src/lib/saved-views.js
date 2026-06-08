import { api } from './apiClient';

/** Client for custom saved views (iteration 17, Cap R). */
export const savedViewsClient = {
  list: (workspaceId, projectId) => {
    const params = new URLSearchParams({ workspaceId });
    if (projectId) params.set('projectId', projectId);
    return api.send(`/saved-views?${params}`);
  },
  create: (workspaceId, view) =>
    api.send(`/saved-views?workspaceId=${encodeURIComponent(workspaceId)}`, {
      method: 'POST',
      body: JSON.stringify(view),
    }),
  update: (workspaceId, id, patch) =>
    api.send(`/saved-views/${encodeURIComponent(id)}?workspaceId=${encodeURIComponent(workspaceId)}`, {
      method: 'PUT',
      body: JSON.stringify(patch),
    }),
  delete: (workspaceId, id) =>
    api.send(`/saved-views/${encodeURIComponent(id)}?workspaceId=${encodeURIComponent(workspaceId)}`, {
      method: 'DELETE',
    }),
};
