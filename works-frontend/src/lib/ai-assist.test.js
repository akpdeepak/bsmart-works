// Tests for the AI assist client (WI-27).
// Verifies the fallback contract: every method returns a safe default when the API fails,
// so callers always have a usable response and can render the deterministic fallback UI (RB-40 §2).

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { aiAssistClient } from './ai-assist';

// ── Mock apiClient so no real HTTP is made ────────────────────────────────────

vi.mock('@/lib/apiClient', () => ({
  api: {
    send: vi.fn(),
  },
}));

// ── Fake EventSource class ────────────────────────────────────────────────────

class FakeEventSource {
  constructor(url) { this.url = url; }
  close() {}
}

// ── Mock localStorage ─────────────────────────────────────────────────────────

const store = {};
const localStorageMock = {
  getItem: (key) => (Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null),
  setItem: (key, value) => { store[key] = String(value); },
  removeItem: (key) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
};

beforeEach(() => {
  // Stub both globals fresh for each test so afterEach unstub doesn't cause issues.
  vi.stubGlobal('EventSource', FakeEventSource);
  vi.stubGlobal('localStorage', localStorageMock);
  localStorageMock.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ── Import after mocking ──────────────────────────────────────────────────────

import { api } from '@/lib/apiClient';

// ════════════════════════════════════════════════════════════════════════════
// suggestDescription
// ════════════════════════════════════════════════════════════════════════════

describe('aiAssistClient.suggestDescription', () => {
  it('returns the result from the API on success', async () => {
    api.send.mockResolvedValue({ result: 'A suggested description', fallback: false });

    const res = await aiAssistClient.suggestDescription('ws-1', { title: 'Fix bug', type: 'BUG' });

    expect(res.result).toBe('A suggested description');
    expect(res.fallback).toBe(false);
    expect(api.send).toHaveBeenCalledWith(
      expect.stringContaining('/ai/generate'),
      expect.objectContaining({ body: { prompt: 'Suggest description for BUG: Fix bug' } })
    );
  });

  it('returns { result: null, fallback: true } when the API throws', async () => {
    api.send.mockRejectedValue(new Error('Network error'));

    const res = await aiAssistClient.suggestDescription('ws-1', { title: 'Fix bug', type: 'BUG' });

    expect(res).toEqual({ result: null, fallback: true });
  });

  it('includes the workspaceId in the request URL', async () => {
    api.send.mockResolvedValue({ result: 'ok', fallback: false });

    await aiAssistClient.suggestDescription('my-workspace', { title: 'T', type: 'TASK' });

    expect(api.send).toHaveBeenCalledWith(
      expect.stringContaining('workspaceId=my-workspace'),
      expect.any(Object)
    );
  });

  it('returns { result: null, fallback: true } when AI budget is exhausted (server 503)', async () => {
    const err = new Error('AI budget exceeded');
    err.status = 503;
    api.send.mockRejectedValue(err);

    const res = await aiAssistClient.suggestDescription('ws-1', { title: 'T', type: 'TASK' });

    expect(res).toEqual({ result: null, fallback: true });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// getTodayNudges
// ════════════════════════════════════════════════════════════════════════════

describe('aiAssistClient.getTodayNudges', () => {
  it('returns nudges from the API on success', async () => {
    const nudges = [{ text: 'Focus on WORK-123 - it is due today.', workItemId: 'WORK-123' }];
    api.send.mockResolvedValue({ summary: 'Focus on the due item.', nudges, fallback: false });

    const res = await aiAssistClient.getTodayNudges('ws-1');

    expect(res.nudges).toEqual(nudges);
    expect(res.fallback).toBe(false);
  });

  it('returns a visible deterministic fallback when the API throws', async () => {
    api.send.mockRejectedValue(new Error('Timeout'));

    const res = await aiAssistClient.getTodayNudges('ws-1');

    expect(res).toMatchObject({ nudges: [], fallback: true, meta: { fallback: true } });
    expect(res.summary).toMatch(/workspace-scoped priorities/i);
  });

  it('scopes the request to the workspace without accepting another user id', async () => {
    api.send.mockResolvedValue({ nudges: [], fallback: false });

    await aiAssistClient.getTodayNudges('ws-abc');

    const [calledUrl] = api.send.mock.calls[0];
    expect(calledUrl).toContain('workspaceId=ws-abc');
    expect(calledUrl).not.toContain('userId=');
  });

  it('returns a deterministic fallback when AI is disabled (server 403)', async () => {
    const err = new Error('AI disabled for workspace');
    err.status = 403;
    api.send.mockRejectedValue(err);

    const res = await aiAssistClient.getTodayNudges('ws-1');

    expect(res).toMatchObject({ nudges: [], fallback: true, meta: { fallback: true } });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// streamComplete
// ════════════════════════════════════════════════════════════════════════════

describe('aiAssistClient.streamComplete', () => {
  it('returns an EventSource on success', () => {
    const es = aiAssistClient.streamComplete('ws-1', { prompt: 'Describe this bug', field: 'description' });
    expect(es).toBeDefined();
    expect(es).not.toBeNull();
  });

  it('includes workspaceId, prompt, and field in the EventSource URL', () => {
    const es = aiAssistClient.streamComplete('ws-1', { prompt: 'hello', field: 'title' });
    expect(es.url).toContain('workspaceId=ws-1');
    expect(es.url).toContain('prompt=hello');
    expect(es.url).toContain('field=title');
  });

  it('appends the auth token to the URL when present in localStorage', () => {
    localStorageMock.setItem('bSmartSession', JSON.stringify({ token: 'jwt-abc' }));
    const es = aiAssistClient.streamComplete('ws-1', { prompt: 'p', field: 'f' });
    expect(es.url).toContain('token=jwt-abc');
  });

  it('does not append a token param when localStorage has no session', () => {
    const es = aiAssistClient.streamComplete('ws-1', { prompt: 'p', field: 'f' });
    expect(es.url).not.toContain('token=');
  });
});
