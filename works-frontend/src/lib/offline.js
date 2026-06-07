// Offline drafts + sync (iteration 18, Cap S — "Read and create drafts offline; sync on reconnect.
// Conflict resolution UI."). A work-item edit made while offline is queued in localStorage and
// replayed through the apiClient when connectivity returns; the server reconciles each draft with
// optimistic-concurrency conflict detection and tells us APPLIED / CONFLICT / MISSING per draft.
//
// Pure queue helpers (no network) are exported for unit testing; the sync call uses the shared
// apiClient (CLAUDE.md §3 — never raw fetch).
import { api } from './apiClient';

const KEY = 'bSmartOfflineDrafts';

function read() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function write(drafts) {
  localStorage.setItem(KEY, JSON.stringify(drafts));
  return drafts;
}

// Queue (or replace) a draft for a work item. Keyed by id so re-editing the same item offline keeps
// one pending draft carrying the latest fields and the original base version.
export function queueDraft(draft) {
  if (!draft || !draft.id) throw new Error('A draft needs a work item id');
  const drafts = read();
  const existing = drafts.find((d) => d.id === draft.id);
  if (existing) {
    Object.assign(existing, { ...draft, baseVersion: existing.baseVersion ?? draft.baseVersion });
  } else {
    drafts.push({ ...draft, queuedAt: Date.now() });
  }
  return write(drafts);
}

export function pendingDrafts() {
  return read();
}

export function pendingCount() {
  return read().length;
}

export function removeDraft(id) {
  return write(read().filter((d) => d.id !== id));
}

export function clearDrafts() {
  return write([]);
}

// Replay all queued drafts. Returns { results } from the server; APPLIED drafts are dropped from the
// queue, CONFLICT/MISSING are kept so the UI can resolve them. No-op (empty results) when nothing is
// queued. Throws on a transport failure so the caller can keep the queue and retry later.
export async function syncDrafts() {
  const drafts = read();
  if (drafts.length === 0) return { results: [] };
  const payload = drafts.map((d) => ({
    id: d.id,
    baseVersion: d.baseVersion,
    title: d.title ?? null,
    description: d.description ?? null,
    status: d.status ?? null,
  }));
  const res = await api.send('/sync/work-item-drafts', { method: 'POST', body: { drafts: payload } });
  const applied = (res.results || []).filter((r) => r.result === 'APPLIED').map((r) => r.id);
  if (applied.length) write(read().filter((d) => !applied.includes(d.id)));
  return res;
}

// Subscribe to online/offline transitions. Returns an unsubscribe fn. Guards SSR/tests with no window.
export function onConnectivityChange(handler) {
  if (typeof window === 'undefined') return () => {};
  const online = () => handler(true);
  const offline = () => handler(false);
  window.addEventListener('online', online);
  window.addEventListener('offline', offline);
  return () => {
    window.removeEventListener('online', online);
    window.removeEventListener('offline', offline);
  };
}

export function isOnline() {
  return typeof navigator === 'undefined' ? true : navigator.onLine !== false;
}
