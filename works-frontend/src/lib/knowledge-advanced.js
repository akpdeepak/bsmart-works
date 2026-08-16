// bSmart Works — Advanced Knowledge client (iteration-20 Cap I): document templates, multi-author
// collaboration, and AI structured-data extraction. Every call goes through the single apiClient
// (CLAUDE.md §3); this module just shapes the /knowledge endpoints. Each call is workspace-scoped —
// the backend enforces RBAC + tenant isolation (RB-40 §1) and the AI Control Plane fallback (RB-40 §2),
// so `extract` always returns a usable field map; `fallback` says whether AI actually ran.

import { api } from '@/lib/apiClient';

const ws = (workspaceId) => encodeURIComponent(workspaceId);

export const templatesClient = {
  list: (workspaceId, category) =>
    api.send(`/knowledge/templates?workspaceId=${ws(workspaceId)}${category ? `&category=${encodeURIComponent(category)}` : ''}`),
  get: (workspaceId, id) =>
    api.send(`/knowledge/templates/${encodeURIComponent(id)}?workspaceId=${ws(workspaceId)}`),
  create: (workspaceId, body) =>
    api.send(`/knowledge/templates?workspaceId=${ws(workspaceId)}`, { method: 'POST', body }),
  update: (workspaceId, id, body) =>
    api.send(`/knowledge/templates/${encodeURIComponent(id)}?workspaceId=${ws(workspaceId)}`, { method: 'PUT', body }),
  remove: (workspaceId, id) =>
    api.send(`/knowledge/templates/${encodeURIComponent(id)}?workspaceId=${ws(workspaceId)}`, { method: 'DELETE' }),
};

export const collaborationClient = {
  authors: (workspaceId, articleId) =>
    api.send(`/knowledge/articles/${encodeURIComponent(articleId)}/authors?workspaceId=${ws(workspaceId)}`),
  addAuthor: (workspaceId, articleId, userId, role) =>
    api.send(`/knowledge/articles/${encodeURIComponent(articleId)}/authors?workspaceId=${ws(workspaceId)}`,
      { method: 'POST', body: { userId, role } }),
  removeAuthor: (workspaceId, articleId, userId) =>
    api.send(`/knowledge/articles/${encodeURIComponent(articleId)}/authors/${encodeURIComponent(userId)}?workspaceId=${ws(workspaceId)}`,
      { method: 'DELETE' }),
};

export const extractionClient = {
  extract: (workspaceId, text) =>
    api.send(`/knowledge/extract?workspaceId=${ws(workspaceId)}`, { method: 'POST', body: { text } }),
};
