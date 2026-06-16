import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ArticleReactions } from './ArticleReactions';
import * as apiClient from '@/lib/apiClient';

vi.mock('@/lib/apiClient', () => ({ api: { send: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
  apiClient.api.send.mockResolvedValue([]);
});

describe('ArticleReactions (KR-029)', () => {
  it('renders the default emoji buttons', async () => {
    render(<ArticleReactions articleId="A1" workspaceId="WS1" currentUserId="U1" />);
    await waitFor(() =>
      expect(screen.getByRole('group', { name: /reactions/i })).toBeInTheDocument()
    );
    expect(screen.getByRole('button', { name: /React with 👍/i })).toBeInTheDocument();
  });

  it('shows count when reactions exist', async () => {
    apiClient.api.send.mockResolvedValue([
      { id: '1', emoji: '👍', userId: 'U2', articleId: 'A1', workspaceId: 'WS1' },
    ]);
    render(<ArticleReactions articleId="A1" workspaceId="WS1" currentUserId="U1" />);
    await waitFor(() => expect(screen.getByText('1')).toBeInTheDocument());
  });

  it('marks my reaction as pressed', async () => {
    apiClient.api.send.mockResolvedValue([
      { id: '1', emoji: '👍', userId: 'U1', articleId: 'A1', workspaceId: 'WS1' },
    ]);
    render(<ArticleReactions articleId="A1" workspaceId="WS1" currentUserId="U1" />);
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /React with 👍/i });
      expect(btn).toHaveAttribute('aria-pressed', 'true');
    });
  });

  it('does not fetch when articleId is missing', () => {
    render(<ArticleReactions articleId={null} workspaceId="WS1" currentUserId="U1" />);
    expect(apiClient.api.send).not.toHaveBeenCalled();
  });
});
