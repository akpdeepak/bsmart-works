import { describe, it, expect } from 'vitest';
import { detailFieldsFor, orderByPrefs } from './type-detail-fields';

describe('type-detail-fields', () => {
  it('returns descriptors for a known type, empty for types without type-specific fields', () => {
    expect(detailFieldsFor('BUG').length).toBeGreaterThan(0);
    expect(detailFieldsFor('bug').length).toBeGreaterThan(0); // case-insensitive
    expect(detailFieldsFor('EPIC')).toEqual([]);
    expect(detailFieldsFor(null)).toEqual([]);
  });

  it('keeps registry order when there are no prefs', () => {
    const fields = detailFieldsFor('BUG');
    expect(orderByPrefs(fields, new Map())).toEqual(fields);
    expect(orderByPrefs(fields, null)).toEqual(fields);
  });

  it('orders by saved sortOrder; fields without a saved order keep registry order after them', () => {
    const fields = [{ key: 'a' }, { key: 'b' }, { key: 'c' }, { key: 'd' }];
    const prefs = new Map([['c', { sortOrder: 0 }], ['a', { sortOrder: 1 }]]);
    expect(orderByPrefs(fields, prefs).map((f) => f.key)).toEqual(['c', 'a', 'b', 'd']);
  });
});
