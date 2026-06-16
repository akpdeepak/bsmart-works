// bSmart Works — unified search client (WI-30).
// Searches across work items (via BQL title-contains query) and articles (via FTS endpoint).
// All HTTP goes through the single apiClient (RB-10 §1; no inline fetch/axios).

import { api } from '@/lib/apiClient';

// Returns { workItems: [], articles: [], total: number }.
// `types` controls which resource kinds to query — pass ['work_items'] or ['articles'] to restrict.
export const searchClient = {
  async search(workspaceId, query, { types = ['work_items', 'articles'], page = 0, size = 20 } = {}) {
    // BQL title-contains — simplest text filter the backend already supports.
    const bqlQuery = `title contains "${query.replace(/"/g, '\\"')}"`;
    const wiParams = new URLSearchParams({ workspaceId, q: bqlQuery, page, size });

    const [wiResult, articleResult] = await Promise.allSettled([
      types.includes('work_items')
        ? api.send(`/work-items?${wiParams}`)
        : Promise.resolve({ content: [], totalElements: 0 }),
      types.includes('articles')
        ? api.send(`/knowledge/search?workspaceId=${encodeURIComponent(workspaceId)}&q=${encodeURIComponent(query)}&page=${page}&size=${size}`)
        : Promise.resolve({ content: [], totalElements: 0 }),
    ]);

    const workItems = wiResult.status === 'fulfilled' ? (wiResult.value?.content ?? []) : [];
    const articles  = articleResult.status === 'fulfilled' ? (articleResult.value?.content ?? []) : [];

    return { workItems, articles, total: workItems.length + articles.length };
  },
};
