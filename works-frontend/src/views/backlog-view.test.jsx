import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import BacklogView from './backlog-view';

const noop = () => {};

const baseProps = {
  workItems: [],
  backlogItems: [],
  sprints: [],
  users: [],
  refinementMode: false,
  dragOverId: null,
  setRefinementMode: noop,
  setDragOverId: noop,
  setIsCreateOpen: noop,
  setIsSprintOpen: noop,
  setSelectedItem: noop,
  handleBacklogDragStart: noop,
  handleBacklogDrop: noop,
  handleMoveToSprint: noop,
  handleMoveToBacklog: noop,
  handleSprintStatusChange: noop,
  handleRefinementUpdate: noop,
};

describe('BacklogView', () => {
  it('renders the Backlog heading', () => {
    render(<BacklogView {...baseProps} />);
    expect(screen.getByRole('heading', { name: /^backlog$/i, level: 1 })).toBeInTheDocument();
  });

  it('shows 0 items count in subtitle', () => {
    render(<BacklogView {...baseProps} />);
    expect(screen.getByText(/0 items not in any sprint/i)).toBeInTheDocument();
  });

  it('shows empty state when backlog has no items', () => {
    render(<BacklogView {...baseProps} />);
    expect(screen.getByText(/backlog is empty/i)).toBeInTheDocument();
  });

  it('renders a backlog item row', () => {
    const items = [{ id: 'WI-1', title: 'Fix login', type: 'Bug', status: 'Todo', priority: 'HIGH', storyPoints: 3, assigneeId: null, parentId: null }];
    render(<BacklogView {...baseProps} backlogItems={items} workItems={items} />);
    expect(screen.getByText('Fix login')).toBeInTheDocument();
  });

  it('renders Add Item and New Sprint buttons', () => {
    render(<BacklogView {...baseProps} />);
    expect(screen.getByRole('button', { name: /\+ add item/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\+ new sprint/i })).toBeInTheDocument();
  });
});
