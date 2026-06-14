import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@/lib/apiClient', () => ({ api: { send: vi.fn() } }));
import { api } from '@/lib/apiClient';
import { WatchButton } from './watch-button';

describe('WatchButton', () => {
  beforeEach(() => { api.send.mockReset(); });

  it('starts not-watching and toggles to watching on click', async () => {
    api.send.mockResolvedValueOnce({ watching: false, watchers: [] }); // initial GET
    render(<WatchButton itemId="WI-1" />);
    const btn = await screen.findByRole('button');
    await waitFor(() => expect(btn).toHaveAttribute('aria-pressed', 'false'));

    api.send.mockResolvedValueOnce({ watching: true, watchers: 1 }); // POST toggle
    fireEvent.click(btn);
    await waitFor(() => expect(btn).toHaveAttribute('aria-pressed', 'true'));
    expect(api.send).toHaveBeenLastCalledWith('/work-items/WI-1/watch', { method: 'POST' });
  });

  it('shows the watching state and watcher count on mount', async () => {
    api.send.mockResolvedValueOnce({ watching: true, watchers: ['u1', 'u2'] });
    render(<WatchButton itemId="WI-2" />);
    await waitFor(() => expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true'));
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('unwatches with a DELETE when already watching', async () => {
    api.send.mockResolvedValueOnce({ watching: true, watchers: ['u1'] });
    render(<WatchButton itemId="WI-3" />);
    const btn = await screen.findByRole('button');
    await waitFor(() => expect(btn).toHaveAttribute('aria-pressed', 'true'));

    api.send.mockResolvedValueOnce({ watching: false, watchers: 0 });
    fireEvent.click(btn);
    await waitFor(() => expect(btn).toHaveAttribute('aria-pressed', 'false'));
    expect(api.send).toHaveBeenLastCalledWith('/work-items/WI-3/watch', { method: 'DELETE' });
  });
});
