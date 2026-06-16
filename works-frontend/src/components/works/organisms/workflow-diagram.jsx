import { layoutWorkflow } from '@/lib/workflow-diagram';
import { BRAND_NAVY } from '@/lib/brand-tokens';
import { cn } from '@/lib/utils';

// Visual workflow diagram (WI-32a) — a read-only overview placed above the existing status/transition
// editors (parity-safe: it adds a picture, it does not replace the editing UI). HTML nodes (token-
// styled, crisp text) sit over an SVG layer that draws transition arrows: forward transitions arc
// above the lane, backward arcs below, self-loops loop above the node. Accessible: the SVG arrows are
// decorative (aria-hidden) and a screen-reader transition list carries the same information.

const ARC = 30;          // vertical arc reach for non-adjacent transitions
const PAD_Y = ARC + 14;  // vertical breathing room above/below the node lane

const catDot = {
  TO_DO: 'bg-neutral-400',
  IN_PROGRESS: 'bg-brand-navy-tint',
  DONE: 'bg-semantic-success',
};

function edgePath(edge, nodes, laneTop, nodeH) {
  const from = nodes[edge.fromIndex];
  const to = nodes[edge.toIndex];
  if (!from || !to) return null;
  if (edge.dir === 'self') {
    // small loop above the node
    const x = from.cx;
    const top = laneTop - ARC;
    return `M ${x - 14} ${laneTop} C ${x - 22} ${top}, ${x + 22} ${top}, ${x + 14} ${laneTop}`;
  }
  const x1 = from.cx;
  const x2 = to.cx;
  if (edge.dir === 'forward') {
    const y = laneTop - ARC; // arc above
    return `M ${x1} ${laneTop} C ${(x1 + x2) / 2} ${y}, ${(x1 + x2) / 2} ${y}, ${x2} ${laneTop}`;
  }
  // backward → arc below
  const y = laneTop + nodeH + ARC;
  const bottom = laneTop + nodeH;
  return `M ${x1} ${bottom} C ${(x1 + x2) / 2} ${y}, ${(x1 + x2) / 2} ${y}, ${x2} ${bottom}`;
}

export function WorkflowDiagram({ statuses = [], transitions = [], className }) {
  const { nodes, edges, contentWidth, nodeH } = layoutWorkflow(statuses, transitions);
  if (nodes.length === 0) return null;

  const laneTop = PAD_Y;
  const height = laneTop + nodeH + PAD_Y;
  const drawableEdges = edges.filter((e) => e.dir !== 'unknown');

  return (
    <div className={cn('rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-4', className)}>
      <p className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-3">Workflow map</p>
      <div className="overflow-x-auto">
        <div className="relative" style={{ width: contentWidth, height }}>
          {/* Arrow layer */}
          <svg
            className="absolute inset-0 pointer-events-none"
            width={contentWidth}
            height={height}
            aria-hidden="true"
            focusable="false"
          >
            <defs>
              <marker id="wf-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill={BRAND_NAVY} />
              </marker>
            </defs>
            {drawableEdges.map((edge) => {
              const d = edgePath(edge, nodes, laneTop, nodeH);
              if (!d) return null;
              return (
                <path
                  key={edge.id}
                  d={d}
                  fill="none"
                  stroke={BRAND_NAVY}
                  strokeWidth="1.5"
                  strokeOpacity="0.5"
                  markerEnd="url(#wf-arrow)"
                />
              );
            })}
          </svg>

          {/* Node layer */}
          {nodes.map((n) => (
            <div
              key={n.id}
              className="absolute flex flex-col justify-center rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 px-3 shadow-sm"
              style={{ left: n.x, top: laneTop, width: n.w, height: n.h }}
            >
              <div className="flex items-center gap-1.5">
                <span className={cn('h-2.5 w-2.5 rounded-full flex-shrink-0', catDot[n.category] || 'bg-neutral-400')}
                  style={n.color ? { backgroundColor: n.color } : undefined} aria-hidden="true" />
                <span className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{n.name}</span>
              </div>
              {n.isInitial && <span className="text-2xs font-bold uppercase tracking-wide text-brand-amber">Initial</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Screen-reader equivalent of the arrows */}
      <ul className="sr-only">
        {drawableEdges.map((edge) => (
          <li key={edge.id}>{`${nodes[edge.fromIndex].name} to ${nodes[edge.toIndex].name}`}</li>
        ))}
      </ul>
    </div>
  );
}

export default WorkflowDiagram;
