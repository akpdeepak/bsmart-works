import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { expectNoA11yViolations } from '@/test/a11y';
import NotificationsView from './notifications-view';

vi.mock('@/lib/apiClient', () => ({
  api: { raw: vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })) },
}));

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
  it('uses the sanctioned dashboard page shell', () => {
    const { container } = render(<NotificationsView {...baseProps} />);
    expect(container.firstChild).toHaveClass('max-w-workspace', 'px-6', 'py-6');
  });

  it('shows the action inbox empty state when there are no actionable notifications', () => {
    render(<NotificationsView {...baseProps} />);
    expect(screen.getByText('Action inbox is clear')).toBeInTheDocument();
  });

  it('groups actionable notifications and offers mark-all-read only when some need action', () => {
    render(
      <NotificationsView
        {...baseProps}
        unreadCount={1}
        notifications={[{ id: 'N1', type: 'ASSIGNED', message: 'You were assigned WRK-1', read: false }]}
      />,
    );

    expect(screen.getByText('1 actionable item')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Assign' })).toBeInTheDocument();
    expect(screen.getByText('You were assigned WRK-1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark all as read' })).toBeInTheDocument();
  });

  it('hides mark-all-read when everything is read', () => {
    render(<NotificationsView {...baseProps} notifications={[{ id: 'N1', type: 'ASSIGNED', message: 'Done', read: true }]} />);
    expect(screen.queryByRole('button', { name: 'Mark all as read' })).toBeNull();
  });

  it('marks a single actionable notification read via PUT and updates local state', async () => {
    const { api } = await import('@/lib/apiClient');
    const setNotifications = vi.fn();
    const setUnreadCount = vi.fn();
    render(
      <NotificationsView
        {...baseProps}
        setNotifications={setNotifications}
        setUnreadCount={setUnreadCount}
        notifications={[{ id: 'N1', type: 'MENTION', message: 'Ping', read: false }]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(api.raw).toHaveBeenCalledWith('/notifications/N1/read', { method: 'PUT' });
    await waitFor(() => expect(setNotifications).toHaveBeenCalled());
    const updater = setNotifications.mock.calls[0][0];
    const updated = updater([{ id: 'N1', read: false }, { id: 'N2', read: false }]);
    expect(updated).toEqual([{ id: 'N1', read: true }, { id: 'N2', read: false }]);
  });

  it('marks unread notification read before navigating to a resolved view', async () => {
    const { api } = await import('@/lib/apiClient');
    const setView = vi.fn();
    const setNotifications = vi.fn();
    render(
      <NotificationsView
        {...baseProps}
        setView={setView}
        setNotifications={setNotifications}
        unreadCount={1}
        notifications={[{ id: 'N2', type: 'COMPLIANCE', message: 'Compliance alert', read: false, link: '/compliance' }]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Escalate' }));
    expect(api.raw).toHaveBeenCalledWith('/notifications/N2/read', { method: 'PUT' });
    await waitFor(() => expect(setView).toHaveBeenCalledWith('compliance'));
  });

  it('does not navigate for entity links that are not yet routed but still marks read', async () => {
    const { api } = await import('@/lib/apiClient');
    const setView = vi.fn();
    const setNotifications = vi.fn();
    render(
      <NotificationsView
        {...baseProps}
        setView={setView}
        setNotifications={setNotifications}
        notifications={[{ id: 'N3', type: 'COMMENT', message: 'Comment on WI-42', read: false, link: '/items/WI-42' }]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reply' }));
    expect(api.raw).toHaveBeenCalledWith('/notifications/N3/read', { method: 'PUT' });
    await waitFor(() => expect(setNotifications).toHaveBeenCalled());
    expect(setView).not.toHaveBeenCalled();
  });

  it('mark-all-read updates local state and resets actionable count', async () => {
    const setNotifications = vi.fn();
    const setUnreadCount = vi.fn();
    render(
      <NotificationsView
        {...baseProps}
        setNotifications={setNotifications}
        setUnreadCount={setUnreadCount}
        unreadCount={2}
        notifications={[
          { id: 'N1', type: 'MENTION', message: 'A', read: false },
          { id: 'N2', type: 'ASSIGNED', message: 'B', read: false },
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
    render(<NotificationsView {...baseProps} onError={onError}
      notifications={[{ id: 'N1', type: 'MENTION', message: 'Ping', read: false }]} />);

    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    await waitFor(() => expect(onError).toHaveBeenCalled());
  });

  it('surfaces a failed mark-all-read via onError', async () => {
    const { api } = await import('@/lib/apiClient');
    api.raw.mockImplementationOnce(() => Promise.reject(new Error('boom')));
    const onError = vi.fn();
    render(<NotificationsView {...baseProps} onError={onError} unreadCount={1}
      notifications={[{ id: 'N1', type: 'MENTION', message: 'Ping', read: false }]} />);

    fireEvent.click(screen.getByRole('button', { name: 'Mark all as read' }));
    await waitFor(() => expect(onError).toHaveBeenCalled());
  });

  it('keeps all notifications available in activity history', () => {
    render(<NotificationsView {...baseProps}
      notifications={[{ id: 'N1', type: 'SYSTEM', message: 'FYI only', read: false }]} />);

    fireEvent.click(screen.getByRole('tab', { name: 'Activity history' }));
    expect(screen.getByText('FYI only')).toBeInTheDocument();
  });

  it('snoozes an actionable item out of the action inbox without deleting activity history', () => {
    const setUnreadCount = vi.fn();
    render(<NotificationsView {...baseProps} setUnreadCount={setUnreadCount}
      notifications={[{ id: 'N1', type: 'MENTION', message: 'Reply needed', read: false }]} />);

    fireEvent.click(screen.getByRole('button', { name: 'Snooze' }));
    expect(screen.getByText('Action inbox is clear')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Activity history' }));
    expect(screen.getByText('Reply needed')).toBeInTheDocument();
    expect(screen.getByText('Snoozed')).toBeInTheDocument();
  });

  it('has no serious a11y violations', async () => {
    const { container } = render(
      <NotificationsView {...baseProps} unreadCount={1}
        notifications={[{ id: 'N1', type: 'MENTION', message: 'Ping', read: false, createdAt: '2026-06-01' }]} />,
    );
    await expectNoA11yViolations(container);
  });
});
