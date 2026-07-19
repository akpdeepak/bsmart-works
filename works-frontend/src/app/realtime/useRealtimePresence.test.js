import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRealtimePresence } from './useRealtimePresence';
import { connectRealtime, leavePresence, sendPresence } from '@/lib/realtime';

vi.mock('@/lib/realtime', () => ({
  connectRealtime: vi.fn(),
  leavePresence: vi.fn(),
  sendPresence: vi.fn(),
}));
vi.mock('@/lib/query-client', () => ({ queryClient: { invalidateQueries: vi.fn() } }));

describe('useRealtimePresence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    connectRealtime.mockReturnValue(vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('connects only after membership-backed workspace context is ready', () => {
    const { rerender } = renderHook(
      ({ enabled, workspaceId }) => useRealtimePresence({
        currentUser: { id: 'USR-1', fullName: 'A User' },
        workspaceId,
        view: 'dashboard',
        enabled,
      }),
      { initialProps: { enabled: false, workspaceId: '' } },
    );

    expect(connectRealtime).not.toHaveBeenCalled();
    rerender({ enabled: true, workspaceId: 'WS-A' });

    expect(connectRealtime).toHaveBeenCalledWith('WS-A', expect.any(Object));
    expect(sendPresence).toHaveBeenCalledWith(expect.objectContaining({ workspaceId: 'WS-A' }));
  });

  it('closes the stream and leaves presence on unmount', () => {
    const dispose = vi.fn();
    connectRealtime.mockReturnValue(dispose);
    const { unmount } = renderHook(() => useRealtimePresence({
      currentUser: { id: 'USR-1', email: 'user@example.com' },
      workspaceId: 'WS-A',
      view: 'dashboard',
    }));

    unmount();

    expect(dispose).toHaveBeenCalled();
    expect(leavePresence).toHaveBeenCalledWith('WS-A');
  });
});
