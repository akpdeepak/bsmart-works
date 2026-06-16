import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ArticleTags } from './ArticleTags';
import * as apiClient from '@/lib/apiClient';

vi.mock('@/lib/apiClient', () => ({ api: { send: vi.fn() } }));

beforeEach(() => { vi.clearAllMocks(); apiClient.api.send.mockResolvedValue([]); });

describe('ArticleTags (KR-034)', () => {
  it('renders nothing when no tags', async () => {
    render(<ArticleTags articleId="A1" workspaceId="WS1" />);
    await waitFor(() => {
      expect(screen.getByRole('group', { name: /article tags/i })).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /remove tag/i })).toBeNull();
  });

  it('shows tags from API', async () => {
    const tags = [{ id: 't1', name: 'urgent', color: 'bg-semantic-danger/20 text-semantic-danger' }];
    apiClient.api.send.mockImplementation(url => {
      if (url.includes('/tags?')) return Promise.resolve(tags);
      return Promise.resolve([]);
    });
    render(<ArticleTags articleId="A1" workspaceId="WS1" />);
    await waitFor(() => expect(screen.getByText('urgent')).toBeInTheDocument());
  });

  it('shows Add tag button in edit mode', async () => {
    render(<ArticleTags articleId="A1" workspaceId="WS1" readOnly={false} />);
    await waitFor(() => expect(screen.getByRole('button', { name: /add tag/i })).toBeInTheDocument());
  });

  it('hides Add tag button in read-only mode', async () => {
    render(<ArticleTags articleId="A1" workspaceId="WS1" readOnly={true} />);
    await waitFor(() => expect(screen.queryByRole('button', { name: /add tag/i })).toBeNull());
  });
});
