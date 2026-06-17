import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useVirtualList } from './use-virtual-list';

// Mock @tanstack/react-virtual so tests run without a DOM scroll container.
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: vi.fn(({ count }) => ({
    getVirtualItems: () =>
      Array.from({ length: count }, (_, i) => ({ index: i, start: i * 48, size: 48 })),
    getTotalSize: () => count * 48,
    measureElement: vi.fn(),
  })),
}));

describe('useVirtualList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns parentRef, virtualRows, and totalSize', () => {
    const { result } = renderHook(() => useVirtualList({ count: 10 }));
    expect(result.current).toHaveProperty('parentRef');
    expect(result.current).toHaveProperty('virtualRows');
    expect(result.current).toHaveProperty('totalSize');
    expect(result.current).toHaveProperty('measureElement');
  });

  it('parentRef is a ref object (has .current)', () => {
    const { result } = renderHook(() => useVirtualList({ count: 5 }));
    expect(result.current.parentRef).toHaveProperty('current');
  });

  it('virtualRows is an array', () => {
    const { result } = renderHook(() => useVirtualList({ count: 5 }));
    expect(Array.isArray(result.current.virtualRows)).toBe(true);
  });

  it('totalSize is a number', () => {
    const { result } = renderHook(() => useVirtualList({ count: 5 }));
    expect(typeof result.current.totalSize).toBe('number');
  });

  it('with count 0: virtualRows is empty and totalSize is 0', () => {
    const { result } = renderHook(() => useVirtualList({ count: 0 }));
    expect(result.current.virtualRows).toHaveLength(0);
    expect(result.current.totalSize).toBe(0);
  });

  it('with count 10: virtualRows has 10 items', () => {
    const { result } = renderHook(() => useVirtualList({ count: 10 }));
    expect(result.current.virtualRows).toHaveLength(10);
  });

  it('with count 10 and default estimateSize 48: totalSize is 480', () => {
    const { result } = renderHook(() => useVirtualList({ count: 10 }));
    expect(result.current.totalSize).toBe(480);
  });
});
