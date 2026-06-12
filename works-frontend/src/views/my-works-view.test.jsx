import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MyWorksView from './my-works-view';

const noop = () => {};
const baseProps = {
  myItems: [],
  workItems: [],
  notifications: [],
  myWorksTab: 'assigned',
  currentUser: { id: 'USR-1' },
  setMyWorksTab: noop,
  setSelectedItem: noop,
  setIsCreateOpen: noop,
  onPressKey: noop,
};

const makeItem = (overrides) => ({
  id: 'WRK-1', title: 'Do the thing', type: 'Task', status: 'Todo', priority: 'MEDIUM',
  ...overrides,
});

describe('MyWorksView', () => {
  it('shows the empty assigned state with a create CTA', () => {
    render(<MyWorksView {...baseProps} />);
    expect(screen.getByText('Nothing assigned to you')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create a work item' })).toBeInTheDocument();
  });

  it('lists assigned items as keyboard-operable rows', () => {
    render(<MyWorksView {...baseProps} myItems={[makeItem()]} />);
    const row = screen.getByRole('button', { name: /Do the thing/ });
    expect(row).toHaveAttribute('tabindex', '0');
  });

  it('switches tab when a sub-tab is clicked', () => {
    const setMyWorksTab = vi.fn();
    render(<MyWorksView {...baseProps} setMyWorksTab={setMyWorksTab} />);
    fireEvent.click(screen.getByRole('tab', { name: /Starred/ }));
    expect(setMyWorksTab).toHaveBeenCalledWith('starred');
  });

  it('marks the active tab with aria-selected', () => {
    render(<MyWorksView {...baseProps} myWorksTab="starred" />);
    expect(screen.getByRole('tab', { name: /Starred/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /Assigned/ })).toHaveAttribute('aria-selected', 'false');
  });

  it('shows sort pills when there are assigned items', () => {
    render(<MyWorksView {...baseProps} myItems={[makeItem()]} />);
    expect(screen.getByRole('button', { name: 'Priority' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Due date' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recent' })).toBeInTheDocument();
  });

  it('does not show sort pills when assigned list is empty', () => {
    render(<MyWorksView {...baseProps} />);
    expect(screen.queryByRole('button', { name: 'Priority' })).not.toBeInTheDocument();
  });

  it('sorts assigned items by priority: CRITICAL first, LOW last', () => {
    const items = [
      makeItem({ id: 'WRK-A', title: 'Low task',      priority: 'LOW'      }),
      makeItem({ id: 'WRK-B', title: 'Critical task',  priority: 'CRITICAL' }),
      makeItem({ id: 'WRK-C', title: 'High task',      priority: 'HIGH'     }),
    ];
    render(<MyWorksView {...baseProps} myItems={items} />);
    const rows = screen.getAllByRole('button', { name: /task/ });
    expect(rows[0]).toHaveTextContent('Critical task');
    expect(rows[1]).toHaveTextContent('High task');
    expect(rows[2]).toHaveTextContent('Low task');
  });

  it('re-sorts to recent when the Recent pill is clicked', () => {
    const items = [
      makeItem({ id: 'WRK-A', title: 'Alpha', priority: 'LOW',      updatedAt: '2026-01-01' }),
      makeItem({ id: 'WRK-B', title: 'Beta',  priority: 'CRITICAL', updatedAt: '2026-06-01' }),
    ];
    render(<MyWorksView {...baseProps} myItems={items} />);
    fireEvent.click(screen.getByRole('button', { name: 'Recent' }));
    const rows = screen.getAllByRole('button', { name: /Alpha|Beta/ });
    expect(rows[0]).toHaveTextContent('Beta'); // more recent
    expect(rows[1]).toHaveTextContent('Alpha');
  });

  it('shows due date on starred items', () => {
    const item = makeItem({ id: 'WRK-2', title: 'Starred task', starred: true, dueDate: '2099-12-31' });
    render(<MyWorksView {...baseProps} myWorksTab="starred" workItems={[item]} />);
    expect(screen.getByText(/12\/31\/2099|31\/12\/2099/)).toBeInTheDocument();
  });

  it('shows relative time on mentions', () => {
    const n = { id: 'N-1', type: 'MENTION', message: 'You were mentioned', createdAt: new Date(Date.now() - 120000).toISOString(), read: false };
    render(<MyWorksView {...baseProps} myWorksTab="mentions" notifications={[n]} />);
    expect(screen.getByText('2m ago')).toBeInTheDocument();
  });

  it('makes a mention clickable when it has a linked item', () => {
    const item = makeItem({ id: 'WRK-3', title: 'Linked item' });
    const n = { id: 'N-2', type: 'MENTION', message: 'You were mentioned in WRK-3', itemId: 'WRK-3', read: false };
    const setSelectedItem = vi.fn();
    render(<MyWorksView {...baseProps} myWorksTab="mentions" notifications={[n]} workItems={[item]} setSelectedItem={setSelectedItem} />);
    fireEvent.click(screen.getByRole('button', { name: /You were mentioned/ }));
    expect(setSelectedItem).toHaveBeenCalledWith(item);
  });

  it('shows activity capped with overflow count', () => {
    const items = Array.from({ length: 25 }, (_, i) => makeItem({ id: `WRK-${i}`, title: `Item ${i}`, assigneeId: 'USR-1' }));
    render(<MyWorksView {...baseProps} myWorksTab="activity" workItems={items} />);
    expect(screen.getByText(/5 more/)).toBeInTheDocument();
  });

  it('shows empty activity state with a create CTA', () => {
    render(<MyWorksView {...baseProps} myWorksTab="activity" />);
    expect(screen.getByText('No recent activity')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create a work item' })).toBeInTheDocument();
  });
});
