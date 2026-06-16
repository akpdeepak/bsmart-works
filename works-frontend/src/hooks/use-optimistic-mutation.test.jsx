import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useOptimisticMutation } from './use-optimistic-mutation';

// Fresh QueryClient + wrapper per test — no cache bleed between assertions.
function makeWrapper(qcOpts = {}) {
  const qc = new QueryClient({
    defaultOptions: {
      queries:   { retry: false },
      mutations: { retry: 0 },
    },
    ...qcOpts,
  });
  const wrapper = ({ children }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { qc, wrapper };
}

// A realistic cache key and seed data used across tests.
const TEST_KEY = ['work-items', 'ws-1', 'proj-1'];
const ITEM_A   = { id: 'WRK-1', title: 'First item',  status: 'TODO' };
const ITEM_B   = { id: 'WRK-2', title: 'Second item', status: 'IN_PROGRESS' };

// The updater we pass — mirrors what a status-change mutation would do.
const statusUpdater = (current, { id, newStatus }) =>
  current ? current.map((i) => (i.id === id ? { ...i, status: newStatus } : i)) : current;

beforeEach(() => vi.clearAllMocks());

// ── onMutate ─────────────────────────────────────────────────────────────────────────────────────

describe('onMutate: optimistic update', () => {
  it('calls the updater with current cache data and variables, then writes the result to the cache', async () => {
    const { qc, wrapper } = makeWrapper();
    qc.setQueryData(TEST_KEY, [ITEM_A, ITEM_B]);

    const mutationFn = vi.fn(() => new Promise(() => {})); // never resolves — lets us inspect mid-flight
    const updater    = vi.fn((current, vars) => statusUpdater(current, vars));

    const { result } = renderHook(
      () => useOptimisticMutation({ queryKey: TEST_KEY, mutationFn, updater }),
      { wrapper },
    );

    act(() => {
      result.current.mutate({ id: 'WRK-1', newStatus: 'DONE' });
    });

    await waitFor(() => {
      // updater must have been called with the pre-mutation data + the variables.
      expect(updater).toHaveBeenCalledWith([ITEM_A, ITEM_B], { id: 'WRK-1', newStatus: 'DONE' });
    });
  });

  it('writes the optimistic result to the cache immediately (before the mutation resolves)', async () => {
    const { qc, wrapper } = makeWrapper();
    qc.setQueryData(TEST_KEY, [ITEM_A, ITEM_B]);

    const mutationFn = vi.fn(() => new Promise(() => {}));

    const { result } = renderHook(
      () => useOptimisticMutation({ queryKey: TEST_KEY, mutationFn, updater: statusUpdater }),
      { wrapper },
    );

    act(() => {
      result.current.mutate({ id: 'WRK-1', newStatus: 'DONE' });
    });

    await waitFor(() => {
      const cached = qc.getQueryData(TEST_KEY);
      expect(cached?.find((i) => i.id === 'WRK-1')?.status).toBe('DONE');
    });
  });

  it('leaves items that do not match the update unchanged', async () => {
    const { qc, wrapper } = makeWrapper();
    qc.setQueryData(TEST_KEY, [ITEM_A, ITEM_B]);

    const mutationFn = vi.fn(() => new Promise(() => {}));

    const { result } = renderHook(
      () => useOptimisticMutation({ queryKey: TEST_KEY, mutationFn, updater: statusUpdater }),
      { wrapper },
    );

    act(() => {
      result.current.mutate({ id: 'WRK-1', newStatus: 'DONE' });
    });

    await waitFor(() => {
      const cached = qc.getQueryData(TEST_KEY);
      expect(cached?.find((i) => i.id === 'WRK-2')?.status).toBe(ITEM_B.status);
    });
  });
});

// ── onError: rollback ────────────────────────────────────────────────────────────────────────────

describe('onError: rollback to snapshot', () => {
  it('restores the pre-mutation cache state when the server rejects the request', async () => {
    const { qc, wrapper } = makeWrapper();
    qc.setQueryData(TEST_KEY, [ITEM_A, ITEM_B]);

    const mutationFn = vi.fn().mockRejectedValue(
      Object.assign(new Error('Transition not allowed'), { code: 'TRANSITION_CONDITION_FAILED', status: 422 }),
    );

    const { result } = renderHook(
      () => useOptimisticMutation({ queryKey: TEST_KEY, mutationFn, updater: statusUpdater }),
      { wrapper },
    );

    await act(async () => {
      await result.current.mutateAsync({ id: 'WRK-1', newStatus: 'DONE' }).catch(() => {});
    });

    await waitFor(() => {
      const cached = qc.getQueryData(TEST_KEY);
      // The item must be back to its original status.
      expect(cached?.find((i) => i.id === 'WRK-1')?.status).toBe(ITEM_A.status);
    });
  });

  it('surfaces the server error to the caller-supplied onError callback', async () => {
    const { qc, wrapper } = makeWrapper();
    qc.setQueryData(TEST_KEY, [ITEM_A]);

    const serverErr  = Object.assign(new Error('Validator failed'), { status: 422 });
    const mutationFn = vi.fn().mockRejectedValue(serverErr);
    const onError    = vi.fn();

    const { result } = renderHook(
      () => useOptimisticMutation({ queryKey: TEST_KEY, mutationFn, updater: statusUpdater }),
      { wrapper },
    );

    await act(async () => {
      await result.current.mutateAsync({ id: 'WRK-1', newStatus: 'DONE' }, { onError }).catch(() => {});
    });

    await waitFor(() => {
      expect(onError).toHaveBeenCalled();
      expect(onError.mock.calls[0][0]).toBe(serverErr);
    });
  });
});

// ── onSettled: invalidation ──────────────────────────────────────────────────────────────────────

describe('onSettled: invalidates the query', () => {
  it('invalidates the query after a successful mutation', async () => {
    const { qc, wrapper } = makeWrapper();
    qc.setQueryData(TEST_KEY, [ITEM_A, ITEM_B]);
    const invalidate = vi.spyOn(qc, 'invalidateQueries');

    const mutationFn = vi.fn().mockResolvedValue({ ...ITEM_A, status: 'DONE' });

    const { result } = renderHook(
      () => useOptimisticMutation({ queryKey: TEST_KEY, mutationFn, updater: statusUpdater }),
      { wrapper },
    );

    await act(async () => {
      await result.current.mutateAsync({ id: 'WRK-1', newStatus: 'DONE' });
    });

    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith(expect.objectContaining({ queryKey: TEST_KEY }));
    });
  });

  it('invalidates the query even when the mutation fails', async () => {
    const { qc, wrapper } = makeWrapper();
    qc.setQueryData(TEST_KEY, [ITEM_A]);
    const invalidate = vi.spyOn(qc, 'invalidateQueries');

    const mutationFn = vi.fn().mockRejectedValue(new Error('Server error'));

    const { result } = renderHook(
      () => useOptimisticMutation({ queryKey: TEST_KEY, mutationFn, updater: statusUpdater }),
      { wrapper },
    );

    await act(async () => {
      await result.current.mutateAsync({ id: 'WRK-1', newStatus: 'DONE' }).catch(() => {});
    });

    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith(expect.objectContaining({ queryKey: TEST_KEY }));
    });
  });
});

// ── mutationFn called with variables ────────────────────────────────────────────────────────────

describe('on success: mutationFn is called with the supplied variables', () => {
  it('passes the mutation variables directly to mutationFn', async () => {
    const { qc, wrapper } = makeWrapper();
    qc.setQueryData(TEST_KEY, [ITEM_A]);

    const serverResult = { ...ITEM_A, status: 'DONE' };
    const mutationFn   = vi.fn().mockResolvedValue(serverResult);

    const { result } = renderHook(
      () => useOptimisticMutation({ queryKey: TEST_KEY, mutationFn, updater: statusUpdater }),
      { wrapper },
    );

    const vars = { id: 'WRK-1', newStatus: 'DONE' };

    await act(async () => {
      await result.current.mutateAsync(vars);
    });

    await waitFor(() => {
      // TanStack Query v5 passes a second context argument to mutationFn; assert only on the
      // first arg (the caller's variables) to stay version-stable.
      expect(mutationFn).toHaveBeenCalled();
      expect(mutationFn.mock.calls[0][0]).toEqual(vars);
    });
  });
});
