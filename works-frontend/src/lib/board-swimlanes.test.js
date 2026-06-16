import { describe, it, expect } from 'vitest';
import { groupItemsIntoLanes, GROUP_BY_OPTIONS, NO_GROUP } from './board-swimlanes';
import { UNASSIGNED } from './work-item-filter';

const items = [
  { id: '1', type: 'Bug',   priority: 'HIGH',     assigneeId: 'u1', parentId: 'p1' },
  { id: '2', type: 'Story', priority: 'LOW',      assigneeId: 'u2', parentId: null },
  { id: '3', type: 'Bug',   priority: 'CRITICAL', assigneeId: null, parentId: 'p1' },
];

const resolvers = {
  userName: (id) => ({ u1: 'Alice', u2: 'Bob' }[id] || id),
  parentTitle: (id) => ({ p1: 'Epic One' }[id] || id),
  emptyLabel: 'Unassigned',
};

describe('groupItemsIntoLanes', () => {
  it('returns [] for the flat "none" mode', () => {
    expect(groupItemsIntoLanes(items, 'none', resolvers)).toEqual([]);
  });

  it('returns [] for an unknown dimension', () => {
    expect(groupItemsIntoLanes(items, 'bogus', resolvers)).toEqual([]);
  });

  it('groups by assignee with the empty bucket last and resolved labels', () => {
    const lanes = groupItemsIntoLanes(items, 'assignee', resolvers);
    expect(lanes.map((l) => l.label)).toEqual(['Alice', 'Bob', 'Unassigned']);
    expect(lanes.find((l) => l.key === UNASSIGNED).items).toHaveLength(1);
    expect(lanes.find((l) => l.label === 'Alice').items.map((i) => i.id)).toEqual(['1']);
  });

  it('groups by type alphabetically', () => {
    const lanes = groupItemsIntoLanes(items, 'type', resolvers);
    expect(lanes.map((l) => l.label)).toEqual(['Bug', 'Story']);
    expect(lanes[0].items).toHaveLength(2);
  });

  it('orders priority lanes by urgency, not alphabetically', () => {
    const lanes = groupItemsIntoLanes(items, 'priority', resolvers);
    expect(lanes.map((l) => l.label)).toEqual(['CRITICAL', 'HIGH', 'LOW']);
  });

  it('groups by parent, resolving titles and bucketing the parentless last', () => {
    const lanes = groupItemsIntoLanes(items, 'parent', resolvers);
    expect(lanes[0].label).toBe('Epic One');
    expect(lanes[0].items).toHaveLength(2);
    expect(lanes[lanes.length - 1].key).toBe(NO_GROUP);
  });

  it('exposes the expected option set', () => {
    expect(GROUP_BY_OPTIONS).toEqual(['none', 'assignee', 'type', 'priority', 'parent']);
  });
});
