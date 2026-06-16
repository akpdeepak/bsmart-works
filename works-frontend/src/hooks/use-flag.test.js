import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFlag } from './use-flag';

// Stub localStorage with a simple in-memory map so tests run in isolation.
const store = {};
const localStorageMock = {
  getItem: (key) => (Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null),
  setItem: (key, value) => { store[key] = String(value); },
  removeItem: (key) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
};

beforeEach(() => {
  vi.stubGlobal('localStorage', localStorageMock);
  localStorageMock.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useFlag', () => {
  it('returns false (the FLAGS default) when localStorage is empty', () => {
    const { result } = renderHook(() => useFlag('onboarding_wizard'));
    expect(result.current).toBe(false);
  });

  it('returns true when localStorage has an override of "true"', () => {
    localStorageMock.setItem('flag:onboarding_wizard', 'true');
    const { result } = renderHook(() => useFlag('onboarding_wizard'));
    expect(result.current).toBe(true);
  });

  it('returns false for an unknown flag key', () => {
    const { result } = renderHook(() => useFlag('not_a_real_flag'));
    expect(result.current).toBe(false);
  });

  it('updates live when a storage event fires for the matching key', () => {
    const { result } = renderHook(() => useFlag('inline_quick_add'));
    expect(result.current).toBe(false);

    act(() => {
      localStorageMock.setItem('flag:inline_quick_add', 'true');
      window.dispatchEvent(
        new StorageEvent('storage', { key: 'flag:inline_quick_add', newValue: 'true' })
      );
    });

    expect(result.current).toBe(true);
  });

  it('ignores storage events for a different flag key', () => {
    const { result } = renderHook(() => useFlag('keyboard_shortcuts'));
    expect(result.current).toBe(false);

    act(() => {
      localStorageMock.setItem('flag:optimistic_ui', 'true');
      window.dispatchEvent(
        new StorageEvent('storage', { key: 'flag:optimistic_ui', newValue: 'true' })
      );
    });

    // keyboard_shortcuts was not changed
    expect(result.current).toBe(false);
  });
});
