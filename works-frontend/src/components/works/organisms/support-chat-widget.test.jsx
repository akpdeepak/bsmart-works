import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

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
    // Default: reject so the localStorage resume effect does not crash when a previous test left
    // an id in storage. Individual tests override this when they need a resolved value.
    getConversation.mockRejectedValue(new Error('no conversation'));
    // Clear the persisted conversation id so the mount effect does not cross-contaminate tests.
    localStorage.clear();
    if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
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

  it('calls getConversation on the poll interval while the panel is open', async () => {
    // Intercept setInterval to capture the poll callback; call it manually so this test is
    // deterministic without real clock delays. Real timers are active so waitFor/findBy work.
    let pollCallback = null;
    const intervalSpy = vi.spyOn(window, 'setInterval').mockImplementation((fn) => {
      pollCallback = fn;
      return 999; // fake interval id
    });
    vi.spyOn(window, 'clearInterval').mockImplementation(() => {});

    start.mockResolvedValue({
      conversation: { id: 'CHAT-99', status: 'ESCALATED' },
      messages: [{ id: 'm1', senderType: 'AI', body: 'Connecting you with an agent.' }],
    });
    getConversation.mockResolvedValue({
      conversation: { id: 'CHAT-99', status: 'ESCALATED' },
      messages: [
        { id: 'm1', senderType: 'AI', body: 'Connecting you with an agent.' },
        { id: 'm2', senderType: 'AGENT', body: 'Hi, I am reviewing your case.' },
      ],
    });

    render(<SupportChatWidget {...baseProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open support chat' }));
    const input = screen.getByLabelText('Type your message');
    fireEvent.change(input, { target: { value: 'I want a human' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    // Wait for the start() round-trip to settle, which stores the conversation id and triggers
    // the polling useEffect so pollCallback is set.
    await waitFor(() => expect(start).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(pollCallback).not.toBeNull());

    // Fire the poll callback directly (simulates one interval tick).
    await act(async () => { pollCallback(); });

    await waitFor(() => expect(getConversation).toHaveBeenCalledWith('CHAT-99'));
    expect(await screen.findByText('Hi, I am reviewing your case.')).toBeInTheDocument();

    intervalSpy.mockRestore();
  });
});
