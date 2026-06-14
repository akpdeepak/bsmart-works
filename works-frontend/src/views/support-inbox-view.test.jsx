import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

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

// connectRealtime is a no-op in tests — the inbox SSE subscription is integration-tested
// separately; here we only verify the view's data-fetch and interaction behaviour.
vi.mock('@/lib/realtime', () => ({ connectRealtime: () => () => {} }));

import SupportInboxView from './support-inbox-view';

describe('SupportInboxView', () => {
  beforeEach(() => {
    listConversations.mockReset();
    getConversation.mockReset();
    assign.mockReset();
    reply.mockReset();
    resolve.mockReset();
  });

  it('renders the conversation list from the client', async () => {
    listConversations.mockResolvedValue([
      { id: 'CHAT-1', subject: 'Billing question', status: 'ESCALATED', customerName: 'Asha' },
    ]);
    render(<SupportInboxView workspaceId="ws-1" />);
    expect(await screen.findByText('Billing question')).toBeInTheDocument();
    expect(listConversations).toHaveBeenCalledWith('ws-1', 'ESCALATED');
  });

  it('shows the empty state when there are no conversations', async () => {
    listConversations.mockResolvedValue([]);
    render(<SupportInboxView workspaceId="ws-1" />);
    expect(await screen.findByText('No conversations')).toBeInTheDocument();
  });

  it('opens a thread and lets an agent reply', async () => {
    listConversations.mockResolvedValue([
      { id: 'CHAT-1', subject: 'Billing question', status: 'ESCALATED', customerName: 'Asha' },
    ]);
    getConversation.mockResolvedValue({
      conversation: { id: 'CHAT-1', subject: 'Billing question', status: 'ESCALATED', customerName: 'Asha' },
      messages: [{ id: 'm1', senderType: 'CUSTOMER', body: 'my bill is wrong' }],
    });
    reply.mockResolvedValue({});
    render(<SupportInboxView workspaceId="ws-1" />);

    fireEvent.click(await screen.findByText('Billing question'));
    expect(await screen.findByText('my bill is wrong')).toBeInTheDocument();

    const input = screen.getByLabelText('Reply to customer');
    fireEvent.change(input, { target: { value: 'Looking into it now.' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(reply).toHaveBeenCalledWith('ws-1', 'CHAT-1', 'Looking into it now.'));
  });

  it('resolves the active conversation', async () => {
    listConversations.mockResolvedValue([
      { id: 'CHAT-1', subject: 'Billing question', status: 'ESCALATED', customerName: 'Asha' },
    ]);
    getConversation.mockResolvedValue({
      conversation: { id: 'CHAT-1', subject: 'Billing question', status: 'ESCALATED', customerName: 'Asha' },
      messages: [],
    });
    resolve.mockResolvedValue({});
    render(<SupportInboxView workspaceId="ws-1" />);
    fireEvent.click(await screen.findByText('Billing question'));
    // Wait for the thread pane to open, then click the exact "Resolve" action button
    // (name: 'Resolve' excludes the "Resolved" status-filter chip).
    expect(await screen.findByText('No messages yet.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Resolve' }));
    await waitFor(() => expect(resolve).toHaveBeenCalledWith('ws-1', 'CHAT-1'));
  });

  it('surfaces a load error', async () => {
    listConversations.mockRejectedValue(new Error('boom'));
    render(<SupportInboxView workspaceId="ws-1" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('boom');
  });
});
