import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useWorkItemCreate, useWorkItemStatusChange } from './useWorkItemMutations';
import { workItemsKeys } from './keys';
import { api } from '@/lib/apiClient';

vi.mock('@/lib/apiClient', () => ({ api: { send: vi.fn() } }));

const WS = 'ws-test';
const PROJ = 'proj-1';

// Returns a fresh { qc, wrapper } pair per test — no cache bleed between assertions.
function makeWrapper(qcOpts = {}) {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: 0 },
    },
    ...qcOpts,
  });
  const wrapper = ({ children }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { qc, wrapper };
}

const ITEM_A = { id: 'WRK-1', title: 'Bug report', status: 'TODO', projectId: PROJ };
const ITEM_B = { id: 'WRK-2', title: 'Feature', status: 'IN_PROGRESS', projectId: PROJ };

beforeEach(() => vi.clearAllMocks());

// ── useWorkItemCreate ──────────────────────────────────────────────────────────────────────────

describe('useWorkItemCreate', () => {
  it('inserts an optimistic placeholder into the cache while the request is in flight', async () => {
    const { qc, wrapper } = makeWrapper();
    const key = workItemsKeys.list(WS, PROJ);
    qc.setQueryData(key, [ITEM_A]);

    // Never resolves — lets us observe the mid-flight cache state.
    api.send.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useWorkItemCreate(WS, { projectId: PROJ }), { wrapper });

    act(() => {
      result.current.mutate({ title: 'New item', projectId: PROJ });
    });

    await waitFor(() => {
      const items = qc.getQueryData(key);
      expect(items).toHaveLength(2);
      expect(items[0]._temp).toBe(true);
      expect(items[0].title).toBe('New item');
    });
  });

  it('places the optimistic item at the front of the list', async () => {
    const { qc, wrapper } = makeWrapper();
    const key = workItemsKeys.list(WS, PROJ);
    qc.setQueryData(key, [ITEM_A, ITEM_B]);
    api.send.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useWorkItemCreate(WS, { projectId: PROJ }), { wrapper });

    act(() => { result.current.mutate({ title: 'Newest', projectId: PROJ }); });

    await waitFor(() => {
      expect(qc.getQueryData(key)?.[0]._temp).toBe(true);
    });
  });

  it('replaces the optimistic placeholder with the server item on success', async () => {
    const { qc, wrapper } = makeWrapper();
    const key = workItemsKeys.list(WS, PROJ);
    qc.setQueryData(key, [ITEM_A]);
    const saved = { id: 'WRK-99', title: 'New item', status: 'TODO', autoId: 'TSK-99', projectId: PROJ };
    api.send.mockResolvedValue(saved);

    const { result } = renderHook(() => useWorkItemCreate(WS, { projectId: PROJ }), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ title: 'New item', projectId: PROJ });
    });

    await waitFor(() => {
      const items = qc.getQueryData(key);
      expect(items?.find((i) => i._temp)).toBeUndefined();
      expect(items?.find((i) => i.id === 'WRK-99')).toBeDefined();
    });
  });

  it('rolls back to the pre-mutation snapshot when the server rejects the create', async () => {
    const { qc, wrapper } = makeWrapper();
    const key = workItemsKeys.list(WS, PROJ);
    qc.setQueryData(key, [ITEM_A]);
    api.send.mockRejectedValue(Object.assign(new Error('Validation failed'), { status: 422 }));

    const { result } = renderHook(() => useWorkItemCreate(WS, { projectId: PROJ }), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ title: 'x', projectId: PROJ }).catch(() => {});
    });

    await waitFor(() => {
      expect(qc.getQueryData(key)).toEqual([ITEM_A]);
    });
  });

  it('starts the cache at [optimistic] when the cache was empty before the mutation', async () => {
    const { qc, wrapper } = makeWrapper();
    const key = workItemsKeys.list(WS, PROJ);
    // No pre-existing cache entry.
    api.send.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useWorkItemCreate(WS, { projectId: PROJ }), { wrapper });

    act(() => { result.current.mutate({ title: 'First', projectId: PROJ }); });

    await waitFor(() => {
      const items = qc.getQueryData(key);
      expect(items).toHaveLength(1);
      expect(items[0]._temp).toBe(true);
    });
  });

  it('surfaces the server error to the caller onError callback', async () => {
    const { qc, wrapper } = makeWrapper();
    qc.setQueryData(workItemsKeys.list(WS, PROJ), [ITEM_A]);
    const serverErr = Object.assign(new Error('Title too short'), { status: 422 });
    api.send.mockRejectedValue(serverErr);

    const { result } = renderHook(() => useWorkItemCreate(WS, { projectId: PROJ }), { wrapper });
    const onError = vi.fn();

    await act(async () => {
      await result.current.mutateAsync({ title: 'x' }, { onError }).catch(() => {});
    });

    await waitFor(() => {
      expect(onError).toHaveBeenCalled();
      expect(onError.mock.calls[0][0]).toBe(serverErr);
    });
  });
});

