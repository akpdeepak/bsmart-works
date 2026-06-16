// use-article-presence.js — tracks who is currently viewing/editing an article via SSE.
// Wires joinArticlePresence from src/lib/presence.js into a React hook that handles
// connection lifecycle (open on mount, close on unmount or deps change).
// WI-29: SSE presence indicators for the collaborative knowledge editor.

import { useState, useEffect } from 'react';
import { joinArticlePresence } from '@/lib/presence';

/**
 * useArticlePresence — tracks who is currently viewing/editing an article.
 * Returns the list of present users (excluding self).
 *
 * @param {string|null|undefined} workspaceId
 * @param {string|null|undefined} articleId
 * @param {string|null|undefined} currentUserId
 * @returns {object[]} viewers — PresenceUser[] without currentUserId
 */
export function useArticlePresence(workspaceId, articleId, currentUserId) {
  const [viewers, setViewers] = useState([]);

  useEffect(() => {
    if (!workspaceId || !articleId || !currentUserId) return;

    const leave = joinArticlePresence(workspaceId, articleId, currentUserId, (users) => {
      setViewers(users.filter((u) => u.userId !== currentUserId));
    });

    return leave;
  }, [workspaceId, articleId, currentUserId]);

  return viewers;
}
