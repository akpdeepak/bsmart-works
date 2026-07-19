import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useShellNavigation } from './useShellNavigation';

describe('useShellNavigation', () => {
  afterEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('initializes from and writes to the canonical route map', () => {
    window.history.replaceState({}, '', '/board');
    const setSelectedItem = vi.fn();
    const { result } = renderHook(() => useShellNavigation({ selectedItem: null, setSelectedItem }));

    expect(result.current.view).toBe('board');
    act(() => result.current.setView('dashboard'));
    expect(window.location.pathname).toBe('/');
  });

  it('opens an entity route on browser navigation', () => {
    const setSelectedItem = vi.fn();
    renderHook(() => useShellNavigation({ selectedItem: null, setSelectedItem }));

    window.history.replaceState({}, '', '/items/WRK-42');
    act(() => window.dispatchEvent(new PopStateEvent('popstate')));

    expect(setSelectedItem).toHaveBeenCalledWith(expect.any(Function));
    expect(setSelectedItem.mock.calls.at(-1)[0](null)).toEqual({ id: 'WRK-42' });
  });

  it('preserves an initial entity deep link until the shell resolves it', () => {
    window.history.replaceState({}, '', '/items/WRK-42');
    const setSelectedItem = vi.fn();
    const { result } = renderHook(() => useShellNavigation({ selectedItem: null, setSelectedItem }));

    expect(result.current.view).toBe('dashboard');
    expect(window.location.pathname).toBe('/items/WRK-42');
  });
});
