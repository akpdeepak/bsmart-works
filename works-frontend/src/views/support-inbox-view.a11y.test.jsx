import { describe, it, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { expectNoA11yViolations } from '@/test/a11y';

// Support inbox (agent side) fetches conversations via agentChatClient. We mock the client so the
// list + the open-thread two-pane layout (with reply box and resolve/assign actions) render, then
// sweep for serious/critical a11y violations.

const { listConversations, getConversation, assign, reply, resolve } = vi.hoisted(() => ({
  listConversations: vi.fn(),
  getConversation: vi.fn(),
  assign: vi.fn(),
  reply: vi.fn(),
  resolve: vi.fn(),
}));

vi.mock('@/lib/supportChat', () => ({
  agentChatClient: { listConversations, getConversation, assign, reply, resolve },
  chatStatusTone: () => 'warning',
  chatStatusLabel: (s) => s || 'Open',
}));
vi.mock('@/lib/format', () => ({ smartDate: () => 'just now' }));

import SupportInboxView from './support-inbox-view';

const CONVERSATIONS = [
  { id: 'CHAT-1', subject: 'Billing question', status: 'ESCALATED', customerName: 'Asha', lastMessageAt: '2026-06-12T10:00:00Z' },
];
const THREAD = {
  conversation: { id: 'CHAT-1', subject: 'Billing question', status: 'ESCALATED', customerName: 'Asha' },
  messages: [
    { id: 'm1', senderType: 'CUSTOMER', body: 'My bill is wrong' },
    { id: 'm2', senderType: 'AI', body: 'Let me check that.' },
    { id: 'm3', senderType: 'AGENT', body: 'Looking into it now.' },
  ],
};

describe('SupportInboxView a11y', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('conversation list (populated) has no serious/critical violations', async () => {
    listConversations.mockResolvedValue(CONVERSATIONS);
    const { container } = render(<SupportInboxView workspaceId="ws-1" />);
    await screen.findByText('Billing question');
    await expectNoA11yViolations(container);
  });

  it('empty conversation list has no serious/critical violations', async () => {
    listConversations.mockResolvedValue([]);
    const { container } = render(<SupportInboxView workspaceId="ws-1" />);
    await screen.findByText('No conversations');
    await expectNoA11yViolations(container);
  });

  it('open thread (reply box + actions) has no serious/critical violations', async () => {
    listConversations.mockResolvedValue(CONVERSATIONS);
    getConversation.mockResolvedValue(THREAD);
    const { container } = render(<SupportInboxView workspaceId="ws-1" />);
    fireEvent.click(await screen.findByText('Billing question'));
    await screen.findByText('My bill is wrong');
    await expectNoA11yViolations(container);
  });

  it('load error state has no serious/critical violations', async () => {
    listConversations.mockRejectedValue(new Error('boom'));
    const { container } = render(<SupportInboxView workspaceId="ws-1" />);
    await screen.findByRole('alert');
    await expectNoA11yViolations(container);
  });
});
