import { render, waitFor, screen } from '@testing-library/react';
import { expect, it, vi, beforeEach } from 'vitest';
import { expectNoA11yViolations } from '@/test/a11y';
import MessengerView from './messenger-view';
import { internalChatClient } from '@/lib/internalChat';
import { I18nProvider } from '@/lib/i18n';

vi.mock('@/lib/internalChat', () => ({
  internalChatClient: {
    listConversations: vi.fn(),
    getConversation: vi.fn(),
  },
}));

vi.mock('@/lib/realtime', () => ({
  connectRealtime: vi.fn(() => () => {}),
}));

vi.mock('@/components/works/templates/page-layout', () => ({
  PageLayout: ({ children }) => <div>{children}</div>,
}));

function renderView() {
  return render(
    <I18nProvider>
      <MessengerView workspaceId="ws-1" />
    </I18nProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

it('has no a11y violations in empty state (no conversations)', async () => {
  internalChatClient.listConversations.mockResolvedValue([]);
  const { container } = renderView();
  
  await waitFor(() => {
    expect(screen.getByText('No conversations yet')).toBeInTheDocument();
  });
  
  await expectNoA11yViolations(container);
});

it('has no a11y violations in thread view with messages and AI panel', async () => {
  internalChatClient.listConversations.mockResolvedValue([
    { id: 'c-1', subject: 'Project Alpha', type: 'PROJECT', createdAt: '2026-01-01T10:00:00Z' }
  ]);
  internalChatClient.getConversation.mockResolvedValue({
    conversation: { id: 'c-1', subject: 'Project Alpha', type: 'PROJECT' },
    messages: [
      { id: 'm-1', body: 'Hello', senderType: 'AGENT', senderName: 'Alice', createdAt: '2026-01-01T10:05:00Z' },
    ],
    participants: [
      { id: 'p-1', userId: 'u-1', role: 'MEMBER' }
    ],
    pinnedMessages: [],
  });

  const { container } = renderView();

  // Wait for list to load, click conversation
  const convBtn = await screen.findByRole('button', { name: /Project Alpha/ });
  convBtn.click();

  // Wait for thread to load
  await waitFor(() => {
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  // Verify full UI a11y
  await expectNoA11yViolations(container);
});
