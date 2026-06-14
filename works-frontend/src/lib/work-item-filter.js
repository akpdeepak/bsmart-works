// Pure, reusable filter + sort helpers for the Deliver surfaces (Board, Backlog, Sprint).
// Kept framework-free so they are trivially unit-testable and shared across views (one filter
// model, not a per-surface reinvention — RB-20 §3, RB-10 §6 spirit).

export const UNASSIGNED = '__unassigned__';

const PRIORITY_RANK = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

// The empty filter state — every surface starts here.
export const EMPTY_FILTERS = Object.freeze({
  search: '',
  assignees: [], // assigneeIds; UNASSIGNED matches items with no assignee
  types: [],
  priorities: [],
  mine: false,
});

export const DEFAULT_SORT = Object.freeze({ field: 'none', dir: 'asc' });

// How many distinct filter groups are active — drives the "Filters (n)" badge and Clear affordance.
export function countActiveFilters(filters = EMPTY_FILTERS) {
  let n = 0;
  if (filters.search && filters.search.trim()) n += 1;
  if (filters.assignees?.length) n += 1;
  if (filters.types?.length) n += 1;
  if (filters.priorities?.length) n += 1;
  if (filters.mine) n += 1;
  return n;
}

export function hasActiveFilters(filters) {
  return countActiveFilters(filters) > 0;
}

// Distinct option lists derived from the items actually on screen, so the controls only ever offer
// values that exist. `userName` resolves an assignee id to a display label.
export function buildFilterOptions(items = [], userName = (id) => id) {
  const assignees = new Map();
  const types = new Set();
  const priorities = new Set();
  for (const it of items) {
    if (it.assigneeId) assignees.set(it.assigneeId, userName(it.assigneeId) || it.assigneeId);
    else assignees.set(UNASSIGNED, null); // label resolved at render so it can be localized
    if (it.type) types.add(it.type);
    if (it.priority) priorities.add(it.priority);
  }
  return {
    assignees: [...assignees.entries()].map(([id, label]) => ({ id, label })),
    types: [...types],
    priorities: [...priorities].sort((a, b) => (PRIORITY_RANK[a] ?? 99) - (PRIORITY_RANK[b] ?? 99)),
  };
}

// Apply the active filters to an item list. Pure — returns a new array.
export function filterItems(items = [], filters = EMPTY_FILTERS, currentUserId = null) {
  const f = filters || EMPTY_FILTERS;
  const q = (f.search || '').trim().toLowerCase();
  const assignees = f.assignees?.length ? new Set(f.assignees) : null;
  const types = f.types?.length ? new Set(f.types) : null;
  const priorities = f.priorities?.length ? new Set(f.priorities) : null;
  return items.filter((it) => {
    if (q) {
      const hay = `${it.autoId || ''} ${it.id || ''} ${it.title || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (f.mine && it.assigneeId !== currentUserId) return false;
    if (assignees && !assignees.has(it.assigneeId || UNASSIGNED)) return false;
    if (types && !types.has(it.type)) return false;
    if (priorities && !priorities.has(it.priority)) return false;
    return true;
  });
}

// Coerce a persisted saved-filter payload into the current filter shape. Accepts both the current
// shape and the legacy sprint quick-filter shape ({type, value}) so existing saved_filters rows keep
// working after the Sprint surface adopts the shared filter model.
export function normalizeSavedFilter(raw) {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_FILTERS };
  const isNewShape = 'assignees' in raw || 'types' in raw || 'priorities' in raw
    || 'search' in raw || ('mine' in raw && !('type' in raw));
  if (isNewShape) {
    return {
      search: raw.search || '',
      assignees: Array.isArray(raw.assignees) ? raw.assignees : [],
      types: Array.isArray(raw.types) ? raw.types : [],
      priorities: Array.isArray(raw.priorities) ? raw.priorities : [],
      mine: !!raw.mine,
    };
  }
  const f = { ...EMPTY_FILTERS };
  switch (raw.type) {
    case 'mine': f.mine = true; break;
    case 'priority': if (raw.value) f.priorities = [raw.value]; break;
    case 'itemType': if (raw.value) f.types = [raw.value]; break;
    case 'blockers': f.priorities = ['CRITICAL']; break; // best-effort map of the old blocker preset
    default: break;
  }
  return f;
}

function cmp(a, b) { return a < b ? -1 : a > b ? 1 : 0; }

// Sort an item list by the chosen field. `field: 'none'` preserves the incoming order (e.g. the
// backlog's manual rank). Pure — returns a new array.
export function sortItems(items = [], sort = DEFAULT_SORT) {
  const field = sort?.field || 'none';
  if (field === 'none') return items.slice();
  const dir = sort?.dir === 'desc' ? -1 : 1;
  const key = (it) => {
    switch (field) {
      case 'priority': return PRIORITY_RANK[it.priority] ?? 99;
      case 'dueDate': return it.dueDate ? new Date(it.dueDate).getTime() : Number.POSITIVE_INFINITY;
      case 'created': return it.createdAt ? new Date(it.createdAt).getTime() : 0;
      case 'updated': return it.updatedAt ? new Date(it.updatedAt).getTime() : 0;
      case 'title': return (it.title || '').toLowerCase();
      default: return 0;
    }
  };
  return items
    .map((it, i) => [it, i])
    .sort(([a, ai], [b, bi]) => {
      const r = cmp(key(a), key(b));
      return (r !== 0 ? r * dir : ai - bi); // stable: fall back to original index
    })
    .map(([it]) => it);
}