// ── useWorkItemStatusChange ────────────────────────────────────────────────────────────────────

describe('useWorkItemStatusChange', () => {
  it('updates the item status in the cache immediately (before the request resolves)', async () => {
    const { qc, wrapper } = makeWrapper();
    const key = workItemsKeys.list(WS, PROJ);
    qc.setQueryData(key, [ITEM_A, ITEM_B]);
    api.send.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useWorkItemStatusChange(WS, { projectId: PROJ }), { wrapper });

    act(() => { result.current.mutate({ item: ITEM_A, newStatus: 'DONE' }); });

    await waitFor(() => {
      const updated = qc.getQueryData(key)?.find((i) => i.id === ITEM_A.id);
      expect(updated?.status).toBe('DONE');
    });
  });

  it('leaves all other items unchanged during the optimistic update', async () => {
    const { qc, wrapper } = makeWrapper();
    const key = workItemsKeys.list(WS, PROJ);
    qc.setQueryData(key, [ITEM_A, ITEM_B]);
    api.send.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useWorkItemStatusChange(WS, { projectId: PROJ }), { wrapper });

    act(() => { result.current.mutate({ item: ITEM_A, newStatus: 'DONE' }); });

    await waitFor(() => {
      const itemB = qc.getQueryData(key)?.find((i) => i.id === ITEM_B.id);
      expect(itemB?.status).toBe(ITEM_B.status);
    });
  });

  it('rolls back to the original status when the server rejects the transition', async () => {
    const { qc, wrapper } = makeWrapper();
    const key = workItemsKeys.list(WS, PROJ);
    qc.setQueryData(key, [ITEM_A, ITEM_B]);
    api.send.mockRejectedValue(
      Object.assign(new Error('Transition not allowed'), { code: 'TRANSITION_CONDITION_FAILED', status: 422 }),
    );

    const { result } = renderHook(() => useWorkItemStatusChange(WS, { projectId: PROJ }), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ item: ITEM_A, newStatus: 'DONE' }).catch(() => {});
    });

    await waitFor(() => {
      const reverted = qc.getQueryData(key)?.find((i) => i.id === ITEM_A.id);
      expect(reverted?.status).toBe(ITEM_A.status);
    });
  });

  it('adopts the full server-returned item on success (picks up statusChangedAt and derived fields)', async () => {
    const { qc, wrapper } = makeWrapper();
    const key = workItemsKeys.list(WS, PROJ);
    qc.setQueryData(key, [ITEM_A, ITEM_B]);
    const serverItem = { ...ITEM_A, status: 'DONE', statusChangedAt: '2026-06-15T00:00:00Z' };
    api.send.mockResolvedValue(serverItem);

    const { result } = renderHook(() => useWorkItemStatusChange(WS, { projectId: PROJ }), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ item: ITEM_A, newStatus: 'DONE' });
    });

    await waitFor(() => {
      const updated = qc.getQueryData(key)?.find((i) => i.id === ITEM_A.id);
      expect(updated?.statusChangedAt).toBe('2026-06-15T00:00:00Z');
    });
  });

  it('surfaces the server error to the caller onError callback', async () => {
    const { qc, wrapper } = makeWrapper();
    qc.setQueryData(workItemsKeys.list(WS, PROJ), [ITEM_A]);
    const serverErr = Object.assign(new Error('Validator failed'), { code: 'VALIDATOR_FAILED', status: 422 });
    api.send.mockRejectedValue(serverErr);

    const { result } = renderHook(() => useWorkItemStatusChange(WS, { projectId: PROJ }), { wrapper });
    const onError = vi.fn();

    await act(async () => {
      await result.current.mutateAsync({ item: ITEM_A, newStatus: 'DONE' }, { onError }).catch(() => {});
    });

    await waitFor(() => {
      expect(onError).toHaveBeenCalled();
      expect(onError.mock.calls[0][0]).toBe(serverErr);
    });
  });
});
