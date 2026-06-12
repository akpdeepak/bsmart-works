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

describe('MyWorksView', () => {
  it('shows the empty assigned state with a create CTA', () => {
    render(<MyWorksView {...baseProps} />);
    expect(screen.getByText('Nothing assigned to you')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create a work item' })).toBeInTheDocument();
  });

  it('lists assigned items as keyboard-operable rows', () => {
    render(<MyWorksView {...baseProps} myItems={[{ id: 'WRK-1', title: 'Do the thing', type: 'Task', status: 'Todo' }]} />);
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

  it('shows due date on starred items', () => {
    const item = { id: 'WRK-2', title: 'Starred task', type: 'Task', status: 'Todo', starred: true, dueDate: '2099-12-31' };
    render(<MyWorksView {...baseProps} myWorksTab="starred" workItems={[item]} />);
    expect(screen.getByText(/12\/31\/2099|31\/12\/2099/)).toBeInTheDocument();
  });

  it('shows relative time on mentions', () => {
    const n = { id: 'N-1', type: 'MENTION', message: 'You were mentioned', createdAt: new Date(Date.now() - 120000).toISOString(), read: false };
    render(<MyWorksView {...baseProps} myWorksTab="mentions" notifications={[n]} />);
    expect(screen.getByText('2m ago')).toBeInTheDocument();
  });

  it('makes a mention clickable when it has a linked item', () => {
    const item = { id: 'WRK-3', title: 'Linked item', type: 'Task', status: 'Todo' };
    const n = { id: 'N-2', type: 'MENTION', message: 'You were mentioned in WRK-3', itemId: 'WRK-3', read: false };
    const setSelectedItem = vi.fn();
    render(<MyWorksView {...baseProps} myWorksTab="mentions" notifications={[n]} workItems={[item]} setSelectedItem={setSelectedItem} />);
    fireEvent.click(screen.getByRole('button', { name: /You were mentioned/ }));
    expect(setSelectedItem).toHaveBeenCalledWith(item);
  });

  it('shows activity capped with overflow count', () => {
    const items = Array.from({ length: 25 }, (_, i) => ({
      id: `WRK-${i}`, title: `Item ${i}`, type: 'Task', status: 'Todo', assigneeId: 'USR-1',
    }));
    render(<MyWorksView {...baseProps} myWorksTab="activity" workItems={items} />);
    expect(screen.getByText(/5 more/)).toBeInTheDocument();
  });

  it('shows empty activity state with a create CTA', () => {
    render(<MyWorksView {...baseProps} myWorksTab="activity" />);
    expect(screen.getByText('No recent activity')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create a work item' })).toBeInTheDocument();
  });
});
