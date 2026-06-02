import { describe, it, expect } from 'vitest';
import {
  WIDGET_CATALOG, WIDGET_CATEGORIES, widgetSpec,
  applyFilter, groupBy, computeWidget,
} from './dashboard-widgets';

const items = [
  { id: '1', status: 'Done',        priority: 'HIGH',     type: 'Bug',  assigneeId: 'u1', dueDate: '2026-01-01', createdAt: '2026-05-01' },
  { id: '2', status: 'In Progress', priority: 'CRITICAL', type: 'Story', assigneeId: 'u1', dueDate: '2026-01-01', createdAt: '2026-05-10' },
  { id: '3', status: 'To Do',       priority: 'LOW',      type: 'Task', assigneeId: 'u2', createdAt: '2026-05-20' },
  { id: '4', status: 'Blocked',     priority: 'MEDIUM',   type: 'Bug',  assigneeId: null, createdAt: '2026-05-15' },
];
const ctx = { workItems: items, currentUserId: 'u1', today: '2026-06-01', users: [{ id: 'u1', fullName: 'Asha' }] };

describe('catalog', () => {
  it('ships 20+ widget presets across the documented categories', () => {
    expect(Object.keys(WIDGET_CATALOG).length).toBeGreaterThanOrEqual(20);
    Object.values(WIDGET_CATALOG).forEach(w => {
      expect(WIDGET_CATEGORIES).toContain(w.category);
      expect(w.engine).toBeTruthy();
    });
  });

  it('widgetSpec falls back for unknown and maps legacy types', () => {
    expect(widgetSpec('NOPE').engine).toBe('count');
    expect(widgetSpec('ITEM_LIST').engine).toBe('list');
  });
});

describe('applyFilter', () => {
  it('open excludes Done', () => {
    expect(applyFilter(items, { open: true }, ctx).map(i => i.id)).toEqual(['2', '3', '4']);
  });
  it('mine matches current user', () => {
    expect(applyFilter(items, { mine: true }, ctx).map(i => i.id)).toEqual(['1', '2']);
  });
  it('highPriority matches HIGH/CRITICAL', () => {
    expect(applyFilter(items, { highPriority: true }, ctx).map(i => i.id)).toEqual(['1', '2']);
  });
  it('overdue: past due date and not Done', () => {
    // item 1 is past-due but Done → excluded; item 2 is past-due + open → included
    expect(applyFilter(items, { overdue: true }, ctx).map(i => i.id)).toEqual(['2']);
  });
  it('blocked matches Blocked status', () => {
    expect(applyFilter(items, { blocked: true }, ctx).map(i => i.id)).toEqual(['4']);
  });
});

describe('groupBy', () => {
  it('counts by field, sorted desc', () => {
    expect(groupBy(items, 'type', ctx)).toEqual([
      { label: 'Bug', value: 2 },
      { label: 'Story', value: 1 },
      { label: 'Task', value: 1 },
    ]);
  });
  it('resolves assignee names and labels unassigned', () => {
    const s = groupBy(items, 'assignee', ctx);
    expect(s.find(x => x.label === 'Asha').value).toBe(2);
    expect(s.find(x => x.label === 'Unassigned').value).toBe(1);
  });
});

describe('computeWidget', () => {
  it('count engine returns a number with tone', () => {
    const r = computeWidget({ widgetType: 'OVERDUE_ITEMS', config: '{}' }, ctx);
    expect(r).toMatchObject({ kind: 'number', value: 1, tone: 'danger' });
  });
  it('groupBy bar returns bars series', () => {
    const r = computeWidget({ widgetType: 'STATUS_BAR', config: '{}' }, ctx);
    expect(r.kind).toBe('bars');
    expect(r.series.reduce((a, b) => a + b.value, 0)).toBe(4);
  });
  it('pie chart maps to pie kind', () => {
    expect(computeWidget({ widgetType: 'TYPE_PIE', config: '{}' }, ctx).kind).toBe('pie');
  });
  it('list engine honours limit and recent sort', () => {
    const r = computeWidget({ widgetType: 'RECENT_ITEMS', config: '{"limit":2}' }, ctx);
    expect(r.kind).toBe('list');
    expect(r.items).toHaveLength(2);
    expect(r.items[0].id).toBe('3'); // newest createdAt
  });
  it('stored config overrides preset (filter by type)', () => {
    const r = computeWidget({ widgetType: 'TOTAL_ITEMS', config: '{"filter":{"type":"Bug"}}' }, ctx);
    expect(r.value).toBe(2);
  });
  it('sprintProgress burndown computes remaining', () => {
    const c = { ...ctx, sprints: [{ status: 'ACTIVE', totalPoints: 20, donePoints: 8 }] };
    const r = computeWidget({ widgetType: 'BURNDOWN', config: '{}' }, c);
    expect(r).toMatchObject({ kind: 'progress', value: 12, max: 20 });
  });
  it('trend engine maps velocity points', () => {
    const c = { ...ctx, velocity: [{ name: 'S1', donePoints: 10 }, { name: 'S2', done_points: 14 }] };
    const r = computeWidget({ widgetType: 'VELOCITY_LINE', config: '{}' }, c);
    expect(r.kind).toBe('line');
    expect(r.points).toEqual([{ label: 'S1', value: 10 }, { label: 'S2', value: 14 }]);
  });
  it('matrix engine builds status × priority grid', () => {
    const r = computeWidget({ widgetType: 'STATUS_PRIORITY_MATRIX', config: '{}' }, ctx);
    expect(r.kind).toBe('matrix');
    expect(r.cols).toEqual(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']);
    expect(r.rows.reduce((a, row) => a + row.total, 0)).toBe(4);
  });
});
