import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { StarButton } from './StarButton';
import * as apiClient from '@/lib/apiClient';

vi.mock('@/lib/apiClient', () => ({ api: { send: vi.fn() } }));

beforeEach(() => { vi.clearAllMocks(); });

describe('StarButton (KR-035)', () => {
  it('shows as unstarred when article not favorited', async () => {
    apiClient.api.send.mockRejectedValue(new Error('404'));
    render(<StarButton articleId="A1" workspaceId="WS1" />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /star article/i })).toHaveAttribute('aria-pressed', 'false');
    });
  });

  it('shows as starred when article is favorited', async () => {
    apiClient.api.send.mockResolvedValue(['A1']);
    render(<StarButton articleId="A1" workspaceId="WS1" />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /unstar article/i })).toHaveAttribute('aria-pressed', 'true');
    });
  });
});
