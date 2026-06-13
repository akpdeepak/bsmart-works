import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { expectNoA11yViolations } from '@/test/a11y';
import NotificationsView from './notifications-view';

vi.mock('@/lib/apiClient', () => ({
  api: { raw: vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })) },
}));

const noop = () => {};
const baseProps = {
  notifications: [],
  unreadCount: 0,
  currentUser: { id: 'USR-1' },
  fetchNotifications: noop,
  fetchUnreadCount: noop,
  setUnreadCount: noop,
};

describe('NotificationsView', () => {
  it('shows the empty state when there are no notifications', () => {
    render(<NotificationsView {...baseProps} />);
    expect(screen.getByText("You're all caught up")).toBeInTheDocument();
  });

  it('lists notifications and offers mark-all-read only when some are unread', () => {
    render(
      <NotificationsView
        {...baseProps}
        unreadCount={1}
        notifications={[{ id: 'N1', message: 'You were assigned WRK-1', read: false }]}
      />,
    );
    expect(screen.getByText('You were assigned WRK-1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark all as read' })).toBeInTheDocument();
  });

  it('hides mark-all-read when everything is read', () => {
    render(<NotificationsView {...baseProps} notifications={[{ id: 'N1', message: 'Done', read: true }]} />);
    expect(screen.queryByRole('button', { name: 'Mark all as read' })).toBeNull();
  });

  it('marks a single notification read', async () => {
    const { api } = await import('@/lib/apiClient');
    render(<NotificationsView {...baseProps} notifications={[{ id: 'N1', message: 'Ping', read: false }]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Mark as read' }));
    expect(api.raw).toHaveBeenCalledWith('/notifications/N1/read', { method: 'PUT' });
  });

  it('surfaces a failed mark-read via onError instead of silently swallowing it', async () => {
    const { api } = await import('@/lib/apiClient');
    api.raw.mockImplementationOnce(() => Promise.reject(new Error('boom')));
    const onError = vi.fn();
    render(<NotificationsView {...baseProps} onError={onError} notifications={[{ id: 'N1', message: 'Ping', read: false }]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Mark as read' }));
    await waitFor(() => expect(onError).toHaveBeenCalled());
  });

  it('surfaces a failed mark-all-read via onError', async () => {
    const { api } = await import('@/lib/apiClient');
    api.raw.mockImplementationOnce(() => Promise.reject(new Error('boom')));
    const onError = vi.fn();
    render(<NotificationsView {...baseProps} onError={onError} unreadCount={1}
      notifications={[{ id: 'N1', message: 'Ping', read: false }]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Mark all as read' }));
    await waitFor(() => expect(onError).toHaveBeenCalled());
  });

  it('has no serious a11y violations', async () => {
    const { container } = render(
      <NotificationsView {...baseProps} unreadCount={1}
        notifications={[{ id: 'N1', message: 'Ping', read: false, createdAt: '2026-06-01' }]} />,
    );
    await expectNoA11yViolations(container);
  });
});
