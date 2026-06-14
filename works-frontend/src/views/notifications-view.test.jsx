import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { expectNoA11yViolations } from '@/test/a11y';
import NotificationsView from './notifications-view';

vi.mock('@/lib/apiClient', () => ({
  api: { raw: vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })) },
}));

// Reset mock between tests so call counts don't bleed.
beforeEach(async () => {
  const { api } = await import('@/lib/apiClient');
  api.raw.mockClear();
  api.raw.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
});

const noop = () => {};
const baseProps = {
  notifications: [],
  setNotifications: noop,
  unreadCount: 0,
  currentUser: { id: 'USR-1' },
  fetchNotifications: noop,
  fetchUnreadCount: noop,
  setUnreadCount: noop,
  setView: noop,
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

  it('marks a single notification read via PUT and updates local state (not full refetch)', async () => {
    const { api } = await import('@/lib/apiClient');
    const setNotifications = vi.fn();
    const setUnreadCount = vi.fn();
    render(
      <NotificationsView
        {...baseProps}
        setNotifications={setNotifications}
        setUnreadCount={setUnreadCount}
        notifications={[{ id: 'N1', message: 'Ping', read: false }]}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Mark as read' }));
    expect(api.raw).toHaveBeenCalledWith('/notifications/N1/read', { method: 'PUT' });
    await waitFor(() => expect(setNotifications).toHaveBeenCalled());
    // Verify the updater function maps the right id to read:true
    const updater = setNotifications.mock.calls[0][0];
    const updated = updater([{ id: 'N1', read: false }, { id: 'N2', read: false }]);
    expect(updated).toEqual([{ id: 'N1', read: true }, { id: 'N2', read: false }]);
  });

  it('navigates to the resolved view when a notification with a top-level link is clicked', async () => {
    const { api } = await import('@/lib/apiClient');
    const setView = vi.fn();
    const setNotifications = vi.fn();
    render(
      <NotificationsView
        {...baseProps}
        setView={setView}
        setNotifications={setNotifications}
        notifications={[{ id: 'N1', message: 'SLA breach', read: true, link: '/sla' }]}
      />,
    );
    // The card itself is the clickable element (role=button) since it has a navigable link.
    fireEvent.click(screen.getByText('SLA breach'));
    await waitFor(() => expect(setView).toHaveBeenCalledWith('sla'));
    // Already read — no mark-read call needed.
    expect(api.raw).not.toHaveBeenCalled();
  });

  it('marks unread notification read before navigating', async () => {
    const { api } = await import('@/lib/apiClient');
    const setView = vi.fn();
    const setNotifications = vi.fn();
    render(
      <NotificationsView
        {...baseProps}
        setView={setView}
        setNotifications={setNotifications}
        unreadCount={1}
        notifications={[{ id: 'N2', message: 'Compliance alert', read: false, link: '/compliance' }]}
      />,
    );
    fireEvent.click(screen.getByText('Compliance alert'));
    expect(api.raw).toHaveBeenCalledWith('/notifications/N2/read', { method: 'PUT' });
    await waitFor(() => expect(setView).toHaveBeenCalledWith('compliance'));
  });

  it('does not navigate for entity links that are not yet routed (/items/:id) but still marks read', async () => {
    const { api } = await import('@/lib/apiClient');
    const setView = vi.fn();
    const setNotifications = vi.fn();
    render(
      <NotificationsView
        {...baseProps}
        setView={setView}
        setNotifications={setNotifications}
        notifications={[{ id: 'N3', message: 'Comment on WI-42', read: false, link: '/items/WI-42' }]}
      />,
    );
    fireEvent.click(screen.getByText('Comment on WI-42'));
    // Should mark read
    expect(api.raw).toHaveBeenCalledWith('/notifications/N3/read', { method: 'PUT' });
    // setView is NOT called — entity route doesn't resolve to a view id
    await waitFor(() => expect(setNotifications).toHaveBeenCalled());
    expect(setView).not.toHaveBeenCalled();
  });

  it('mark-all-read updates local state and resets unread count', async () => {
    const { api } = await import('@/lib/apiClient');
    const setNotifications = vi.fn();
    const setUnreadCount = vi.fn();
    render(
      <NotificationsView
        {...baseProps}
        setNotifications={setNotifications}
        setUnreadCount={setUnreadCount}
        unreadCount={2}
        notifications={[
          { id: 'N1', message: 'A', read: false },
          { id: 'N2', message: 'B', read: false },
        ]}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Mark all as read' }));
    await waitFor(() => expect(setNotifications).toHaveBeenCalled());
    const updater = setNotifications.mock.calls[0][0];
    const updated = updater([{ id: 'N1', read: false }, { id: 'N2', read: false }]);
    expect(updated.every(n => n.read)).toBe(true);
    expect(setUnreadCount).toHaveBeenCalledWith(0);
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
