import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/apiClient', () => ({ api: { send: vi.fn() } }));
vi.mock('@/components/BlockRenderer', () => ({
  BlockRenderer: () => <div data-testid="blocks" />,
}));

import { api } from '@/lib/apiClient';
import PublicArticleView from './public-article-view';

// Covers the three unresolved states after the AsyncBoundary rollout (GH-537). The point of the
// conversion is that this route's loading/error treatment is the shared one rather than a bespoke
// pair of full-screen blocks, so these assert the AsyncBoundary contract: an aria-busy skeleton
// while in flight, and the canonical error panel afterwards.
describe('PublicArticleView async states', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders an aria-busy skeleton while the article is loading', () => {
    api.send.mockReturnValue(new Promise(() => {}));

    render(<PublicArticleView token="abc" />);

    const busy = screen.getByLabelText('Loading article');
    expect(busy).toHaveAttribute('aria-busy', 'true');
  });

  it('renders the shared error panel when the token is rejected', async () => {
    api.send.mockRejectedValue(new Error('nope'));

    render(<PublicArticleView token="abc" />);

    expect(await screen.findByText('Article not found')).toBeInTheDocument();
    expect(
      await screen.findByText('This link is invalid or the article is no longer available.'),
    ).toBeInTheDocument();
  });

  it('reports a missing share token through the same error panel', async () => {
    render(<PublicArticleView token="" />);

    expect(await screen.findByText('Article not found')).toBeInTheDocument();
    expect(await screen.findByText('No share token.')).toBeInTheDocument();
    expect(api.send).not.toHaveBeenCalled();
  });

  it('renders the article once resolved', async () => {
    api.send.mockResolvedValue({ title: 'Runbook', contentBlocks: '[{"type":"p"}]' });

    render(<PublicArticleView token="abc" />);

    expect(await screen.findByRole('heading', { name: 'Runbook' })).toBeInTheDocument();
    expect(screen.getByTestId('blocks')).toBeInTheDocument();
  });
});
