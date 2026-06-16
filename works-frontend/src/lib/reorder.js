// Tiny pure array reorder helper. Swaps the item at index i with its neighbour i+delta; returns the
// array unchanged when the move would fall off either end. Index-based (positional) reordering —
// used by the widget builder's dimension list (WI-32d) and reusable anywhere order is positional.

export function moveIndex(arr = [], i, delta) {
  const j = i + delta;
  if (i < 0 || i >= arr.length || j < 0 || j >= arr.length) return arr;
  const next = [...arr];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}
