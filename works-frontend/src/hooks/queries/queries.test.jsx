import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useWorkspaceUsers } from './useWorkspaceUsers';
import { useProjects } from './useProjects';
import { useFeatureFlags, useFeatureFlag } from './useFeatureFlags';
import { useWorkspaceSetup } from './useWorkspaceSetup';
import { usersKeys, projectsKeys, featureFlagsKeys, workspaceSetupKeys } from './keys';
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
    expect(featureFlagsKeys.list('ws-9')).toEqual(['feature-flags', 'ws-9']);
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

describe('useFeatureFlags', () => {
  it('fetches /feature-flags for the workspace', async () => {
    api.send.mockResolvedValue({ flags: [{ name: 'onboarding_wizard', enabled: false, variant: null }], workspaceId: 'ws-1' });
    const { result } = renderHook(() => useFeatureFlags('ws-1'), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.send).toHaveBeenCalledWith('/feature-flags?workspaceId=ws-1');
    expect(result.current.data.flags).toHaveLength(1);
  });

  it('is disabled when workspaceId is missing', () => {
    const { result } = renderHook(() => useFeatureFlags(''), { wrapper: makeWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
    expect(api.send).not.toHaveBeenCalled();
  });
});

describe('useFeatureFlag', () => {
  it('returns enabled=true when the named flag is enabled', async () => {
    api.send.mockResolvedValue({ flags: [{ name: 'inline_quick_add', enabled: true, variant: 'A' }], workspaceId: 'ws-1' });
    const { result } = renderHook(() => useFeatureFlag('ws-1', 'inline_quick_add'), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.enabled).toBe(true));
    expect(result.current.variant).toBe('A');
  });

  it('returns enabled=false when the flag is absent from the response', async () => {
    api.send.mockResolvedValue({ flags: [], workspaceId: 'ws-1' });
    const { result } = renderHook(() => useFeatureFlag('ws-1', 'nonexistent_flag'), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.enabled).toBe(false));
    expect(result.current.variant).toBeNull();
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
