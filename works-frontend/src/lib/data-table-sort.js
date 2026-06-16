// Pure sort-model helpers for the premium DataTable (WI-33). The sort model is an ordered array of
// { key, dir } — the order is the sort priority (primary first). Kept framework-free so the
// header-click → next-model transition is unit-testable in isolation.

/**
 * Compute the next sort model when a sortable header is clicked.
 *
 * Single-column mode (additive=false): the clicked key cycles asc → desc → cleared, replacing any
 * other sort. Multi-column mode (additive=true, e.g. shift-click): the clicked key is appended
 * (asc), toggled (asc → desc), or removed (desc → gone) while the rest of the model is preserved.
 *
 * @param {Array<{key,dir}>} model     the current sort model
 * @param {string}           key       the column key clicked
 * @param {boolean}          additive  true to keep existing sorts (multi-sort)
 * @returns {Array<{key,dir}>} the next model
 */
export function nextSortModel(model = [], key, additive = false) {
  const existing = model.find((s) => s.key === key);
  if (!additive) {
    if (!existing) return [{ key, dir: 'asc' }];
    if (existing.dir === 'asc') return [{ key, dir: 'desc' }];
    return []; // was desc → clear
  }
  if (!existing) return [...model, { key, dir: 'asc' }];
  if (existing.dir === 'asc') return model.map((s) => (s.key === key ? { ...s, dir: 'desc' } : s));
  return model.filter((s) => s.key !== key); // was desc → remove
}

/** The 1-based sort priority of a key (0 when not in the model) — drives the header badge. */
export function sortPriority(model = [], key) {
  const idx = model.findIndex((s) => s.key === key);
  return idx === -1 ? 0 : idx + 1;
}

/** The sort direction for a key, or null when the key is not sorted. */
export function sortDirOf(model = [], key) {
  return model.find((s) => s.key === key)?.dir ?? null;
}

/** Move a column key one slot up/down in the order array (pure; clamps at the ends). */
export function moveColumn(order = [], key, delta) {
  const i = order.indexOf(key);
  const j = i + delta;
  if (i === -1 || j < 0 || j >= order.length) return order;
  const next = [...order];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}
