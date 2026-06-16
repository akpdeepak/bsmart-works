import { describe, it, expect } from 'vitest';
import { buildBulkPreview } from './bulk-preview';

const userName = (id) => ({ u1: 'Alice', u2: 'Bob' }[id] || id);
const opts = { userName, unassignedLabel: 'Unassigned', noneLabel: '—' };

const items = [
  { id: 'i1', autoId: 'WI-1', title: 'A', priority: 'LOW', assigneeId: 'u1', tags: ['bug'] },
  { id: 'i2', autoId: 'WI-2', title: 'B', priority: 'HIGH', assigneeId: null, tags: [] },
];

describe('buildBulkPreview', () => {
  it('previews a priority change and counts only the rows that differ', () => {
    const { rows, changing, unchanged } = buildBulkPreview(items, 'priority', 'HIGH', opts);
    expect(rows[0]).toMatchObject({ autoId: 'WI-1', before: 'LOW', after: 'HIGH', willChange: true });
    expect(rows[1]).toMatchObject({ before: 'HIGH', after: 'HIGH', willChange: false });
    expect(changing).toBe(1);
    expect(unchanged).toBe(1);
  });

  it('resolves assignee names and treats empty value as Unassigned', () => {
    const { rows } = buildBulkPreview(items, 'assignee', '', opts);
    expect(rows[0]).toMatchObject({ before: 'Alice', after: 'Unassigned', willChange: true });
    expect(rows[1]).toMatchObject({ before: 'Unassigned', after: 'Unassigned', willChange: false });
  });

  it('previews addLabel — no-op when the tag already exists', () => {
    const { rows, changing } = buildBulkPreview(items, 'addLabel', 'bug', opts);
    expect(rows[0].willChange).toBe(false); // i1 already has 'bug'
    expect(rows[1]).toMatchObject({ before: '—', after: 'bug', willChange: true });
    expect(changing).toBe(1);
  });

  it('previews removeLabel — only items carrying the tag change', () => {
    const { rows, changing } = buildBulkPreview(items, 'removeLabel', 'bug', opts);
    expect(rows[0]).toMatchObject({ before: 'bug', after: '—', willChange: true });
    expect(rows[1].willChange).toBe(false);
    expect(changing).toBe(1);
  });

  it('returns inert rows for an unknown action', () => {
    const { changing } = buildBulkPreview(items, 'bogus', 'x', opts);
    expect(changing).toBe(0);
  });
});
