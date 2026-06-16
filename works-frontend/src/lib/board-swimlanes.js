// Pure, framework-free swimlane grouping for the Board (WI-31). The board's columns are the status
// axis; swimlanes add an orthogonal group-by axis (assignee / type / priority / parent) so one
// dataset can be viewed many ways — "one dataset, many views" (Jira/Asana/Notion). Kept pure so it
// is trivially unit-testable and shared, not reinvented per surface (RB-20 §3).

import { UNASSIGNED } from '@/lib/work-item-filter';

// The sentinel lane key for items with no value on the grouping dimension (no assignee, no parent).
export const NO_GROUP = '__none__';

// Group-by dimensions offered in the board control. 'none' is the flat (columns-only) default.
export const GROUP_BY_OPTIONS = ['none', 'assignee', 'type', 'priority', 'parent'];

// Priority order for the priority grouping — most urgent lane first.
const PRIORITY_RANK = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

// Resolve an item's raw group key for a given dimension. Returns NO_GROUP for an absent value.
function keyOf(item, groupBy) {
  switch (groupBy) {
    case 'assignee': return item.assigneeId || UNASSIGNED;
    case 'type':     return item.type || NO_GROUP;
    case 'priority': return item.priority || NO_GROUP;
    case 'parent':   return item.parentId || NO_GROUP;
    default:         return NO_GROUP;
  }
}

// Order comparator for lanes of a given dimension. Empty/none bucket always sorts last; priority
// uses urgency rank; everything else is alphabetical by label (locale-aware via the caller's labels).
function laneComparator(groupBy) {
  return (a, b) => {
    const aEmpty = a.key === NO_GROUP || a.key === UNASSIGNED;
    const bEmpty = b.key === NO_GROUP || b.key === UNASSIGNED;
    if (aEmpty !== bEmpty) return aEmpty ? 1 : -1; // empty bucket last
    if (groupBy === 'priority') {
      return (PRIORITY_RANK[a.key] ?? 99) - (PRIORITY_RANK[b.key] ?? 99);
    }
    return String(a.label).localeCompare(String(b.label));
  };
}

/**
 * Group items into ordered swimlanes for the given dimension.
 *
 * @param {Array} items     the already-filtered visible items
 * @param {string} groupBy  one of GROUP_BY_OPTIONS
 * @param {object} resolvers label resolvers: { userName(id), parentTitle(id), emptyLabel }
 * @returns {Array<{ key, label, items }>} ordered lanes; [] when groupBy is 'none'
 */
export function groupItemsIntoLanes(items = [], groupBy = 'none', resolvers = {}) {
  if (groupBy === 'none' || !GROUP_BY_OPTIONS.includes(groupBy)) return [];
  const { userName = (id) => id, parentTitle = (id) => id, emptyLabel = '—' } = resolvers;

  const lanes = new Map();
  for (const item of items) {
    const key = keyOf(item, groupBy);
    if (!lanes.has(key)) lanes.set(key, []);
    lanes.get(key).push(item);
  }

  const labelFor = (key) => {
    if (key === NO_GROUP || key === UNASSIGNED) return emptyLabel;
    if (groupBy === 'assignee') return userName(key) || key;
    if (groupBy === 'parent')   return parentTitle(key) || key;
    return key; // type / priority are their own labels
  };

  return [...lanes.entries()]
    .map(([key, laneItems]) => ({ key, label: labelFor(key), items: laneItems }))
    .sort(laneComparator(groupBy));
}
