import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expectNoA11yViolations } from '@/test/a11y';
import NotificationsView from './notifications-view';

vi.mock('@/lib/apiClient', () => ({
  api: {
    raw: vi.fn(() => Promise.resolve({ ok: true, status: 204, json: () => Promise.resolve({}) })),
    send: vi.fn(() => Promise.resolve({})),
  },
}));

const ACTION = {
  key: 'notification:1',
  intent: 'REPLY',
  title: 'Reply requested',
  message: 'You were mentioned on WI-1',
  sourceType: 'WORK_ITEM',
  sourceId: 'WI-1',
  sourceLink: '/items/WI-1',
  createdAt: '2026-07-19T10:00:00Z',
  priority: 'NORMAL',
  primaryAction: { id: 'reply', label: 'Reply', kind: 'INPUT', method: 'POST', path: '/work-items/WI-1/comments' },
  secondaryActions: [{ id: 'convert', label: 'Convert to work', kind: 'CONVERT', method: 'POST', path: '/work-items' }],
};

const baseProps = {
  activeWorkspaceId: 'WS-1',
  inboxItems: [],
  setInboxItems: vi.fn(),
  notifications: [],
  setNotifications: vi.fn(),
  unreadCount: 0,
  setUnreadCount: vi.fn(),
  fetchNotifications: vi.fn(() => Promise.resolve()),
  navigate: vi.fn(),
  workItems: [{ id: 'WI-1', title: 'Source work' }],
  projects: [{ id: 'P-1', name: 'Project one' }],
  setSelectedItem: vi.fn(),
  onError: vi.fn(),
};

beforeEach(async () => {
  vi.clearAllMocks();
  const { api } = await import('@/lib/apiClient');
  api.send.mockResolvedValue({ ok: true, status: 204, json: () => Promise.resolve({}) });
  api.send.mockResolvedValue({});
});

