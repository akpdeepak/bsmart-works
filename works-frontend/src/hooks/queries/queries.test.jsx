import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useWorkspaceUsers } from './useWorkspaceUsers';
import { useProjects } from './useProjects';
import { useWorkItems } from './useWorkItems';
import { usersKeys, projectsKeys, workItemsKeys, savedViewsKeys } from './keys';
import { api } from '@/lib/apiClient';

vi.mock('@/lib/apiClient', () => ({ api: { send: vi.fn() } }));

// Fresh client per render so there is no cache bleed between assertions.
function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => vi.clearAllMocks());

describe('query key factories', () => {
  it('keys the users and projects caches by workspace', () => {
    expect(usersKeys.list('ws-9')).toEqual(['users', 'ws-9']);
    expect(projectsKeys.list('ws-9')).toEqual(['projects', 'ws-9']);
  });

  it('keys work-items by workspace + optional project (null when absent)', () => {
    expect(workItemsKeys.list('ws-9', 'p-1')).toEqual(['work-items', 'ws-9', 'p-1']);
    expect(workItemsKeys.list('ws-9')).toEqual(['work-items', 'ws-9', null]);
    expect(workItemsKeys.detail('WRK-42')).toEqual(['work-items', 'WRK-42']);
  });

  it('keys saved-views by workspace + optional project (null when absent)', () => {
    expect(savedViewsKeys.list('ws-9', 'p-1')).toEqual(['saved-views', 'ws-9', 'p-1']);
    expect(savedViewsKeys.list('ws-9')).toEqual(['saved-views', 'ws-9', null]);
  });
});

describe('useWorkspaceUsers', () => {
  it('fetches /users for the workspace and returns the list', async () => {
    api.send.mockResolvedValue([{ id: 'u-1' }, { id: 'u-2' }]);
    const { result } = renderHook(() => useWorkspaceUsers('ws-1'), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.send).toHaveBeenCalledWith('/users?workspaceId=ws-1');
    expect(result.current.data).toEqual([{ id: 'u-1' }, { id: 'u-2' }]);
  });

  it('is disabled (no fetch) when workspaceId is missing', () => {
    const { result } = renderHook(() => useWorkspaceUsers(undefined), { wrapper: makeWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
    expect(api.send).not.toHaveBeenCalled();
  });
});

describe('useProjects', () => {
  it('fetches /projects for the workspace and returns the list', async () => {
    api.send.mockResolvedValue([{ id: 'p-1' }]);
    const { result } = renderHook(() => useProjects('ws-1'), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.send).toHaveBeenCalledWith('/projects?workspaceId=ws-1');
    expect(result.current.data).toEqual([{ id: 'p-1' }]);
  });

  it('is disabled (no fetch) when workspaceId is missing', () => {
    const { result } = renderHook(() => useProjects(''), { wrapper: makeWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
    expect(api.send).not.toHaveBeenCalled();
  });
});

describe('useWorkItems', () => {
  it('fetches /work-items for the workspace', async () => {
    api.send.mockResolvedValue([{ id: 'WRK-1' }]);
    const { result } = renderHook(() => useWorkItems('ws-1'), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.send).toHaveBeenCalledWith('/work-items?workspaceId=ws-1');
    expect(result.current.data).toEqual([{ id: 'WRK-1' }]);
  });

  it('appends projectId when provided', async () => {
    api.send.mockResolvedValue([]);
    const { result } = renderHook(() => useWorkItems('ws-1', { projectId: 'p-1' }), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.send).toHaveBeenCalledWith('/work-items?workspaceId=ws-1&projectId=p-1');
  });

  it('is disabled when workspaceId is missing', () => {
    const { result } = renderHook(() => useWorkItems(''), { wrapper: makeWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
    expect(api.send).not.toHaveBeenCalled();
  });
});
