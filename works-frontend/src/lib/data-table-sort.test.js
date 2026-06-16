import { describe, it, expect } from 'vitest';
import { nextSortModel, sortPriority, sortDirOf, moveColumn } from './data-table-sort';

describe('nextSortModel', () => {
  it('single mode: cycles asc → desc → cleared and replaces other sorts', () => {
    expect(nextSortModel([], 'a', false)).toEqual([{ key: 'a', dir: 'asc' }]);
    expect(nextSortModel([{ key: 'a', dir: 'asc' }], 'a', false)).toEqual([{ key: 'a', dir: 'desc' }]);
    expect(nextSortModel([{ key: 'a', dir: 'desc' }], 'a', false)).toEqual([]);
    // clicking a different column replaces
    expect(nextSortModel([{ key: 'a', dir: 'asc' }], 'b', false)).toEqual([{ key: 'b', dir: 'asc' }]);
  });

  it('additive mode: appends, toggles, then removes while preserving others', () => {
    const m1 = nextSortModel([{ key: 'a', dir: 'asc' }], 'b', true);
    expect(m1).toEqual([{ key: 'a', dir: 'asc' }, { key: 'b', dir: 'asc' }]);
    const m2 = nextSortModel(m1, 'b', true);
    expect(m2).toEqual([{ key: 'a', dir: 'asc' }, { key: 'b', dir: 'desc' }]);
    const m3 = nextSortModel(m2, 'b', true);
    expect(m3).toEqual([{ key: 'a', dir: 'asc' }]);
  });
});

describe('sortPriority / sortDirOf', () => {
  const model = [{ key: 'a', dir: 'asc' }, { key: 'b', dir: 'desc' }];
  it('reports 1-based priority and 0 when absent', () => {
    expect(sortPriority(model, 'a')).toBe(1);
    expect(sortPriority(model, 'b')).toBe(2);
    expect(sortPriority(model, 'c')).toBe(0);
  });
  it('reports direction or null', () => {
    expect(sortDirOf(model, 'b')).toBe('desc');
    expect(sortDirOf(model, 'c')).toBeNull();
  });
});

describe('moveColumn', () => {
  it('swaps a key with its neighbour and clamps at the ends', () => {
    expect(moveColumn(['a', 'b', 'c'], 'b', -1)).toEqual(['b', 'a', 'c']);
    expect(moveColumn(['a', 'b', 'c'], 'b', 1)).toEqual(['a', 'c', 'b']);
    expect(moveColumn(['a', 'b', 'c'], 'a', -1)).toEqual(['a', 'b', 'c']); // clamp
    expect(moveColumn(['a', 'b', 'c'], 'c', 1)).toEqual(['a', 'b', 'c']); // clamp
  });
});
