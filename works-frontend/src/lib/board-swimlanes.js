import { UNASSIGNED } from '@/lib/work-item-filter';

export const NO_GROUP = '__none__';
export const GROUP_BY_OPTIONS = ['none', 'assignee', 'type', 'priority', 'parent'];

const PRIORITY_RANK = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

function keyOf(item, groupBy) {
  switch (groupBy) {
    case 'assignee': return item.assigneeId || UNASSIGNED;
    case 'type': return item.type || NO_GROUP;
    case 'priority': return item.priority || NO_GROUP;
    case 'parent': return item.parentId || NO_GROUP;
    default: return NO_GROUP;
  }
}

function laneComparator(groupBy) {
  return (a, b) => {
    const aEmpty = a.key === NO_GROUP || a.key === UNASSIGNED;
    const bEmpty = b.key === NO_GROUP || b.key === UNASSIGNED;
    if (aEmpty !== bEmpty) return aEmpty ? 1 : -1;
    if (groupBy === 'priority') return (PRIORITY_RANK[a.key] ?? 99) - (PRIORITY_RANK[b.key] ?? 99);
    return String(a.label).localeCompare(String(b.label));
  };
}

export function groupItemsIntoLanes(items = [], groupBy = 'none', resolvers = {}) {
  if (groupBy === 'none' || !GROUP_BY_OPTIONS.includes(groupBy)) return [];
  const { userName = (id) => id, parentTitle = (id) => id, emptyLabel = '-' } = resolvers;

  const lanes = new Map();
  for (const item of items) {
    const key = keyOf(item, groupBy);
    if (!lanes.has(key)) lanes.set(key, []);
    lanes.get(key).push(item);
  }

  const labelFor = (key) => {
    if (key === NO_GROUP || key === UNASSIGNED) return emptyLabel;
    if (groupBy === 'assignee') return userName(key) || key;
    if (groupBy === 'parent') return parentTitle(key) || key;
    return key;
  };

  return [...lanes.entries()]
    .map(([key, laneItems]) => ({ key, label: labelFor(key), items: laneItems }))
    .sort(laneComparator(groupBy));
}
