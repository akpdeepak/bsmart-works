import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

  it('renders the shared filter/sort bar', () => {
    render(<BacklogView {...baseProps} />);
    expect(screen.getByRole('searchbox', { name: /search items/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /my items/i })).toBeInTheDocument();
  });

  const items = [
    { id: 'WI-1', title: 'Fix login', type: 'Bug', status: 'Todo', priority: 'HIGH', storyPoints: 3, assigneeId: 'u1', parentId: null },
    { id: 'WI-2', title: 'Write docs', type: 'Task', status: 'Todo', priority: 'LOW', storyPoints: 2, assigneeId: 'u2', parentId: null },
  ];

  it('text search narrows the backlog list', () => {
    render(<BacklogView {...baseProps} backlogItems={items} workItems={items} currentUserId="u1" />);
    expect(screen.getByText('Fix login')).toBeInTheDocument();
    expect(screen.getByText('Write docs')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox', { name: /search items/i }), { target: { value: 'docs' } });
    expect(screen.queryByText('Fix login')).not.toBeInTheDocument();
    expect(screen.getByText('Write docs')).toBeInTheDocument();
  });

  it('shows a no-matches message when filters exclude everything', () => {
    render(<BacklogView {...baseProps} backlogItems={items} workItems={items} currentUserId="u1" />);
    fireEvent.change(screen.getByRole('searchbox', { name: /search items/i }), { target: { value: 'zzz-nope' } });
    expect(screen.getByText(/no items match/i)).toBeInTheDocument();
  });
});
