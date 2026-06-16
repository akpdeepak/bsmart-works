// use-edit-lock.js — manages the soft edit lock for article editing.
// Tries to acquire the lock when editingArticle becomes true; releases on cleanup.
// WI-29: soft-lock UI for the collaborative knowledge editor.
//
// Soft-lock semantics: one editor at a time (first-come), others see a read-only banner.
// Graceful degradation: if the lock endpoint is unavailable, grant=true (optimistic mode).

import { useState, useEffect } from 'react';
import { requestEditLock, releaseEditLock } from '@/lib/presence';

/**
 * useEditLock — manages soft-lock for article editing.
 * Tries to acquire the lock when editingArticle becomes true.
 * Releases on cleanup or when editingArticle becomes false.
 *
 * @param {string|null|undefined} workspaceId
 * @param {string|null|undefined} articleId
 * @param {string|null|undefined} userId
 * @param {boolean} editingArticle — true when the editor UI is open
 * @returns {{ lockGranted: boolean, lockedBy: string|null }}
 *
 * When lockGranted=false, the editor should be read-only with a "{lockedBy} is editing" banner.
 */
export function useEditLock(workspaceId, articleId, userId, editingArticle) {
  const [lockGranted, setLockGranted] = useState(true);
  const [lockedBy, setLockedBy] = useState(null);

  useEffect(() => {
    if (!workspaceId || !articleId || !userId) return;

    // Wrap in an async IIFE so setState is always called inside an async callback,
    // not synchronously inside the effect body (satisfies react-hooks/set-state-in-effect).
    let cancelled = false;

    async function run() {
      if (editingArticle) {
        const res = await requestEditLock(workspaceId, articleId, userId);
        if (!cancelled) {
          setLockGranted(res.granted);
          setLockedBy(res.lockedBy ?? null);
        }
      } else {
        await releaseEditLock(workspaceId, articleId, userId);
        if (!cancelled) {
          setLockGranted(true);
          setLockedBy(null);
        }
      }
    }

    run();

    return () => {
      cancelled = true;
      // Best-effort release on unmount — TTL handles cleanup if this fails.
      releaseEditLock(workspaceId, articleId, userId).catch(() => {});
    };
  }, [editingArticle, workspaceId, articleId, userId]);

  return { lockGranted, lockedBy };
}
