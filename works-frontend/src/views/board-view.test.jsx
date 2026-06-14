import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BoardView from './board-view';

const noop = () => {};

const baseProps = {
  workItems: [],
  loading: false,
  density: 'comfortable',
  wipLimits: {},
  setDensity: noop,
  setIsCreateOpen: noop,
  setNewItem: noop,
  setSelectedItem: noop,
  handleDragStart: noop,
  handleDragOver: noop,
  handleDrop: noop,
  handleDelete: noop,
  toggleStar: noop,
  setWipLimit: noop,
  can: () => false,
  userName: () => '',
};

describe('BoardView', () => {
  it('renders without crashing with empty state', () => {
    render(<BoardView {...baseProps} />);
    expect(screen.getByRole('heading', { name: /board/i })).toBeInTheDocument();
  });

  it('shows three kanban columns', () => {
    render(<BoardView {...baseProps} />);
    expect(screen.getByText('TO DO')).toBeInTheDocument();
    expect(screen.getByText('IN PROGRESS')).toBeInTheDocument();
    expect(screen.getByText('DONE')).toBeInTheDocument();
  });

  it('shows skeleton while loading', () => {
    render(<BoardView {...baseProps} loading={true} />);
    expect(screen.getByRole('generic', { hidden: true, name: /loading board/i })).toBeInTheDocument();
  });

  it('renders work item cards', () => {
    const items = [
      { id: 'WI-1', title: 'Fix login bug', type: 'Bug', status: 'Todo', assigneeId: null, tags: [], starred: false },
    ];
    render(<BoardView {...baseProps} workItems={items} />);
    expect(screen.getByText('Fix login bug')).toBeInTheDocument();
  });

  it('shows density toggle buttons', () => {
    render(<BoardView {...baseProps} />);
    expect(screen.getByRole('button', { name: /compact/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /comfortable/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /spacious/i })).toBeInTheDocument();
  });

  it('renders the filter/sort bar', () => {
    render(<BoardView {...baseProps} />);
    expect(screen.getByRole('searchbox', { name: /search items/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /my items/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/sort by/i)).toBeInTheDocument();
  });

  const twoItems = [
    { id: 'WI-1', title: 'Fix login bug', type: 'Bug', status: 'Todo', priority: 'HIGH', assigneeId: 'u1', tags: [], starred: false },
    { id: 'WI-2', title: 'Write the docs', type: 'Task', status: 'Todo', priority: 'LOW', assigneeId: 'u2', tags: [], starred: false },
  ];

  it('text search narrows the visible cards', () => {
    render(<BoardView {...baseProps} workItems={twoItems} currentUserId="u1" />);
    expect(screen.getByText('Fix login bug')).toBeInTheDocument();
    expect(screen.getByText('Write the docs')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox', { name: /search items/i }), { target: { value: 'login' } });
    expect(screen.getByText('Fix login bug')).toBeInTheDocument();
    expect(screen.queryByText('Write the docs')).not.toBeInTheDocument();
  });

  it('"My items" shows only the current user\'s items', () => {
    render(<BoardView {...baseProps} workItems={twoItems} currentUserId="u1" />);
    fireEvent.click(screen.getByRole('button', { name: /my items/i }));
    expect(screen.getByText('Fix login bug')).toBeInTheDocument();
    expect(screen.queryByText('Write the docs')).not.toBeInTheDocument();
  });
});
