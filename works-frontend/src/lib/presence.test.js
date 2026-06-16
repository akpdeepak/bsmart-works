// presence.test.js — unit tests for the SSE-based article co-presence + soft-lock client.
// WI-29: real-time collaborative knowledge editor.
//
// Mocks:
//   - apiClient (api.send) — verified not to use inline fetch
//   - EventSource — global stub with addEventListener / close / onerror inspection

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mock apiClient ──────────────────────────────────────────────────────────
vi.mock('@/lib/apiClient', () => ({
  api: {
    send: vi.fn(),
  },
}));

import { api } from '@/lib/apiClient';
import { joinArticlePresence, requestEditLock, releaseEditLock } from './presence';

// ── EventSource stub ────────────────────────────────────────────────────────
class MockEventSource {
  constructor(url) {
    this.url = url;
    this._listeners = {};
    this.onerror = null;
    MockEventSource.instances.push(this);
  }
  addEventListener(type, fn) {
    if (!this._listeners[type]) this._listeners[type] = [];
    this._listeners[type].push(fn);
  }
  close() { this.closed = true; }
  // Test helper: dispatch a fake server-sent event
  emit(type, data) {
    const evt = { data: typeof data === 'string' ? data : JSON.stringify(data) };
    (this._listeners[type] || []).forEach((fn) => fn(evt));
  }
  static instances = [];
  static reset() { MockEventSource.instances = []; }
}

beforeEach(() => {
  vi.clearAllMocks();
  MockEventSource.reset();
  vi.stubGlobal('EventSource', MockEventSource);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ── joinArticlePresence ─────────────────────────────────────────────────────

describe('joinArticlePresence', () => {
  it('opens an EventSource with the correct URL parameters', () => {
    api.send.mockResolvedValue({});
    const leave = joinArticlePresence('WS-1', 'ART-1', 'U-1', () => {});
    leave();

    const es = MockEventSource.instances[0];
    expect(es).toBeDefined();
    expect(es.url).toContain('/api/v1/knowledge/presence');
    expect(es.url).toContain('workspaceId=WS-1');
    expect(es.url).toContain('articleId=ART-1');
    expect(es.url).toContain('userId=U-1');
  });

  it('parses presence events and passes them to the callback', () => {
    api.send.mockResolvedValue({});
    const onUpdate = vi.fn();
    const leave = joinArticlePresence('WS-1', 'ART-1', 'U-1', onUpdate);

    const es = MockEventSource.instances[0];
    const viewers = [{ userId: 'U-2', name: 'Asha', editingBlockId: null }];
    es.emit('presence', viewers);

    expect(onUpdate).toHaveBeenCalledWith(viewers);
    leave();
  });

  it('swallows malformed presence event data without crashing', () => {
    api.send.mockResolvedValue({});
    const onUpdate = vi.fn();
    const leave = joinArticlePresence('WS-1', 'ART-1', 'U-1', onUpdate);

    const es = MockEventSource.instances[0];
    // Emit raw bad JSON directly
    (es._listeners['presence'] || []).forEach((fn) => fn({ data: '{bad json' }));

    expect(onUpdate).not.toHaveBeenCalled(); // error swallowed
    leave();
  });

  it('cleanup function closes the EventSource and posts a leave signal', async () => {
    api.send.mockResolvedValue({});
    const leave = joinArticlePresence('WS-1', 'ART-1', 'U-1', () => {});
    const es = MockEventSource.instances[0];

    leave();

    expect(es.closed).toBe(true);
    expect(api.send).toHaveBeenCalledWith(
      '/knowledge/presence/leave',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('does not reconnect after leave is called when EventSource errors', async () => {
    vi.useFakeTimers();
    api.send.mockResolvedValue({});
    const leave = joinArticlePresence('WS-1', 'ART-1', 'U-1', () => {});
    const es = MockEventSource.instances[0];

    leave(); // mark as closed
    es.onerror?.(); // trigger error handler after closed

    vi.advanceTimersByTime(5000);
    // No second EventSource should be created
    expect(MockEventSource.instances.length).toBe(1);
    vi.useRealTimers();
  });
});

// ── requestEditLock ──────────────────────────────────────────────────────────

describe('requestEditLock', () => {
  it('returns granted=true when the server grants the lock', async () => {
    api.send.mockResolvedValue({ granted: true });
    const result = await requestEditLock('WS-1', 'ART-1', 'U-1');
    expect(result).toEqual({ granted: true });
    expect(api.send).toHaveBeenCalledWith(
      '/knowledge/edit-lock',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('returns granted=false with lockedBy when the server denies the lock', async () => {
    api.send.mockResolvedValue({ granted: false, lockedBy: 'Priya' });
    const result = await requestEditLock('WS-1', 'ART-1', 'U-1');
    expect(result).toEqual({ granted: false, lockedBy: 'Priya' });
  });

  it('returns { granted: true } on network error (graceful degradation)', async () => {
    api.send.mockRejectedValue(new Error('Network error'));
    const result = await requestEditLock('WS-1', 'ART-1', 'U-1');
    expect(result).toEqual({ granted: true });
  });
});

// ── releaseEditLock ──────────────────────────────────────────────────────────

describe('releaseEditLock', () => {
  it('calls the release endpoint', async () => {
    api.send.mockResolvedValue({});
    await releaseEditLock('WS-1', 'ART-1', 'U-1');
    expect(api.send).toHaveBeenCalledWith(
      '/knowledge/edit-lock/release',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('swallows errors silently', async () => {
    api.send.mockRejectedValue(new Error('offline'));
    await expect(releaseEditLock('WS-1', 'ART-1', 'U-1')).resolves.toBeUndefined();
  });
});
