import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@/lib/apiClient', () => ({ api: { send: vi.fn() } }));
import { api } from '@/lib/apiClient';
import { FollowSpaceButton } from './FollowSpaceButton';

describe('FollowSpaceButton', () => {
  beforeEach(() => { api.send.mockReset(); });

  it('renders with initial not-following state and count', () => {
    render(<FollowSpaceButton spaceId="KS-1" initialFollowing={false} initialCount={4} />);
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('renders with initial following state', () => {
    render(<FollowSpaceButton spaceId="KS-2" initialFollowing={true} initialCount={2} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('clicking toggles to following and calls POST /knowledge-spaces/{id}/follow', async () => {
    api.send.mockResolvedValueOnce({ following: true, followerCount: 1 });
    render(<FollowSpaceButton spaceId="KS-3" initialFollowing={false} initialCount={0} />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true'));
    expect(api.send).toHaveBeenCalledWith('/knowledge-spaces/KS-3/follow', { method: 'POST' });
  });

  it('clicking when following toggles to not-following (optimistic)', async () => {
    api.send.mockResolvedValueOnce({ following: false, followerCount: 0 });
    render(<FollowSpaceButton spaceId="KS-4" initialFollowing={true} initialCount={1} />);

    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(btn);

    await waitFor(() => expect(btn).toHaveAttribute('aria-pressed', 'false'));
  });

  it('reverts optimistic update on API error', async () => {
    api.send.mockRejectedValueOnce(new Error('Network error'));
    render(<FollowSpaceButton spaceId="KS-5" initialFollowing={false} initialCount={0} />);

    const btn = screen.getByRole('button');
    fireEvent.click(btn);
    // Optimistically switched to following
    await waitFor(() => expect(btn).toHaveAttribute('aria-pressed', 'true'));
    // After error, reverts back
    await waitFor(() => expect(btn).toHaveAttribute('aria-pressed', 'false'));
  });
});
