// Resolves per-type status metadata from the workspace status configuration
// (GET /api/v1/status-config → [{ typeKey, workflowId, statuses: [...] }]).
//
// The work item only stores its status *name* (a string), so every surface that needs the
// category, color, or lapse thresholds of a status looks it up here by (type, statusName).
// Unknown / legacy status values degrade gracefully to the hardcoded category map.

import { statusToCategory as legacyStatusToCategory } from '@/components/works/status';

// Backend category (TODO|IN_PROGRESS|DONE) → frontend badge category (todo|in_progress|done).
const CAT = { TODO: 'todo', IN_PROGRESS: 'in_progress', DONE: 'done' };

/** Normalize any category-ish value to one of the three board categories. */
function normalizeCategory(c) {
  if (c === 'blocked') return 'in_progress'; // legacy "Blocked" lives under In Progress
  return c === 'todo' || c === 'in_progress' || c === 'done' ? c : 'todo';
}

/**
 * Build a resolver over the status config array. Returns a stable object of lookup helpers.
 * Pass the raw array from /status-config; an empty/missing array yields a resolver that always
 * falls back to the legacy category map (so the app works before the config has loaded).
 */
export function buildStatusResolver(statusConfig) {
  const byType = new Map();
  (Array.isArray(statusConfig) ? statusConfig : []).forEach((cfg) => {
    const byName = new Map();
    (cfg.statuses || []).forEach((s) => byName.set(String(s.name || '').toLowerCase(), s));
    byType.set(cfg.typeKey, { workflowId: cfg.workflowId, statuses: cfg.statuses || [], byName });
  });

  const entry = (typeKey) => byType.get(typeKey) || null;

  return {
    hasConfig: byType.size > 0,

    /** Ordered status list for a type (empty if the type has no workflow yet). */
    statusesForType(typeKey) { return entry(typeKey)?.statuses ?? []; },

    /** Full status object for (type, name), or null if unknown. */
    metaFor(typeKey, statusName) {
      if (!statusName) return null;
      return entry(typeKey)?.byName.get(String(statusName).toLowerCase()) ?? null;
    },

    /** Board category ('todo'|'in_progress'|'done') for (type, name); legacy-safe. */
    categoryOf(typeKey, statusName) {
      const m = this.metaFor(typeKey, statusName);
      if (m) return normalizeCategory(CAT[m.category]);
      return normalizeCategory(legacyStatusToCategory(statusName));
    },

    /** Hex color for (type, name), or null. */
    colorOf(typeKey, statusName) { return this.metaFor(typeKey, statusName)?.color ?? null; },

    /** First status (by position) of a category for a type — the drop target on the board. */
    firstStatusOfCategory(typeKey, boardCategory) {
      const target = normalizeCategory(boardCategory);
      const match = (entry(typeKey)?.statuses ?? []).find((s) => normalizeCategory(CAT[s.category]) === target);
      return match?.name ?? null;
    },
  };
}

// The three board categories, in order — shared by the board and sprint board.
export const BOARD_CATEGORIES = [
  { key: 'todo',        label: 'To Do',       dot: 'bg-neutral-400' },
  { key: 'in_progress', label: 'In Progress', dot: 'bg-brand-navy-tint' },
  { key: 'done',        label: 'Done',        dot: 'bg-semantic-success' },
];
