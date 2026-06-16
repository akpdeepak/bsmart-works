// Pure layout for the visual workflow diagram (WI-32a). Given a workflow's ordered statuses and its
// transitions, it computes node positions (a single horizontal lane, in workflow order) and edge
// metadata (direction + endpoint indices) so the renderer can draw arrows. Framework-free → the
// geometry/direction logic is unit-testable without the DOM. The renderer owns the SVG path strings;
// this owns positions and classification.

export const DEFAULT_NODE_W = 128;
export const DEFAULT_NODE_H = 44;
export const DEFAULT_GAP_X = 56;

/**
 * @param {Array} statuses     ordered [{ id, name, color, category, isInitial }]
 * @param {Array} transitions  [{ id, name, fromStatus, toStatus }]
 * @param {object} opts         { nodeW, nodeH, gapX }
 * @returns {{ nodes, edges, contentWidth, nodeW, nodeH }}
 *   nodes: [{ id, name, color, category, isInitial, index, x, cx, w, h }]
 *   edges: [{ id, name, fromId, toId, fromIndex, toIndex, dir }]  dir ∈ forward|backward|self|unknown
 */
export function layoutWorkflow(statuses = [], transitions = [], opts = {}) {
  const nodeW = opts.nodeW ?? DEFAULT_NODE_W;
  const nodeH = opts.nodeH ?? DEFAULT_NODE_H;
  const gapX = opts.gapX ?? DEFAULT_GAP_X;

  const nodes = statuses.map((s, i) => ({
    id: s.id,
    name: s.name,
    color: s.color,
    category: s.category,
    isInitial: s.isInitial,
    index: i,
    x: i * (nodeW + gapX),
    cx: i * (nodeW + gapX) + nodeW / 2,
    w: nodeW,
    h: nodeH,
  }));

  const indexById = new Map(statuses.map((s, i) => [s.id, i]));
  const edges = transitions.map((t) => {
    const fromIndex = indexById.has(t.fromStatus) ? indexById.get(t.fromStatus) : -1;
    const toIndex = indexById.has(t.toStatus) ? indexById.get(t.toStatus) : -1;
    let dir;
    if (fromIndex === -1 || toIndex === -1) dir = 'unknown';
    else if (fromIndex === toIndex) dir = 'self';
    else if (toIndex > fromIndex) dir = 'forward';
    else dir = 'backward';
    return { id: t.id, name: t.name, fromId: t.fromStatus, toId: t.toStatus, fromIndex, toIndex, dir };
  });

  const contentWidth = statuses.length > 0
    ? statuses.length * nodeW + (statuses.length - 1) * gapX
    : 0;

  return { nodes, edges, contentWidth, nodeW, nodeH };
}
