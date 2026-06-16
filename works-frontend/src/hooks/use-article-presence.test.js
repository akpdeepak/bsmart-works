// use-article-presence.test.js — unit tests for the useArticlePresence hook.
// WI-29: SSE presence indicators for the collaborative knowledge editor.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useArticlePresence } from './use-article-presence';

// ── Mock presence lib ────────────────────────────────────────────────────────
// joinArticlePresence is mocked so we can control when the callback is called
// and inspect that cleanup (leave) is invoked on unmount.

let capturedCallback = null;
const mockLeave = vi.fn();

vi.mock('@/lib/presence', () => ({
  joinArticlePresence: vi.fn((workspaceId, articleId, userId, onUpdate) => {
    capturedCallback = onUpdate;
    return mockLeave;
  }),
}));

import { joinArticlePresence } from '@/lib/presence';

beforeEach(() => {
  vi.clearAllMocks();
  capturedCallback = null;
});

afterEach(() => {
  capturedCallback = null;
});

describe('useArticlePresence', () => {
  it('returns an empty array initially', () => {
    const { result } = renderHook(() =>
      useArticlePresence('WS-1', 'ART-1', 'U-me')
    );
    expect(result.current).toEqual([]);
  });

  it('calls joinArticlePresence with the supplied ids', () => {
    renderHook(() => useArticlePresence('WS-1', 'ART-1', 'U-me'));
    expect(joinArticlePresence).toHaveBeenCalledWith('WS-1', 'ART-1', 'U-me', expect.any(Function));
  });

  it('updates viewers when the presence callback fires', () => {
    const { result } = renderHook(() =>
      useArticlePresence('WS-1', 'ART-1', 'U-me')
    );

    act(() => {
      capturedCallback([
        { userId: 'U-2', name: 'Asha', editingBlockId: null },
        { userId: 'U-3', name: 'Priya', editingBlockId: 'blk-1' },
      ]);
    });

    expect(result.current).toHaveLength(2);
  });

  it('filters out currentUserId from the viewer list', () => {
    const { result } = renderHook(() =>
      useArticlePresence('WS-1', 'ART-1', 'U-me')
    );

    act(() => {
      capturedCallback([
        { userId: 'U-me', name: 'Self', editingBlockId: null }, // should be filtered
        { userId: 'U-2', name: 'Asha', editingBlockId: null },
      ]);
    });

    expect(result.current).toHaveLength(1);
    expect(result.current[0].userId).toBe('U-2');
  });

  it('calls leave (cleanup) on unmount', () => {
    const { unmount } = renderHook(() =>
      useArticlePresence('WS-1', 'ART-1', 'U-me')
    );
    unmount();
    expect(mockLeave).toHaveBeenCalledTimes(1);
  });

  it('does not call joinArticlePresence when workspaceId is missing', () => {
    renderHook(() => useArticlePresence(null, 'ART-1', 'U-me'));
    expect(joinArticlePresence).not.toHaveBeenCalled();
  });

  it('does not call joinArticlePresence when articleId is missing', () => {
    renderHook(() => useArticlePresence('WS-1', null, 'U-me'));
    expect(joinArticlePresence).not.toHaveBeenCalled();
  });

  it('does not call joinArticlePresence when currentUserId is missing', () => {
    renderHook(() => useArticlePresence('WS-1', 'ART-1', null));
    expect(joinArticlePresence).not.toHaveBeenCalled();
  });
});
