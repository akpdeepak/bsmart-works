import { describe, it, expect } from 'vitest';
import { nextSortModel, sortPriority, sortDirOf, moveColumn } from './data-table-sort';

describe('nextSortModel', () => {
  it('cycles asc, desc, cleared in single-column mode', () => {
    expect(nextSortModel([], 'a', false)).toEqual([{ key: 'a', dir: 'asc' }]);
    expect(nextSortModel([{ key: 'a', dir: 'asc' }], 'a', false)).toEqual([{ key: 'a', dir: 'desc' }]);
    expect(nextSortModel([{ key: 'a', dir: 'desc' }], 'a', false)).toEqual([]);
    expect(nextSortModel([{ key: 'a', dir: 'asc' }], 'b', false)).toEqual([{ key: 'b', dir: 'asc' }]);
  });

  it('appends, toggles, then removes in additive mode', () => {
    const first = nextSortModel([{ key: 'a', dir: 'asc' }], 'b', true);
    expect(first).toEqual([{ key: 'a', dir: 'asc' }, { key: 'b', dir: 'asc' }]);
    const second = nextSortModel(first, 'b', true);
    expect(second).toEqual([{ key: 'a', dir: 'asc' }, { key: 'b', dir: 'desc' }]);
    expect(nextSortModel(second, 'b', true)).toEqual([{ key: 'a', dir: 'asc' }]);
  });
});

describe('sort model helpers', () => {
  const model = [{ key: 'a', dir: 'asc' }, { key: 'b', dir: 'desc' }];

  it('reports priority and direction', () => {
    expect(sortPriority(model, 'a')).toBe(1);
    expect(sortPriority(model, 'b')).toBe(2);
    expect(sortPriority(model, 'c')).toBe(0);
    expect(sortDirOf(model, 'b')).toBe('desc');
    expect(sortDirOf(model, 'c')).toBeNull();
  });

  it('moves a column key one slot with clamped ends', () => {
    expect(moveColumn(['a', 'b', 'c'], 'b', -1)).toEqual(['b', 'a', 'c']);
    expect(moveColumn(['a', 'b', 'c'], 'b', 1)).toEqual(['a', 'c', 'b']);
    expect(moveColumn(['a', 'b', 'c'], 'a', -1)).toEqual(['a', 'b', 'c']);
    expect(moveColumn(['a', 'b', 'c'], 'c', 1)).toEqual(['a', 'b', 'c']);
  });
});