describe('NotificationsView', () => {
  it('uses the product page shell and honest empty state', () => {
    const { container } = render(<NotificationsView {...baseProps} />);
    expect(container.firstChild).toHaveClass('max-w-workspace', 'px-6', 'py-6');
    expect(screen.getByText('Action inbox is clear')).toBeInTheDocument();
  });

  it('groups server-projected actions and renders one primary action', () => {
    render(<NotificationsView {...baseProps} inboxItems={[ACTION]} unreadCount={1} />);
    expect(screen.getByText('1 actionable item')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Reply' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reply' })).toBeInTheDocument();
  });

  it('persists done state in the active workspace', async () => {
    const { api } = await import('@/lib/apiClient');
    const setInboxItems = vi.fn();
    render(<NotificationsView {...baseProps} inboxItems={[ACTION]} setInboxItems={setInboxItems} />);
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    await waitFor(() => {
      expect(api.send).toHaveBeenCalledWith('/inbox/done?workspaceId=WS-1', {
        method: 'POST', body: JSON.stringify({ itemKey: ACTION.key }),
      });
      expect(setInboxItems).toHaveBeenCalled();
    });
  });

  it('persists the selected snooze duration', async () => {
    const { api } = await import('@/lib/apiClient');
    render(<NotificationsView {...baseProps} inboxItems={[ACTION]} />);
    fireEvent.change(screen.getByLabelText('Snooze duration for Reply requested'), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Snooze' }));
    await waitFor(() => expect(api.send).toHaveBeenCalledWith('/inbox/snooze?workspaceId=WS-1', expect.objectContaining({
      method: 'POST',
    })));
    const body = JSON.parse(api.send.mock.calls[0][1].body);
    expect(body.itemKey).toBe(ACTION.key);
    expect(new Date(body.until).getTime()).toBeGreaterThan(Date.now() + 3 * 60 * 60 * 1000);
  });

  it('acts on an approval directly, then records it done', async () => {
    const { api } = await import('@/lib/apiClient');
    const approval = {
      ...ACTION, key: 'article:A-1', intent: 'APPROVE', title: 'Article approval', sourceType: 'ARTICLE',
      primaryAction: { id: 'approve', label: 'Approve', kind: 'API', method: 'PUT', path: '/articles/A-1/publish' },
      secondaryActions: [{ id: 'reject', label: 'Reject', kind: 'API', method: 'PUT', path: '/articles/A-1/reject' }],
    };
    render(<NotificationsView {...baseProps} inboxItems={[approval]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(api.send).toHaveBeenCalledWith('/articles/A-1/publish', { method: 'PUT' }));
    expect(api.send).toHaveBeenCalledWith('/inbox/done?workspaceId=WS-1', expect.any(Object));
  });

  it('replies from the Inbox and completes the action', async () => {
    const { api } = await import('@/lib/apiClient');
    render(<NotificationsView {...baseProps} inboxItems={[ACTION]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Reply' }));
    fireEvent.change(screen.getByPlaceholderText('Write a reply'), { target: { value: 'I will take this.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send reply' }));
    await waitFor(() => expect(api.send).toHaveBeenCalledWith('/work-items/WI-1/comments', {
      method: 'POST', body: { body: 'I will take this.' },
    }));
  });

  it('converts an action to a real work item', async () => {
    const { api } = await import('@/lib/apiClient');
    render(<NotificationsView {...baseProps} inboxItems={[ACTION]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Convert to work' }));
    fireEvent.change(screen.getByLabelText('Work item title'), { target: { value: 'Follow up with reviewer' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create task' }));
    await waitFor(() => expect(api.send).toHaveBeenCalledWith('/work-items', {
      method: 'POST', body: expect.objectContaining({ title: 'Follow up with reviewer', projectId: 'P-1' }),
    }));
  });

  it('bulk-clears only low-priority projected items', async () => {
    const { api } = await import('@/lib/apiClient');
    api.send.mockResolvedValueOnce({ updated: 1 });
    render(<NotificationsView {...baseProps} inboxItems={[ACTION, { ...ACTION, key: 'n:2', priority: 'HIGH' }]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Clear low priority' }));
    await waitFor(() => expect(api.send).toHaveBeenCalledWith('/inbox/bulk-done?workspaceId=WS-1', {
      method: 'POST', body: { itemKeys: [ACTION.key] },
    }));
  });

  it('shows a governed summary and its source links', async () => {
    const { api } = await import('@/lib/apiClient');
    api.send.mockResolvedValueOnce({
      text: 'One reply needs attention.', usedAi: false, fallback: true,
      sources: [{ key: ACTION.key, title: ACTION.title, sourceLink: ACTION.sourceLink }],
    });
    render(<NotificationsView {...baseProps} inboxItems={[ACTION]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Summarize missed activity' }));
    expect(await screen.findByText('One reply needs attention.')).toBeInTheDocument();
    expect(screen.getByText('Deterministic summary')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: ACTION.title })).toBeInTheDocument();
  });

  it('keeps Activity history separate and marks it read with workspace scope', async () => {
    const { api } = await import('@/lib/apiClient');
    render(<NotificationsView {...baseProps} notifications={[{ id: 9, message: 'FYI only', read: false, link: '/compliance' }]} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Activity history' }));
    expect(screen.getByText('FYI only')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mark all activity read' }));
    await waitFor(() => expect(api.send).toHaveBeenCalledWith('/notifications/mark-all-read?workspaceId=WS-1', { method: 'PUT' }));
  });

  it('opens a work-item source in the real detail surface', () => {
    const setSelectedItem = vi.fn();
    const navigate = vi.fn();
    const openAction = { ...ACTION, primaryAction: { id: 'open', label: 'Open', kind: 'OPEN', method: 'GET', path: null } };
    render(<NotificationsView {...baseProps} inboxItems={[openAction]} setSelectedItem={setSelectedItem} navigate={navigate} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(setSelectedItem).toHaveBeenCalledWith(baseProps.workItems[0]);
    expect(navigate).toHaveBeenCalledWith('board');
  });

  it('uses the server preference panel for quiet hours', async () => {
    const { api } = await import('@/lib/apiClient');
    api.send.mockResolvedValueOnce({
      pushEnabled: true, notifyAssign: true, notifyMention: true, notifyComment: true,
      notifyStatusChange: true, notifySlaBreach: true, notifyAutomation: true,
      quietHoursEnabled: true, quietHoursStart: 22, quietHoursEnd: 7,
      p0OverrideQuiet: true, snoozeUntil: null,
    });
    render(<NotificationsView {...baseProps} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Preferences' }));
    expect(await screen.findByLabelText('From')).toHaveValue(22);
    expect(api.send).toHaveBeenCalledWith('/push/preferences');
  });

  it('surfaces mutation failures', async () => {
    const { api } = await import('@/lib/apiClient');
    api.send.mockRejectedValueOnce(new Error('offline'));
    render(<NotificationsView {...baseProps} inboxItems={[ACTION]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    await waitFor(() => expect(baseProps.onError).toHaveBeenCalled());
  });

  it('has no serious accessibility violations', async () => {
    const { container } = render(<NotificationsView {...baseProps} inboxItems={[ACTION]} unreadCount={1} />);
    await expectNoA11yViolations(container);
  });
});
