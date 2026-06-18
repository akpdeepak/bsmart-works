import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from './apiClient';
import { streamUrl, sendPresence, connectRealtime } from './realtime';

vi.mock('./apiClient', () => ({ api: { send: vi.fn(), base: 'http://host/api/v1' } }));

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('realtime', () => {
  it('builds an SSE url with workspace + token query params', () => {
    localStorage.setItem('bSmartSession', JSON.stringify({ token: 'tok-123' }));
    const url = streamUrl('WS-1');
    expect(url).toContain('http://host/api/v1/realtime/stream');
    expect(url).toContain('workspaceId=WS-1');
    expect(url).toContain('access_token=tok-123');
  });

  it('omits the token param when there is no session', () => {
    const url = streamUrl('WS-1');
    expect(url).not.toContain('access_token');
  });

  it('supports relative API bases used by the deployed nginx frontend', () => {
    const url = streamUrl('WS-1', '/api/v1', null);
    const parsed = new URL(url);
    expect(parsed.pathname).toBe('/api/v1/realtime/stream');
    expect(parsed.searchParams.get('workspaceId')).toBe('WS-1');
  });

  it('connectRealtime returns a no-op disposer when EventSource is unavailable', () => {
    const dispose = connectRealtime('WS-1', { event: vi.fn() });
    expect(typeof dispose).toBe('function');
    expect(() => dispose()).not.toThrow();
  });

  it('sendPresence posts through the apiClient and swallows failures', async () => {
    api.send.mockResolvedValue([{ userId: 'U1' }]);
    const roster = await sendPresence({ workspaceId: 'WS-1', name: 'Asha', location: 'board' });
    expect(api.send).toHaveBeenCalledWith('/realtime/presence', expect.objectContaining({ method: 'POST' }));
    expect(roster).toEqual([{ userId: 'U1' }]);

    api.send.mockRejectedValue(new Error('offline'));
    await expect(sendPresence({ workspaceId: 'WS-1' })).resolves.toBeNull();
  });
});
