import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock the chat client module: portalChatClient(token) returns an object of async methods, and the
// status helpers are kept real-ish so the badge/banner render predictably.
const start = vi.fn();
const postMessage = vi.fn();
const getConversation = vi.fn();

vi.mock('@/lib/supportChat', () => ({
  portalChatClient: () => ({ start, postMessage, getConversation }),
  chatStatusTone: () => 'info',
  chatStatusLabel: (s) => s || 'Open',
}));

import { SupportChatWidget } from './support-chat-widget';

const baseProps = { token: 'cust-token', workspaceId: 'ws-1', accountId: 'ACC-1', customerName: 'Asha' };

describe('SupportChatWidget', () => {
  beforeEach(() => {
    start.mockReset();
    postMessage.mockReset();
    getConversation.mockReset();
    if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};
  });

  it('shows only a launcher button until opened', () => {
    render(<SupportChatWidget {...baseProps} />);
    expect(screen.getByRole('button', { name: 'Open support chat' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the panel with an empty state and focuses the input', () => {
    render(<SupportChatWidget {...baseProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open support chat' }));
    expect(screen.getByRole('dialog', { name: 'Support chat' })).toBeInTheDocument();
    expect(screen.getByText('How can we help?')).toBeInTheDocument();
    expect(screen.getByLabelText('Type your message')).toHaveFocus();
  });

  it('starts a conversation and renders the AI tier-1 reply', async () => {
    start.mockResolvedValue({
      conversation: { id: 'CHAT-1', status: 'AI_HANDLED' },
      messages: [
        { id: 'm1', senderType: 'CUSTOMER', body: 'my bill is wrong' },
        { id: 'm2', senderType: 'AI', body: 'For billing questions, open Billing > Statements.' },
      ],
    });
    render(<SupportChatWidget {...baseProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open support chat' }));
    const input = screen.getByLabelText('Type your message');
    fireEvent.change(input, { target: { value: 'my bill is wrong' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => expect(start).toHaveBeenCalledWith('my bill is wrong',
      { customerName: 'Asha', subject: null }));
    expect(await screen.findByText(/For billing questions/)).toBeInTheDocument();
  });

  it('posts to an existing conversation on the second message', async () => {
    start.mockResolvedValue({
      conversation: { id: 'CHAT-1', status: 'AI_HANDLED' },
      messages: [{ id: 'm1', senderType: 'AI', body: 'first answer' }],
    });
    postMessage.mockResolvedValue({
      conversation: { id: 'CHAT-1', status: 'AI_HANDLED' },
      messages: [{ id: 'm2', senderType: 'AI', body: 'second answer' }],
    });
    render(<SupportChatWidget {...baseProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open support chat' }));
    const input = screen.getByLabelText('Type your message');

    fireEvent.change(input, { target: { value: 'hello' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await screen.findByText('first answer');

    fireEvent.change(input, { target: { value: 'follow up' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(postMessage).toHaveBeenCalledWith('CHAT-1', 'follow up'));
  });

  it('shows the escalation banner when the conversation is ESCALATED', async () => {
    start.mockResolvedValue({
      conversation: { id: 'CHAT-1', status: 'ESCALATED' },
      messages: [{ id: 'm1', senderType: 'AI', body: 'Connecting you with an agent.' }],
    });
    render(<SupportChatWidget {...baseProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open support chat' }));
    const input = screen.getByLabelText('Type your message');
    fireEvent.change(input, { target: { value: 'I want a human' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(await screen.findByText(/agent has been notified/)).toBeInTheDocument();
  });

  it('surfaces an error and keeps the typed text for retry', async () => {
    start.mockRejectedValue(new Error('Network down'));
    render(<SupportChatWidget {...baseProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open support chat' }));
    const input = screen.getByLabelText('Type your message');
    fireEvent.change(input, { target: { value: 'help' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(await screen.findByRole('alert')).toHaveTextContent('Network down');
    expect(input).toHaveValue('help');
  });

  it('prefills a human-agent request from the Talk to a human action', () => {
    render(<SupportChatWidget {...baseProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open support chat' }));
    fireEvent.click(screen.getByRole('button', { name: 'Talk to a human' }));
    expect(screen.getByLabelText('Type your message')).toHaveValue('I would like to talk to a human agent.');
  });
});
