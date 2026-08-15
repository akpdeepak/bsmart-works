import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MessengerView from './messenger-view';
import { internalChatClient } from '@/lib/internalChat';
import { I18nProvider } from '@/lib/i18n';

// Mock the internalChat client and realtime connection
vi.mock('@/lib/internalChat', () => ({
  internalChatClient: {
    listConversations: vi.fn(),
    getConversation: vi.fn(),
    sendMessage: vi.fn(),
    addParticipant: vi.fn(),
    addReaction: vi.fn(),
    summarizeConversation: vi.fn(),
    extractActionItems: vi.fn(),
  },
}));

vi.mock('@/lib/realtime', () => ({
  connectRealtime: vi.fn(() => () => {}),
}));

// Mock layout so we don't need full routing context
vi.mock('@/components/works/templates/page-layout', () => ({
  PageLayout: ({ children, title }) => <div data-testid="page-layout" data-title={title}>{children}</div>,
}));

function renderView(workspaceId = 'ws-1') {
  return render(
    <I18nProvider>
      <MessengerView workspaceId={workspaceId} />
    </I18nProvider>
  );
}

describe('MessengerView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    
    // Default happy path
    internalChatClient.listConversations.mockResolvedValue([]);
    internalChatClient.getConversation.mockResolvedValue({
      conversation: { id: 'c-1', subject: 'Test Thread', type: 'DIRECT' },
      messages: [],
      participants: [],
      pinnedMessages: [],
    });
  });

  it('renders loading skeleton then empty state when no conversations exist', async () => {
    let resolveList;
    internalChatClient.listConversations.mockReturnValue(new Promise((r) => { resolveList = r; }));

    renderView();

    // The AsyncBoundary should be showing a loading spinner initially
    expect(screen.getByTestId('page-layout')).toBeInTheDocument();
    expect(internalChatClient.listConversations).toHaveBeenCalledWith('ws-1');

    // Resolve list empty
    resolveList([]);

    await waitFor(() => {
      expect(screen.getByText('No conversations yet')).toBeInTheDocument();
    });
    // Should show the "select a conversation" empty state in the main pane
    expect(screen.getByText('No conversation selected')).toBeInTheDocument();
  });

  it('renders unauthorized state on 403', async () => {
    internalChatClient.listConversations.mockRejectedValue({ status: 403 });

    renderView();

    await waitFor(() => {
      expect(screen.getByText('Access denied')).toBeInTheDocument();
      expect(screen.getByText("You don't have permission to access Messenger.")).toBeInTheDocument();
    });
  });

  it('renders conversations and loads thread when clicked', async () => {
    const mockConvs = [
      { id: 'c-1', subject: 'Release V2', type: 'RELEASE', createdAt: '2026-08-15T10:00:00Z' },
    ];
    internalChatClient.listConversations.mockResolvedValue(mockConvs);
    internalChatClient.getConversation.mockResolvedValue({
      conversation: mockConvs[0],
      messages: [
        { id: 'm-1', body: 'Hello world', senderType: 'AGENT', senderName: 'Alice', createdAt: '2026-08-15T10:01:00Z' }
      ],
      participants: [],
      pinnedMessages: [],
    });

    renderView();

    // Wait for list to render
    const convBtn = await screen.findByRole('button', { name: /Release V2/ });
    expect(convBtn).toBeInTheDocument();

    // Click conversation
    fireEvent.click(convBtn);

    // Should load thread
    await waitFor(() => {
      expect(internalChatClient.getConversation).toHaveBeenCalledWith('ws-1', 'c-1');
      expect(screen.getAllByText('Release V2').length).toBeGreaterThan(0); // Thread header & sidebar
      expect(screen.getByText('Hello world')).toBeInTheDocument(); // Message bubble
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });
  });

  it('sends a message successfully', async () => {
    const mockConvs = [{ id: 'c-1', subject: 'Thread', type: 'DIRECT' }];
    internalChatClient.listConversations.mockResolvedValue(mockConvs);
    internalChatClient.getConversation.mockResolvedValue({
      conversation: mockConvs[0],
      messages: [],
      participants: [],
      pinnedMessages: [],
    });
    internalChatClient.sendMessage.mockResolvedValue({});

    renderView();
    
    // Load thread
    fireEvent.click(await screen.findByRole('button', { name: /Thread/ }));
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Type a message/)).toBeInTheDocument();
    });

    // Type and send
    const input = screen.getByPlaceholderText(/Type a message/);
    fireEvent.change(input, { target: { value: 'This is a test message' } });
    
    const sendBtn = screen.getByRole('button', { name: 'Send message' });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(internalChatClient.sendMessage).toHaveBeenCalledWith('ws-1', 'c-1', 'This is a test message');
      // Should reload thread after send
      expect(internalChatClient.getConversation).toHaveBeenCalledTimes(2);
    });
  });

  it('shows review-only AI summary and drafts (does not auto-commit)', async () => {
    const mockConvs = [{ id: 'c-1', subject: 'Thread', type: 'DIRECT' }];
    internalChatClient.listConversations.mockResolvedValue(mockConvs);
    internalChatClient.getConversation.mockResolvedValue({
      conversation: mockConvs[0],
      messages: [{ id: 'm-1', body: 'Message', senderType: 'AGENT' }],
      participants: [],
      pinnedMessages: [],
    });
    internalChatClient.summarizeConversation.mockResolvedValue({
      aiAvailable: true,
      summary: 'This is a test summary from AI',
    });
    internalChatClient.extractActionItems.mockResolvedValue({
      aiAvailable: true,
      drafts: [{ title: 'Fix bug', assignee: 'Alice', dueHint: 'Today' }],
      reviewRequired: true, // Must be true per contract
    });

    renderView();

    fireEvent.click(await screen.findByRole('button', { name: /Thread/ }));
    
    // Click summarize
    const sumBtn = await screen.findByRole('button', { name: 'Summarize conversation' });
    fireEvent.click(sumBtn);

    await waitFor(() => {
      expect(screen.getByText('This is a test summary from AI')).toBeInTheDocument();
    });

    // Click extract
    const extractBtn = screen.getByRole('button', { name: 'Extract action items' });
    fireEvent.click(extractBtn);

    await waitFor(() => {
      expect(screen.getByText('Suggested Action Items')).toBeInTheDocument();
      expect(screen.getByText('Fix bug')).toBeInTheDocument();
      expect(screen.getByText('→ Alice')).toBeInTheDocument();
      expect(screen.getByText('(Today)')).toBeInTheDocument();
      // Verifies the review-only gate text is rendered
      expect(screen.getByText('Review required')).toBeInTheDocument();
    });
  });
});
