import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveActiveWorkspace, useWorkspaceContext } from './useWorkspaceContext';

describe('resolveActiveWorkspace', () => {
  it('keeps a persisted workspace only when the caller is still a member', () => {
    const memberships = [{ id: 'WS-A' }, { id: 'WS-B' }];
    expect(resolveActiveWorkspace(memberships, 'WS-B')).toBe('WS-B');
    expect(resolveActiveWorkspace(memberships, 'WS-FOREIGN')).toBe('WS-A');
  });

  it('returns no workspace when the caller has no memberships', () => {
    expect(resolveActiveWorkspace([], 'WS-A')).toBe('');
  });
});

describe('useWorkspaceContext', () => {
  const store = new Map();
  const localStorageMock = {
    getItem: vi.fn((key) => store.get(key) ?? null),
    setItem: vi.fn((key, value) => store.set(key, String(value))),
    removeItem: vi.fn((key) => store.delete(key)),
  };

  beforeEach(() => {
    store.clear();
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('resolves the first authorized membership instead of inventing a default tenant', async () => {
    const api = {
      raw: vi.fn().mockResolvedValue({ json: async () => [{ id: 'WS-A', name: 'Alpha' }] }),
    };
    const { result } = renderHook(() => useWorkspaceContext(api, { id: 'USR-1' }));

    await waitFor(() => expect(result.current.ready).toBe(true));

    expect(result.current.activeWorkspaceId).toBe('WS-A');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('bSmartActiveWorkspace', 'WS-A');
  });

  it('rejects a workspace selection outside the loaded membership list', async () => {
    const api = {
      raw: vi.fn().mockResolvedValue({ json: async () => [{ id: 'WS-A', name: 'Alpha' }] }),
    };
    const { result } = renderHook(() => useWorkspaceContext(api, { id: 'USR-1' }));
    await waitFor(() => expect(result.current.ready).toBe(true));

    let selected;
    act(() => { selected = result.current.selectWorkspace('WS-FOREIGN'); });

    expect(selected).toBe(false);
    expect(result.current.activeWorkspaceId).toBe('WS-A');
  });

  it('does not issue workspace requests for a signed-out session', () => {
    const api = { raw: vi.fn() };
    const { result } = renderHook(() => useWorkspaceContext(api, null));

    expect(api.raw).not.toHaveBeenCalled();
    expect(result.current.activeWorkspaceId).toBe('');
    expect(result.current.ready).toBe(false);
  });
});
