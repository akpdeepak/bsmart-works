import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@/lib/apiClient', () => ({ api: { send: vi.fn() } }));
import { api } from '@/lib/apiClient';
import { WatchButton } from './WatchButton';

describe('WatchButton', () => {
  beforeEach(() => { api.send.mockReset(); });

  it('renders with initial not-watching state and count', () => {
    render(<WatchButton articleId="ART-1" initialWatching={false} initialCount={3} />);
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders with initial watching state', () => {
    render(<WatchButton articleId="ART-2" initialWatching={true} initialCount={5} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('clicking toggles to watching and calls POST /articles/{id}/watch', async () => {
    api.send.mockResolvedValueOnce({ watching: true, watcherCount: 1 });
    render(<WatchButton articleId="ART-3" initialWatching={false} initialCount={0} />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true'));
    expect(api.send).toHaveBeenCalledWith('/articles/ART-3/watch', { method: 'POST' });
  });

  it('clicking when watching toggles to not-watching (optimistic)', async () => {
    api.send.mockResolvedValueOnce({ watching: false, watcherCount: 0 });
    render(<WatchButton articleId="ART-4" initialWatching={true} initialCount={1} />);

    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(btn);

    await waitFor(() => expect(btn).toHaveAttribute('aria-pressed', 'false'));
    expect(api.send).toHaveBeenCalledWith('/articles/ART-4/watch', { method: 'POST' });
  });

  it('reverts optimistic update on API error', async () => {
    api.send.mockRejectedValueOnce(new Error('Network error'));
    render(<WatchButton articleId="ART-5" initialWatching={false} initialCount={2} />);

    const btn = screen.getByRole('button');
    fireEvent.click(btn);
    // Optimistically switched to watching
    await waitFor(() => expect(btn).toHaveAttribute('aria-pressed', 'true'));
    // After error, reverts back
    await waitFor(() => expect(btn).toHaveAttribute('aria-pressed', 'false'));
  });
});
