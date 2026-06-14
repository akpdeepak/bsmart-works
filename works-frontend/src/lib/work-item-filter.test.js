import { describe, it, expect } from 'vitest';
import {
  filterItems, sortItems, buildFilterOptions, countActiveFilters, hasActiveFilters,
  EMPTY_FILTERS, DEFAULT_SORT, UNASSIGNED,
} from './work-item-filter';

const items = [
  { id: 'WI-1', autoId: 'BUG-1', title: 'Fix login', type: 'Bug', priority: 'HIGH', assigneeId: 'u1', status: 'Todo', dueDate: '2026-07-01', createdAt: '2026-06-01', updatedAt: '2026-06-10' },
  { id: 'WI-2', autoId: 'TSK-2', title: 'Write docs', type: 'Task', priority: 'LOW', assigneeId: 'u2', status: 'In Progress', dueDate: '2026-06-20', createdAt: '2026-06-02', updatedAt: '2026-06-05' },
  { id: 'WI-3', autoId: 'BUG-3', title: 'Crash on save', type: 'Bug', priority: 'CRITICAL', assigneeId: null, status: 'Done', dueDate: null, createdAt: '2026-06-03', updatedAt: '2026-06-12' },
];

describe('filterItems', () => {
  it('returns all items for the empty filter', () => {
    expect(filterItems(items, EMPTY_FILTERS)).toHaveLength(3);
  });

  it('matches search across autoId and title (case-insensitive)', () => {
    expect(filterItems(items, { ...EMPTY_FILTERS, search: 'login' }).map(i => i.id)).toEqual(['WI-1']);
    expect(filterItems(items, { ...EMPTY_FILTERS, search: 'bug-3' }).map(i => i.id)).toEqual(['WI-3']);
  });

  it('filters by type, priority, and assignee', () => {
    expect(filterItems(items, { ...EMPTY_FILTERS, types: ['Bug'] }).map(i => i.id)).toEqual(['WI-1', 'WI-3']);
    expect(filterItems(items, { ...EMPTY_FILTERS, priorities: ['LOW'] }).map(i => i.id)).toEqual(['WI-2']);
    expect(filterItems(items, { ...EMPTY_FILTERS, assignees: ['u1'] }).map(i => i.id)).toEqual(['WI-1']);
  });

  it('treats UNASSIGNED as the no-assignee bucket', () => {
    expect(filterItems(items, { ...EMPTY_FILTERS, assignees: [UNASSIGNED] }).map(i => i.id)).toEqual(['WI-3']);
  });

  it('"mine" matches only the current user\'s items', () => {
    expect(filterItems(items, { ...EMPTY_FILTERS, mine: true }, 'u2').map(i => i.id)).toEqual(['WI-2']);
  });

  it('combines filters with AND semantics', () => {
    expect(filterItems(items, { ...EMPTY_FILTERS, types: ['Bug'], priorities: ['CRITICAL'] }).map(i => i.id)).toEqual(['WI-3']);
  });
});

describe('sortItems', () => {
  it('preserves order for field "none"', () => {
    expect(sortItems(items, DEFAULT_SORT).map(i => i.id)).toEqual(['WI-1', 'WI-2', 'WI-3']);
  });

  it('sorts by priority rank (CRITICAL first when asc)', () => {
    expect(sortItems(items, { field: 'priority', dir: 'asc' }).map(i => i.priority)).toEqual(['CRITICAL', 'HIGH', 'LOW']);
  });

  it('sorts by due date with nulls last', () => {
    expect(sortItems(items, { field: 'dueDate', dir: 'asc' }).map(i => i.id)).toEqual(['WI-2', 'WI-1', 'WI-3']);
  });

  it('sorts by title and respects direction', () => {
    expect(sortItems(items, { field: 'title', dir: 'asc' }).map(i => i.title)).toEqual(['Crash on save', 'Fix login', 'Write docs']);
    expect(sortItems(items, { field: 'title', dir: 'desc' }).map(i => i.title)).toEqual(['Write docs', 'Fix login', 'Crash on save']);
  });

  it('does not mutate the input array', () => {
    const input = items.slice();
    sortItems(input, { field: 'priority', dir: 'asc' });
    expect(input.map(i => i.id)).toEqual(['WI-1', 'WI-2', 'WI-3']);
  });
});

describe('buildFilterOptions', () => {
  it('derives distinct assignees (with UNASSIGNED), types, and priority-ordered priorities', () => {
    const opts = buildFilterOptions(items, (id) => (id === 'u1' ? 'Alice' : 'Bob'));
    expect(opts.assignees.map(a => a.id).sort()).toEqual([UNASSIGNED, 'u1', 'u2'].sort());
    expect(opts.assignees.find(a => a.id === 'u1').label).toBe('Alice');
    expect(opts.types.sort()).toEqual(['Bug', 'Task']);
    expect(opts.priorities).toEqual(['CRITICAL', 'HIGH', 'LOW']);
  });
});

describe('countActiveFilters / hasActiveFilters', () => {
  it('counts each active dimension once', () => {
    expect(countActiveFilters(EMPTY_FILTERS)).toBe(0);
    expect(countActiveFilters({ ...EMPTY_FILTERS, mine: true, types: ['Bug'], search: 'x' })).toBe(3);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, priorities: ['LOW'] })).toBe(true);
  });
});
