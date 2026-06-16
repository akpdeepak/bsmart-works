import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDensity } from './use-density';
import { DENSITY_STORAGE_KEY } from '@/lib/density';

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
  // Reset the data attribute between tests
  delete document.documentElement.dataset.density;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useDensity', () => {
  it('defaults to "comfortable" when localStorage is empty', () => {
    const { result } = renderHook(() => useDensity());
    expect(result.current.density).toBe('comfortable');
  });

  it('reads a valid stored level from localStorage', () => {
    localStorageMock.setItem(DENSITY_STORAGE_KEY, 'compact');
    const { result } = renderHook(() => useDensity());
    expect(result.current.density).toBe('compact');
  });

  it('falls back to "comfortable" for an invalid stored value', () => {
    localStorageMock.setItem(DENSITY_STORAGE_KEY, 'ultra-dense');
    const { result } = renderHook(() => useDensity());
    expect(result.current.density).toBe('comfortable');
  });

  it('setDensity updates the density state', () => {
    const { result } = renderHook(() => useDensity());
    act(() => { result.current.setDensity('spacious'); });
    expect(result.current.density).toBe('spacious');
  });

  it('setDensity with an invalid level is a no-op', () => {
    const { result } = renderHook(() => useDensity());
    act(() => { result.current.setDensity('enormous'); });
    expect(result.current.density).toBe('comfortable');
  });

  it('persists the density to localStorage on change', () => {
    const { result } = renderHook(() => useDensity());
    act(() => { result.current.setDensity('compact'); });
    expect(localStorageMock.getItem(DENSITY_STORAGE_KEY)).toBe('compact');
  });

  it('sets document.documentElement.dataset.density on change', () => {
    const { result } = renderHook(() => useDensity());
    act(() => { result.current.setDensity('spacious'); });
    expect(document.documentElement.dataset.density).toBe('spacious');
  });

  it('sets document.documentElement.dataset.density on initial render', () => {
    renderHook(() => useDensity());
    expect(document.documentElement.dataset.density).toBe('comfortable');
  });
});
