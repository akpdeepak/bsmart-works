import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BlockCommentsPanel } from './BlockCommentsPanel';
import * as apiClient from '@/lib/apiClient';

vi.mock('@/lib/apiClient', () => ({
  api: { send: vi.fn() },
}));

const ROOT = {
  id: 'ABC-001', articleId: 'ART-001', blockId: 'blk-1',
  workspaceId: 'WS-001', authorId: 'user-1',
  content: 'First comment', resolved: false, parentId: null,
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
};
const REPLY = {
  id: 'ABC-002', articleId: 'ART-001', blockId: 'blk-1',
  workspaceId: 'WS-001', authorId: 'user-2',
  content: 'Reply to first', resolved: false, parentId: 'ABC-001',
  createdAt: '2026-01-02T00:00:00Z', updatedAt: '2026-01-02T00:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

// URL-routing mock: MentionPicker fetches /members on mount (child effect fires before parent),
// so we discriminate by URL rather than relying on call order.
function mockSend(comments = [ROOT, REPLY]) {
  apiClient.api.send.mockImplementation((url, opts) => {
    if (url.includes('/block-comments') && (!opts || opts.method !== 'DELETE')) {
      // POST returns the new comment object; GET returns the array.
      if (opts?.method === 'POST') return Promise.resolve({ ...ROOT, id: 'NEW', content: opts.body?.content ?? '' });
      return Promise.resolve(comments);
    }
    return Promise.resolve([]); // /members and anything else
  });
}

function renderPanel(overrides = {}) {
  mockSend();
  return render(
    <BlockCommentsPanel
      articleId="ART-001"
      blockId="blk-1"
      workspaceId="WS-001"
      currentUserId="user-1"
      open
      onClose={vi.fn()}
      {...overrides}
    />
  );
}

describe('BlockCommentsPanel (KR-025, KR-027)', () => {
  it('renders nothing when open=false', () => {
    const { container } = render(
      <BlockCommentsPanel articleId="ART-001" blockId="blk-1" workspaceId="WS-001"
        currentUserId="user-1" open={false} onClose={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders comment content after fetch', async () => {
    renderPanel();
    await waitFor(() => {
      expect(screen.getByText('First comment')).toBeTruthy();
    });
  });

  it('renders a reply indented under its root comment', async () => {
    renderPanel();
    await waitFor(() => {
      expect(screen.getByText('Reply to first')).toBeTruthy();
    });
  });

  it('shows the "Post comment" button', async () => {
    renderPanel();
    await waitFor(() => screen.getByText('First comment'));
    expect(screen.getByRole('button', { name: /post comment/i })).toBeTruthy();
  });

  it('shows the close button and calls onClose', async () => {
    const onClose = vi.fn();
    renderPanel({ onClose });
    await waitFor(() => screen.getByText('First comment'));
    fireEvent.click(screen.getByRole('button', { name: /close comments panel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('posts a new comment on button click', async () => {
    mockSend();
    render(<BlockCommentsPanel articleId="ART-001" blockId="blk-1" workspaceId="WS-001"
      currentUserId="user-1" open onClose={vi.fn()} />);
    await waitFor(() => screen.getByText('First comment'));
    fireEvent.change(screen.getByRole('textbox', { name: /new comment/i }), { target: { value: 'New comment' } });
    fireEvent.click(screen.getByRole('button', { name: /post comment/i }));
    await waitFor(() => expect(apiClient.api.send).toHaveBeenCalledWith(
      '/articles/ART-001/block-comments',
      expect.objectContaining({ method: 'POST', body: expect.objectContaining({ content: 'New comment' }) })
    ));
  });

  it('restores an unsent comment draft for the same article and block', async () => {
    localStorage.setItem('know_comment_draft:ART-001:blk-1:user-1:new', 'Draft survives refresh');
    renderPanel();
    await waitFor(() => screen.getByText('First comment'));
    expect(screen.getByRole('textbox', { name: /new comment/i }).value).toBe('Draft survives refresh');
  });

  it('shows Resolve button for unresolved comments', async () => {
    renderPanel();
    await waitFor(() => screen.getByText('First comment'));
    expect(screen.getAllByRole('button', { name: /resolve comment/i }).length).toBeGreaterThan(0);
  });

  it('shows empty state when no comments', async () => {
    mockSend([]);
    render(<BlockCommentsPanel articleId="ART-001" blockId="blk-1" workspaceId="WS-001"
      currentUserId="user-1" open onClose={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText(/no comments yet/i)).toBeTruthy();
    });
  });
});
