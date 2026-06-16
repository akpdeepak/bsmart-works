import { describe, it, expect } from 'vitest';
import { fleschKincaid, gradeLabel } from './readability';

describe('fleschKincaid (KR-013)', () => {
  it('returns 0 for empty text', () => { expect(fleschKincaid('')).toBe(0); });
  it('returns 0 for whitespace-only text', () => { expect(fleschKincaid('   ')).toBe(0); });
  it('returns low grade for very simple text', () => {
    expect(fleschKincaid('The cat sat.')).toBeLessThan(4);
  });
  it('returns a non-zero grade for multi-sentence text', () => {
    const text = 'The quick brown fox jumps over the lazy dog. She sells sea shells by the sea shore.';
    expect(fleschKincaid(text)).toBeGreaterThan(0);
  });
  it('gradeLabel labels correctly', () => {
    expect(gradeLabel(5)).toContain('Very easy');
    expect(gradeLabel(7)).toContain('Easy');
    expect(gradeLabel(10)).toContain('Standard');
    expect(gradeLabel(14)).toContain('Difficult');
  });
});
