import { describe, it, expect } from 'vitest';
import {
  filterItems, statusBreakdown, statusPriorityMatrix,
  sprintProgress, velocityPoints, EXTRA_WIDGET_PRESETS, EXTRA_WIDGET_CATEGORIES,
} from './dashboard-metrics';

const items = [
  { id: '1', status: 'Done',        priority: 'HIGH',     type: 'Bug',   assigneeId: 'u1', dueDate: '2026-01-01' },
  { id: '2', status: 'In Progress', priority: 'CRITICAL', type: 'Story', assigneeId: 'u1', dueDate: '2026-01-01' },
  { id: '3', status: 'To Do',       priority: 'LOW',      type: 'Task',  assigneeId: 'u2' },
  { id: '4', status: 'Blocked',     priority: 'MEDIUM',   type: 'Bug',   assigneeId: null },
];
const ctx = { currentUserId: 'u1', today: '2026-06-01' };

describe('filterItems', () => {
  it('open excludes Done', () => {
    expect(filterItems(items, { open: true }, ctx).map(i => i.id)).toEqual(['2', '3', '4']);
  });
  it('done keeps only Done', () => {
    expect(filterItems(items, { done: true }, ctx).map(i => i.id)).toEqual(['1']);
  });
  it('mine matches current user', () => {
    expect(filterItems(items, { mine: true }, ctx).map(i => i.id)).toEqual(['1', '2']);
  });
  it('highPriority matches HIGH/CRITICAL', () => {
    expect(filterItems(items, { highPriority: true }, ctx).map(i => i.id)).toEqual(['1', '2']);
  });
  it('blocked matches Blocked status', () => {
    expect(filterItems(items, { blocked: true }, ctx).map(i => i.id)).toEqual(['4']);
  });
  it('overdue: past due and not Done', () => {
    expect(filterItems(items, { overdue: true }, ctx).map(i => i.id)).toEqual(['2']);
  });
  it('unassigned matches items with no assignee', () => {
    expect(filterItems(items, { unassigned: true }, ctx).map(i => i.id)).toEqual(['4']);
  });
  it('dueSoon: due within the next 7 days and not Done', () => {
    const soon = [
      { id: 'a', status: 'To Do', dueDate: '2026-06-03' }, // 2 days out
      { id: 'b', status: 'To Do', dueDate: '2026-07-01' }, // beyond a week
      { id: 'c', status: 'Done',  dueDate: '2026-06-03' }, // soon but done
      { id: 'd', status: 'To Do' },                        // no due date
    ];
    expect(filterItems(soon, { dueSoon: true }, ctx).map(i => i.id)).toEqual(['a']);
  });
  it('empty filter returns all', () => {
    expect(filterItems(items, {}, ctx)).toHaveLength(4);
  });
});

describe('statusBreakdown', () => {
  it('counts by status, sorted desc', () => {
    const s = statusBreakdown(items);
    expect(s.reduce((a, b) => a + b.value, 0)).toBe(4);
    expect(s[0].value).toBeGreaterThanOrEqual(s[s.length - 1].value);
  });
});

describe('statusPriorityMatrix', () => {
  it('builds a status × priority grid with stable columns', () => {
    const m = statusPriorityMatrix(items);
    expect(m.cols).toEqual(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']);
    expect(m.rows.reduce((a, r) => a + r.total, 0)).toBe(4);
    const done = m.rows.find(r => r.label === 'Done');
    expect(done.cells).toEqual([0, 1, 0, 0]); // HIGH
  });
});

describe('sprintProgress', () => {
  const sprints = [{ status: 'ACTIVE', totalPoints: 20, donePoints: 8 }];
  it('health = delivered points', () => {
    expect(sprintProgress(sprints, 'health')).toMatchObject({ value: 8, max: 20, label: 'Delivered' });
  });
  it('burndown = remaining points', () => {
    expect(sprintProgress(sprints, 'burndown')).toMatchObject({ value: 12, max: 20, label: 'Remaining' });
  });
  it('no active sprint → zeroes', () => {
    expect(sprintProgress([], 'health')).toMatchObject({ value: 0, max: 0, sprint: null });
  });
});

describe('velocityPoints', () => {
  it('maps name/donePoints (and snake_case) to points', () => {
    expect(velocityPoints([{ name: 'S1', donePoints: 10 }, { sprintName: 'S2', done_points: 14 }]))
      .toEqual([{ label: 'S1', value: 10 }, { label: 'S2', value: 14 }]);
  });
});

describe('presets', () => {
  it('ships a 20+ widget library (spec S02)', () => {
    expect(EXTRA_WIDGET_PRESETS.length).toBeGreaterThanOrEqual(20);
  });
  it('every preset has a known category and type', () => {
    EXTRA_WIDGET_PRESETS.forEach(p => {
      expect(EXTRA_WIDGET_CATEGORIES).toContain(p.category);
      expect(p.type).toBeTruthy();
      expect(p.title).toBeTruthy();
    });
  });
});
