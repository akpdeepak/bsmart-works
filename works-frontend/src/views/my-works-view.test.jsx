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
});
