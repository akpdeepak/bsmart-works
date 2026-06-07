// Real-time client (iteration 18, Cap S — "Server-sent events propagate updates to all open clients
// within 1 second" + co-presence). Wraps the browser EventSource against the backend SSE stream and
// posts presence heartbeats through the shared apiClient. EventSource (not fetch) is the right tool
// here and is not covered by the no-fetch rule; presence POSTs go through apiClient (CLAUDE.md §3).
import { api } from './apiClient';

function token() {
  try {
    return JSON.parse(localStorage.getItem('bSmartSession') || 'null')?.token || null;
  } catch {
    return null;
  }
}

// Build the SSE URL. The browser EventSource API cannot set an Authorization header, so the JWT
// rides as the access_token query param (the backend JWT filter honours it). Pure + tested.
export function streamUrl(workspaceId, base = api.base, tok = token()) {
  const u = new URL(`${base}/realtime/stream`);
  u.searchParams.set('workspaceId', workspaceId);
  if (tok) u.searchParams.set('access_token', tok);
  return u.toString();
}

// Open a real-time connection for a workspace. `handlers` maps SSE event names to callbacks, e.g.
// { event: fn, presence: fn, connected: fn }. Returns a disposer that closes the stream. Safe to
// call in environments without EventSource (returns a no-op disposer).
export function connectRealtime(workspaceId, handlers = {}) {
  if (typeof EventSource === 'undefined' || !workspaceId) return () => {};
  const es = new EventSource(streamUrl(workspaceId));
  for (const [name, fn] of Object.entries(handlers)) {
    es.addEventListener(name, (e) => {
      let data;
      try {
        data = e.data ? JSON.parse(e.data) : null;
      } catch {
        data = e.data;
      }
      fn(data, e);
    });
  }
  return () => es.close();
}

// Send a presence heartbeat (who's here + cursor). Best-effort; a failure is swallowed so a presence
// hiccup never disrupts the user's work.
export async function sendPresence({ workspaceId, name, location, cursorX, cursorY }) {
  try {
    return await api.send('/realtime/presence', {
      method: 'POST',
      body: { workspaceId, name, location, cursorX, cursorY },
    });
  } catch {
    return null;
  }
}

export async function leavePresence(workspaceId) {
  try {
    await api.send(`/realtime/presence/leave?workspaceId=${encodeURIComponent(workspaceId)}`, { method: 'POST' });
  } catch {
    /* ignore — the server prunes stale presence on its own */
  }
}
