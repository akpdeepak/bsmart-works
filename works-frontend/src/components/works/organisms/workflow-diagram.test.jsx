import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WorkflowDiagram } from './workflow-diagram';

const statuses = [
  { id: 's1', name: 'To Do', category: 'TO_DO', isInitial: true },
  { id: 's2', name: 'In Progress', category: 'IN_PROGRESS' },
  { id: 's3', name: 'Done', category: 'DONE' },
];
const transitions = [
  { id: 't1', name: 'Start', fromStatus: 's1', toStatus: 's2' },
  { id: 't2', name: 'Finish', fromStatus: 's2', toStatus: 's3' },
];

describe('WorkflowDiagram', () => {
  it('renders nothing when there are no statuses', () => {
    const { container } = render(<WorkflowDiagram statuses={[]} transitions={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a node per status and marks the initial one', () => {
    render(<WorkflowDiagram statuses={statuses} transitions={transitions} />);
    expect(screen.getByText('To Do')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
    expect(screen.getByText(/initial/i)).toBeInTheDocument();
  });

  it('exposes a screen-reader transition list and a decorative svg', () => {
    const { container } = render(<WorkflowDiagram statuses={statuses} transitions={transitions} />);
    expect(screen.getByText('To Do to In Progress')).toBeInTheDocument();
    expect(screen.getByText('In Progress to Done')).toBeInTheDocument();
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('skips drawing edges whose endpoints are missing', () => {
    const bad = [{ id: 'tx', name: 'Ghost', fromStatus: 's1', toStatus: 'gone' }];
    const { container } = render(<WorkflowDiagram statuses={statuses} transitions={bad} />);
    // No drawable edge → no path in the svg and no SR list item
    expect(container.querySelector('svg path[stroke]')).toBeNull();
    expect(screen.queryByText(/to gone/i)).not.toBeInTheDocument();
  });
});
