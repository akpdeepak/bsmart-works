import { describe, it, expect } from 'vitest';
import { padRows, fileKind } from '@/lib/block-kit';

describe('padRows', () => {
  it('pads ragged rows to the column width', () => {
    expect(padRows([['1', '2', '3'], ['4']], 3)).toEqual([['1', '2', '3'], ['4', '', '']]);
  });

  it('infers width from the first row when cols is absent', () => {
    expect(padRows([['a', 'b'], ['c']])).toEqual([['a', 'b'], ['c', '']]);
  });

  it('tolerates non-array input', () => {
    expect(padRows(null, 2)).toEqual([]);
    expect(padRows([null], 2)).toEqual([['', '']]);
  });
});

describe('fileKind', () => {
  it('classifies by extension and strips query/hash', () => {
    expect(fileKind('q3.pdf')).toBe('pdf');
    expect(fileKind('https://x/img.PNG?v=2')).toBe('image');
    expect(fileKind('data.xlsx#sheet1')).toBe('sheet');
    expect(fileKind('archive.zip')).toBe('archive');
    expect(fileKind('https://example.com/page')).toBe('link');
    expect(fileKind('')).toBe('link');
  });
});
