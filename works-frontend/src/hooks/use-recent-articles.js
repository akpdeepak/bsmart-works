// KR-036 — Recently-viewed articles stored in localStorage per workspace + user.
// No backend needed — recency is a pure client-side UX affordance (not audited data).
// Max 10 entries; oldest are dropped when the list overflows.

const MAX_RECENT = 10;

function storageKey(workspaceId, userId) {
  return `know_recent_${workspaceId}_${userId}`;
}

function loadRecent(workspaceId, userId) {
  if (!workspaceId || !userId) return [];
  try {
    const raw = localStorage.getItem(storageKey(workspaceId, userId));
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRecent(workspaceId, userId, list) {
  if (!workspaceId || !userId) return;
  try {
    localStorage.setItem(storageKey(workspaceId, userId), JSON.stringify(list));
  } catch { /* storage quota — silently ignore */ }
}

/**
 * useRecentArticles — reads and writes the recently-viewed article list.
 *
 * Returns [recentArticles, addRecent, clearAll]:
 *   recentArticles  — array of article objects (last-viewed first), max 10
 *   addRecent(art)  — prepends `art` to the list, deduplicating by id
 *   clearAll()      — empties the list
 *
 * The list is not reactive to localStorage changes in other tabs; it is refreshed
 * only when the hook mounts or addRecent/clearAll is called.
 *
 * @param {string} workspaceId
 * @param {string} userId
 */
import { useState, useCallback } from 'react';

export function useRecentArticles(workspaceId, userId) {
  const [recentArticles, setRecentArticles] = useState(() =>
    loadRecent(workspaceId, userId)
  );

  const addRecent = useCallback((article) => {
    if (!article?.id) return;
    setRecentArticles((prev) => {
      // Deduplicate — remove any existing entry for this id, then prepend.
      const deduped = prev.filter((a) => a.id !== article.id);
      const next = [article, ...deduped].slice(0, MAX_RECENT);
      saveRecent(workspaceId, userId, next);
      return next;
    });
  }, [workspaceId, userId]);

  const clearAll = useCallback(() => {
    setRecentArticles([]);
    saveRecent(workspaceId, userId, []);
  }, [workspaceId, userId]);

  return [recentArticles, addRecent, clearAll];
}
