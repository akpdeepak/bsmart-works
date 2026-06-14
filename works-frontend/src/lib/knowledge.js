// bSmart Works — Knowledge client (spaces + articles). Every call goes through the single apiClient
// (CLAUDE.md §3). Used by the "Save to Know" quick-capture so any surface in the app can turn what's
// on screen into a knowledge article without leaving the page (one knowledge layer — RB-40 unification).

import { api } from '@/lib/apiClient';

export const knowledge = {
  listSpaces: () => api.send('/knowledge-spaces'),
  createArticle: (body) => api.send('/articles', { method: 'POST', body }),
  // Link an article to a work item so the doc and the work that produced it stay connected.
  linkWorkItem: (articleId, workItemId, linkType = 'DOCUMENTS') =>
    api.send(`/articles/${encodeURIComponent(articleId)}/links`, { method: 'POST', body: { workItemId, linkType } }),
};
