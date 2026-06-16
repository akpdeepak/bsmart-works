// Unit tests for the computeMatches find helper (KR-006 · P1).
import { describe, it, expect } from 'vitest';
import { computeMatches } from './find-replace';

describe('computeMatches (KR-006)', () => {
  it('returns [] for empty query', () => {
    expect(computeMatches('', [{ id: 'b1', content: 'hello' }])).toEqual([]);
  });

  it('returns [] for null/undefined query', () => {
    expect(computeMatches(null, [{ id: 'b1', content: 'hello' }])).toEqual([]);
  });

  it('matches case-insensitively', () => {
    const blocks = [{ id: 'b1', content: 'Hello World' }];
    const m = computeMatches('hello', blocks);
    expect(m).toHaveLength(1);
    expect(m[0]).toMatchObject({ blockIndex: 0, start: 0, end: 5 });
  });

  it('finds multiple matches in the same block', () => {
    const blocks = [{ id: 'b1', content: 'cat cat cat' }];
    expect(computeMatches('cat', blocks)).toHaveLength(3);
  });

  it('finds matches across multiple blocks', () => {
    const blocks = [
      { id: 'b1', content: 'hello world' },
      { id: 'b2', content: 'no match' },
      { id: 'b3', content: 'hello again' },
    ];
    const m = computeMatches('hello', blocks);
    expect(m).toHaveLength(2);
    expect(m[0].blockIndex).toBe(0);
    expect(m[1].blockIndex).toBe(2);
  });

  it('returns [] when query is not found', () => {
    const blocks = [{ id: 'b1', content: 'foo bar' }];
    expect(computeMatches('xyz', blocks)).toHaveLength(0);
  });

  it('skips blocks with no content', () => {
    const blocks = [
      { id: 'b1', content: '' },
      { id: 'b2' },
      { id: 'b3', content: 'hello' },
    ];
    expect(computeMatches('hello', blocks)).toHaveLength(1);
  });
});
