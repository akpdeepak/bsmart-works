import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/apiClient';
import { reportError } from '@/lib/report-error';
import { useWorkItemSelection } from './useWorkItemSelection';

vi.mock('@/lib/apiClient', () => ({ api: { send: vi.fn() } }));
vi.mock('@/lib/report-error', () => ({ reportError: vi.fn() }));

describe('useWorkItemSelection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hydrates an ID-only selection from the authoritative detail endpoint', async () => {
    const fullItem = {
      id: 'WRK/42',
      title: 'Hydrated title',
      description: 'Complete ticket details',
      priority: 'HIGH',
    };
    api.send.mockResolvedValue(fullItem);
    const { result } = renderHook(() => useWorkItemSelection());

    await act(async () => {
      await result.current.openWorkItemById('WRK/42');
    });

    expect(api.send).toHaveBeenCalledWith('/work-items/WRK%2F42');
    expect(result.current.selectedItem).toEqual(fullItem);
  });

  it('closes partial or stale details and reports a failed detail request', async () => {
    const failure = new Error('Not found');
    api.send.mockRejectedValue(failure);
    const { result } = renderHook(() => useWorkItemSelection());

    act(() => {
      result.current.setSelectedItem({ id: 'WRK-OLD', title: 'Stale', description: 'Old details' });
    });
    await act(async () => {
      await result.current.openWorkItemById('WRK-MISSING');
    });

    expect(result.current.selectedItem).toBeNull();
    expect(reportError).toHaveBeenCalledWith(failure);
  });

  it('does not refetch an already-complete selected item', async () => {
    const fullItem = { id: 'WRK-42', title: 'Complete', description: null };
    const { result } = renderHook(() => useWorkItemSelection());

    act(() => {
      result.current.setSelectedItem(fullItem);
    });
    let returned;
    await act(async () => {
      returned = await result.current.openWorkItemById('WRK-42');
    });

    expect(returned).toBe(fullItem);
    expect(api.send).not.toHaveBeenCalled();
    expect(result.current.selectedItem).toBe(fullItem);
  });
});
