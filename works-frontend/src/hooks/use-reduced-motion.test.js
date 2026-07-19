import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useReducedMotion } from './use-reduced-motion';

describe('useReducedMotion', () => {
  let listeners;
  let matches;

  beforeEach(() => {
    listeners = [];
    matches = false;
    window.matchMedia = (query) => ({
      matches,
      media: query,
      addEventListener: (_event, handler) => listeners.push(handler),
      removeEventListener: (_event, handler) => {
        listeners = listeners.filter((h) => h !== handler);
      },
    });
  });

  afterEach(() => {
    listeners = [];
  });

  it('returns false when prefers-reduced-motion is not active', () => {
    matches = false;
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });

  it('returns true when prefers-reduced-motion is active', () => {
    matches = true;
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);
  });

  it('updates when the OS preference changes', () => {
    matches = false;
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);

    // Simulate the user toggling reduced motion on
    act(() => {
      listeners.forEach((h) => h({ matches: true }));
    });
    expect(result.current).toBe(true);
  });

  it('cleans up the event listener on unmount', () => {
    const { unmount } = renderHook(() => useReducedMotion());
    expect(listeners).toHaveLength(1);
    unmount();
    expect(listeners).toHaveLength(0);
  });
});
