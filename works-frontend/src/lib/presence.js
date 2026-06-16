// presence.js — SSE-based article co-presence + soft-lock client.
// Part of the real-time collaborative knowledge editor (WI-29, iteration 20 Cap I).
//
// Architecture: SSE (Server-Sent Events) only — no WebSockets. This matches the codebase
// convention established by PresenceService / realtime.js (SOURCE-OF-TRUTH.md: "SSE is the
// established pattern in this codebase"). The server heartbeats keep the connection alive;
// this client sends an HTTP POST heartbeat so the server knows the viewer is still present.
//
// All API calls go through apiClient (RB-10 §1 — no inline fetch).

import { api } from '@/lib/apiClient';

// Presence heartbeat interval (ms). Server closes connections after 3× this if no heartbeat.
const HEARTBEAT_MS = 15_000;

/**
 * joinArticlePresence — opens an SSE stream for article co-presence.
 * Returns a cleanup function that closes the stream and sends a leave signal.
 *
 * onPresenceUpdate(viewers: PresenceUser[]) is called whenever the viewer list changes.
 * PresenceUser: { userId, name, initials, avatarColor, editingBlockId: string | null }
 *
 * @param {string} workspaceId
 * @param {string} articleId
 * @param {string} userId
 * @param {(users: object[]) => void} onPresenceUpdate
 * @returns {() => void} cleanup / leave function
 */
export function joinArticlePresence(workspaceId, articleId, userId, onPresenceUpdate) {
  let es = null;
  let heartbeatId = null;
  let closed = false;

  function connect() {
    if (closed) return;
    const params = new URLSearchParams({ workspaceId, articleId, userId });
    es = new EventSource(`/api/v1/knowledge/presence?${params}`);

    es.addEventListener('presence', (evt) => {
      try {
        onPresenceUpdate(JSON.parse(evt.data));
      } catch {
        // Malformed payload — swallow; don't crash the editor.
      }
    });

    // Server heartbeat keep-alive — no client action needed.
    es.addEventListener('heartbeat', () => {});

    es.onerror = () => {
      es?.close();
      if (!closed) setTimeout(connect, 3000); // reconnect after 3 s
    };
  }

  // Send periodic heartbeats so the server knows we're still here.
  function sendHeartbeat() {
    if (!closed) {
      api.send('/knowledge/presence/heartbeat', {
        method: 'POST',
        body: { workspaceId, articleId, userId },
      }).catch(() => {}); // fire-and-forget; non-fatal
    }
  }

  connect();
  heartbeatId = setInterval(sendHeartbeat, HEARTBEAT_MS);

  return function leave() {
    closed = true;
    clearInterval(heartbeatId);
    es?.close();
    api.send('/knowledge/presence/leave', {
      method: 'POST',
      body: { workspaceId, articleId, userId },
    }).catch(() => {});
  };
}

/**
 * requestEditLock — requests a soft edit lock for the article.
 * Returns { granted: boolean, lockedBy?: string } — if not granted, lockedBy is the current editor.
 * Fallback: if endpoint unavailable, returns { granted: true } (optimistic, no-conflict mode).
 *
 * @param {string} workspaceId
 * @param {string} articleId
 * @param {string} userId
 * @returns {Promise<{ granted: boolean, lockedBy?: string }>}
 */
export async function requestEditLock(workspaceId, articleId, userId) {
  try {
    return await api.send('/knowledge/edit-lock', {
      method: 'POST',
      body: { workspaceId, articleId, userId },
    });
  } catch {
    // Graceful degradation — endpoint unavailable; let the user edit (optimistic mode).
    return { granted: true };
  }
}

/**
 * releaseEditLock — releases the soft edit lock for the article.
 * Fire-and-forget; errors are swallowed since the lock TTL will expire anyway.
 *
 * @param {string} workspaceId
 * @param {string} articleId
 * @param {string} userId
 * @returns {Promise<void>}
 */
export async function releaseEditLock(workspaceId, articleId, userId) {
  try {
    await api.send('/knowledge/edit-lock/release', {
      method: 'POST',
      body: { workspaceId, articleId, userId },
    });
  } catch {
    // Swallow — lock TTL will clean up on the server side.
  }
}
