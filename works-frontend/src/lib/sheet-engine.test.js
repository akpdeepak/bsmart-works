import { describe, it, expect } from 'vitest';
import {
  colToIndex, indexToCol, parseRef, evaluateSheet, evaluateRef,
} from '@/lib/sheet-engine';

describe('sheet-engine cell references', () => {
  it('maps column letters to indices and back', () => {
    expect(colToIndex('A')).toBe(0);
    expect(colToIndex('Z')).toBe(25);
    expect(colToIndex('AA')).toBe(26);
    expect(colToIndex('ab')).toBe(27);
    expect(indexToCol(0)).toBe('A');
    expect(indexToCol(25)).toBe('Z');
    expect(indexToCol(26)).toBe('AA');
    expect(indexToCol(27)).toBe('AB');
  });

  it('parses A1-style references (zero-based)', () => {
    expect(parseRef('A1')).toEqual({ col: 0, row: 0 });
    expect(parseRef('B3')).toEqual({ col: 1, row: 2 });
    expect(parseRef(' C10 ')).toEqual({ col: 2, row: 9 });
    expect(parseRef('not-a-ref')).toBeNull();
  });
});

describe('evaluateSheet — literals pass through', () => {
  it('keeps text and numbers unchanged', () => {
    const grid = [['Item', 'Qty'], ['Apples', '3']];
    expect(evaluateSheet(grid)).toEqual([['Item', 'Qty'], ['Apples', '3']]);
  });

  it('tolerates a non-array input', () => {
    expect(evaluateSheet(null)).toEqual([]);
  });
});

describe('evaluateSheet — arithmetic formulas', () => {
  it('evaluates cell-reference arithmetic', () => {
    const grid = [['2', '3', '=A1+B1'], ['=A1*B1', '=C1-1', '=(A1+B1)*2']];
    const out = evaluateSheet(grid);
    expect(out[0][2]).toBe('5'); // 2 + 3
    expect(out[1][0]).toBe('6'); // 2 * 3
    expect(out[1][1]).toBe('4'); // 5 - 1
    expect(out[1][2]).toBe('10'); // (2 + 3) * 2
  });

  it('honours operator precedence and parentheses', () => {
    const grid = [['=2+3*4', '=(2+3)*4', '=10/4']];
    const out = evaluateSheet(grid);
    expect(out[0][0]).toBe('14');
    expect(out[0][1]).toBe('20');
    expect(out[0][2]).toBe('2.5');
  });

  it('supports unary minus', () => {
    expect(evaluateSheet([['=-5+2']])[0][0]).toBe('-3');
  });
});

describe('evaluateSheet — functions and ranges', () => {
  it('aggregates ranges with SUM / AVG / MIN / MAX / COUNT', () => {
    const grid = [['10'], ['20'], ['30'], ['=SUM(A1:A3)'], ['=AVG(A1:A3)'], ['=MIN(A1:A3)'], ['=MAX(A1:A3)'], ['=COUNT(A1:A3)']];
    const out = evaluateSheet(grid);
    expect(out[3][0]).toBe('60');
    expect(out[4][0]).toBe('20');
    expect(out[5][0]).toBe('10');
    expect(out[6][0]).toBe('30');
    expect(out[7][0]).toBe('3');
  });

  it('supports nested functions and ROUND', () => {
    const grid = [['1'], ['2'], ['=ROUND(AVG(A1:A2),0)'], ['=ROUND(10/3,2)']];
    const out = evaluateSheet(grid);
    expect(out[2][0]).toBe('2'); // round(1.5) → 2
    expect(out[3][0]).toBe('3.33');
  });

  it('treats blank cells in a range as zero', () => {
    const grid = [['5', '', '5', '=SUM(A1:C1)']];
    expect(evaluateSheet(grid)[0][3]).toBe('10');
  });
});

describe('evaluateSheet — error handling', () => {
  it('flags circular references as #CIRC', () => {
    const grid = [['=B1', '=A1']];
    const out = evaluateSheet(grid);
    expect(out[0][0]).toBe('#CIRC');
  });

  it('flags malformed formulas as #ERR', () => {
    const grid = [['=SUM(']];
    expect(evaluateSheet(grid)[0][0]).toBe('#ERR');
  });

  it('flags unknown functions as #ERR', () => {
    expect(evaluateSheet([['=NOPE(1,2)']])[0][0]).toBe('#ERR');
  });
});

describe('evaluateRef', () => {
  it('returns the computed display value for a ref', () => {
    const grid = [['4', '6', '=A1+B1']];
    expect(evaluateRef(grid, 'C1')).toBe('10');
    expect(evaluateRef(grid, 'bad')).toBe('#ERR');
  });
});
