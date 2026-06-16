import { describe, it, expect } from 'vitest';
import { layoutWorkflow, DEFAULT_NODE_W, DEFAULT_GAP_X } from './workflow-diagram';

const statuses = [
  { id: 's1', name: 'To Do', category: 'TO_DO', isInitial: true },
  { id: 's2', name: 'In Progress', category: 'IN_PROGRESS' },
  { id: 's3', name: 'Done', category: 'DONE' },
];

describe('layoutWorkflow', () => {
  it('places nodes left-to-right in workflow order', () => {
    const { nodes, contentWidth } = layoutWorkflow(statuses, []);
    expect(nodes.map((n) => n.x)).toEqual([
      0,
      DEFAULT_NODE_W + DEFAULT_GAP_X,
      2 * (DEFAULT_NODE_W + DEFAULT_GAP_X),
    ]);
    expect(contentWidth).toBe(3 * DEFAULT_NODE_W + 2 * DEFAULT_GAP_X);
  });

  it('classifies transition direction by endpoint order', () => {
    const transitions = [
      { id: 't1', name: 'Start', fromStatus: 's1', toStatus: 's2' },   // forward
      { id: 't2', name: 'Reopen', fromStatus: 's3', toStatus: 's1' },  // backward
      { id: 't3', name: 'Spin', fromStatus: 's2', toStatus: 's2' },    // self
      { id: 't4', name: 'Ghost', fromStatus: 's1', toStatus: 'missing' }, // unknown
    ];
    const { edges } = layoutWorkflow(statuses, transitions);
    expect(edges.map((e) => e.dir)).toEqual(['forward', 'backward', 'self', 'unknown']);
    expect(edges[0]).toMatchObject({ fromIndex: 0, toIndex: 1 });
    expect(edges[3].toIndex).toBe(-1);
  });

  it('returns empty layout for no statuses', () => {
    const { nodes, contentWidth } = layoutWorkflow([], []);
    expect(nodes).toEqual([]);
    expect(contentWidth).toBe(0);
  });
});
