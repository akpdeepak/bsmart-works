import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useWorkspaceUsers } from './useWorkspaceUsers';
import { useProjects } from './useProjects';
import { useWorkspaceSetup } from './useWorkspaceSetup';
import { usersKeys, projectsKeys, workspaceSetupKeys } from './keys';
import { api } from '@/lib/apiClient';

vi.mock('@/lib/apiClient', () => ({ api: { send: vi.fn() } }));

// Fresh client per render so there is no cache bleed between assertions.
function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => vi.clearAllMocks());

describe('query key factories', () => {
  it('key the cache by workspace', () => {
    expect(usersKeys.list('ws-9')).toEqual(['users', 'ws-9']);
    expect(projectsKeys.list('ws-9')).toEqual(['projects', 'ws-9']);
    expect(workspaceSetupKeys.status('ws-9')).toEqual(['workspace-setup', 'ws-9', 'status']);
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

describe('useWorkspaceSetup', () => {
  it('fetches /workspace-setup/status and returns setup data', async () => {
    const fixture = { needsWizard: true, score: 0, steps: [], templates: [] };
    api.send.mockResolvedValue(fixture);
    const { result } = renderHook(() => useWorkspaceSetup('ws-1'), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.send).toHaveBeenCalledWith('/workspace-setup/status?workspaceId=ws-1');
    expect(result.current.data).toEqual(fixture);
  });

  it('is disabled when workspaceId is missing', () => {
    const { result } = renderHook(() => useWorkspaceSetup(undefined), { wrapper: makeWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
    expect(api.send).not.toHaveBeenCalled();
  });
});
