import { describe, it, expect } from 'vitest';
import { moveIndex } from './reorder';

describe('moveIndex', () => {
  it('swaps an item with its neighbour', () => {
    expect(moveIndex(['a', 'b', 'c'], 1, -1)).toEqual(['b', 'a', 'c']);
    expect(moveIndex(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'c', 'b']);
  });

  it('clamps at the ends (no change)', () => {
    expect(moveIndex(['a', 'b', 'c'], 0, -1)).toEqual(['a', 'b', 'c']);
    expect(moveIndex(['a', 'b', 'c'], 2, 1)).toEqual(['a', 'b', 'c']);
  });

  it('is a no-op for out-of-range indices', () => {
    expect(moveIndex(['a'], 5, -1)).toEqual(['a']);
  });
});
