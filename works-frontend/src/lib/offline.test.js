import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from './apiClient';
import {
  queueDraft, pendingDrafts, pendingCount, removeDraft, clearDrafts, syncDrafts, isOnline,
} from './offline';

vi.mock('./apiClient', () => ({ api: { send: vi.fn(), base: 'http://x/api/v1' } }));

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('offline drafts', () => {
  it('queues a draft and counts it', () => {
    queueDraft({ id: 'WRK-1', baseVersion: 2, title: 'A' });
    expect(pendingCount()).toBe(1);
    expect(pendingDrafts()[0].title).toBe('A');
  });

  it('coalesces repeated edits of one item, keeping the original base version', () => {
    queueDraft({ id: 'WRK-1', baseVersion: 2, title: 'A' });
    queueDraft({ id: 'WRK-1', baseVersion: 9, title: 'B' });
    expect(pendingCount()).toBe(1);
    expect(pendingDrafts()[0].title).toBe('B');
    expect(pendingDrafts()[0].baseVersion).toBe(2);
  });

  it('requires an id', () => {
    expect(() => queueDraft({ title: 'x' })).toThrow();
  });

  it('removes and clears', () => {
    queueDraft({ id: 'WRK-1', baseVersion: 1 });
    queueDraft({ id: 'WRK-2', baseVersion: 1 });
    removeDraft('WRK-1');
    expect(pendingCount()).toBe(1);
    clearDrafts();
    expect(pendingCount()).toBe(0);
  });

  it('syncDrafts is a no-op with an empty queue', async () => {
    const res = await syncDrafts();
    expect(res.results).toEqual([]);
    expect(api.send).not.toHaveBeenCalled();
  });

  it('drops APPLIED drafts but keeps CONFLICT drafts after sync', async () => {
    queueDraft({ id: 'WRK-1', baseVersion: 1, title: 'A' });
    queueDraft({ id: 'WRK-2', baseVersion: 1, title: 'B' });
    api.send.mockResolvedValue({
      results: [
        { id: 'WRK-1', result: 'APPLIED' },
        { id: 'WRK-2', result: 'CONFLICT', server: { title: 'theirs', version: 5 } },
      ],
    });
    const res = await syncDrafts();
    expect(api.send).toHaveBeenCalledOnce();
    expect(res.results).toHaveLength(2);
    const remaining = pendingDrafts();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe('WRK-2');
  });

  it('isOnline reflects navigator', () => {
    expect(typeof isOnline()).toBe('boolean');
  });
});
