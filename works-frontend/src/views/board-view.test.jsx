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

  it('selecting a card reveals the bulk-edit bar (when bulk is enabled)', () => {
    render(<BoardView {...baseProps} workItems={twoItems} currentUserId="u1" onBulkEdit={() => Promise.resolve()} users={[{ id: 'u1', fullName: 'Alice' }]} />);
    // No bar until something is selected.
    expect(screen.queryByRole('button', { name: /apply/i })).not.toBeInTheDocument();
    const checkboxes = screen.getAllByRole('checkbox', { name: /select item/i });
    fireEvent.click(checkboxes[0]);
    expect(screen.getByRole('button', { name: /apply/i })).toBeInTheDocument();
    expect(screen.getByText(/1 selected/i)).toBeInTheDocument();
  });

  it('does not render selection checkboxes when bulk is disabled', () => {
    render(<BoardView {...baseProps} workItems={twoItems} currentUserId="u1" />);
    expect(screen.queryByRole('checkbox', { name: /select item/i })).not.toBeInTheDocument();
  });

  // Audit Finding #7 — X-Total-Count / truncation indicator
  it('shows no truncation warning when totalWorkItemCount equals loaded count', () => {
    render(<BoardView {...baseProps} workItems={twoItems} totalWorkItemCount={2} />);
    expect(screen.queryByText(/of 2/i)).not.toBeInTheDocument();
  });

  it('shows truncation warning when totalWorkItemCount exceeds loaded items', () => {
    // Seed workspace has 319 items but only 200 are loaded (Audit Finding #7).
    const items = Array.from({ length: 200 }, (_, i) => ({
      id: `WI-${i}`, title: `Item ${i}`, type: 'Task', status: 'Todo', tags: [], starred: false,
    }));
    render(<BoardView {...baseProps} workItems={items} totalWorkItemCount={319} />);
    expect(screen.getByText(/of 319/i)).toBeInTheDocument();
  });

  it('shows no truncation warning when totalWorkItemCount is null (header absent)', () => {
    render(<BoardView {...baseProps} workItems={twoItems} totalWorkItemCount={null} />);
    expect(screen.queryByText(/of/i)).not.toBeInTheDocument();
  });

  // ── Workflow-driven column tests (audit finding #12) ────────────────────────

  it('falls back to three category columns when no columns prop is supplied', () => {
    render(<BoardView {...baseProps} />);
    // Default i18n keys resolve to the en locale values
    expect(screen.getByText('TO DO')).toBeInTheDocument();
    expect(screen.getByText('IN PROGRESS')).toBeInTheDocument();
    expect(screen.getByText('DONE')).toBeInTheDocument();
  });

  it('falls back to three category columns when an empty columns array is supplied', () => {
    render(<BoardView {...baseProps} columns={[]} />);
    expect(screen.getByText('TO DO')).toBeInTheDocument();
    expect(screen.getByText('IN PROGRESS')).toBeInTheDocument();
    expect(screen.getByText('DONE')).toBeInTheDocument();
  });

  it('renders one column per workflow status when columns prop is provided', () => {
    const workflowColumns = [
      { name: 'Backlog',     category: 'TO_DO',       dot: 'bg-neutral-400',     limitKey: 'todoLimit' },
      { name: 'Triaged',     category: 'TO_DO',       dot: 'bg-neutral-400',     limitKey: 'todoLimit' },
      { name: 'In Dev',      category: 'IN_PROGRESS', dot: 'bg-brand-navy-tint',  limitKey: 'inProgressLimit' },
      { name: 'In Review',   category: 'IN_PROGRESS', dot: 'bg-brand-navy-tint',  limitKey: 'inProgressLimit' },
      { name: 'Released',    category: 'DONE',        dot: 'bg-semantic-success', limitKey: 'doneLimit' },
    ];
    render(<BoardView {...baseProps} columns={workflowColumns} />);
    // Column headers are rendered with CSS uppercase — match the original status name text.
    expect(screen.getByText('Backlog')).toBeInTheDocument();
    expect(screen.getByText('Triaged')).toBeInTheDocument();
    expect(screen.getByText('In Dev')).toBeInTheDocument();
    expect(screen.getByText('In Review')).toBeInTheDocument();
    expect(screen.getByText('Released')).toBeInTheDocument();
    // Default three-category i18n headers must NOT appear
    expect(screen.queryByText('TO DO')).not.toBeInTheDocument();
    expect(screen.queryByText('IN PROGRESS')).not.toBeInTheDocument();
    expect(screen.queryByText('DONE')).not.toBeInTheDocument();
  });

  it('items appear in the correct workflow column by exact status name', () => {
    const workflowColumns = [
      { name: 'Triaged',   category: 'TO_DO',       dot: 'bg-neutral-400',     limitKey: 'todoLimit' },
      { name: 'In Dev',    category: 'IN_PROGRESS', dot: 'bg-brand-navy-tint',  limitKey: 'inProgressLimit' },
      { name: 'Released',  category: 'DONE',        dot: 'bg-semantic-success', limitKey: 'doneLimit' },
    ];
    const items = [
      { id: 'WI-A', title: 'Alpha task', type: 'Task', status: 'Triaged',  assigneeId: null, tags: [], starred: false },
      { id: 'WI-B', title: 'Beta task',  type: 'Task', status: 'In Dev',   assigneeId: null, tags: [], starred: false },
      { id: 'WI-C', title: 'Gamma task', type: 'Task', status: 'Released', assigneeId: null, tags: [], starred: false },
    ];
    render(<BoardView {...baseProps} workItems={items} columns={workflowColumns} />);
    expect(screen.getByText('Alpha task')).toBeInTheDocument();
    expect(screen.getByText('Beta task')).toBeInTheDocument();
    expect(screen.getByText('Gamma task')).toBeInTheDocument();
  });

  it('items with a custom status not in any workflow column are not shown in wrong column', () => {
    // A 3-column workflow; item has status 'Unknown' not in any column
    const workflowColumns = [
      { name: 'Todo',       category: 'TO_DO',       dot: 'bg-neutral-400',     limitKey: 'todoLimit' },
      { name: 'In Dev',     category: 'IN_PROGRESS', dot: 'bg-brand-navy-tint',  limitKey: 'inProgressLimit' },
      { name: 'Done',       category: 'DONE',        dot: 'bg-semantic-success', limitKey: 'doneLimit' },
    ];
    const items = [
      { id: 'WI-X', title: 'Orphan item', type: 'Task', status: 'Unknown', assigneeId: null, tags: [], starred: false },
    ];
    render(<BoardView {...baseProps} workItems={items} columns={workflowColumns} />);
    // The item should not be visible (status 'Unknown' matches no column)
    expect(screen.queryByText('Orphan item')).not.toBeInTheDocument();
  });
});
