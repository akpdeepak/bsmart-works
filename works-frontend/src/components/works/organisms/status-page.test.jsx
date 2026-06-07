import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { StatusPage } from './status-page';
import { api } from '@/lib/apiClient';

vi.mock('@/lib/apiClient', () => ({ api: { send: vi.fn() } }));

beforeEach(() => vi.clearAllMocks());

describe('StatusPage', () => {
  it('renders component health when operational', async () => {
    api.send.mockResolvedValue({
      status: 'operational',
      version: '18.0',
      checkedAt: '2026-06-07T10:00:00Z',
      components: [
        { name: 'API', up: true, detail: 'responding' },
        { name: 'Database', up: true, detail: 'reachable' },
      ],
    });
    render(<StatusPage />);
    expect(await screen.findByText(/all systems operational/i)).toBeInTheDocument();
    expect(screen.getByText('API')).toBeInTheDocument();
    expect(screen.getAllByText('Operational').length).toBeGreaterThan(0);
  });

  it('shows a degraded banner when a component is down', async () => {
    api.send.mockResolvedValue({
      status: 'degraded',
      version: '18.0',
      checkedAt: '2026-06-07T10:00:00Z',
      components: [{ name: 'Database', up: false, detail: 'unreachable' }],
    });
    render(<StatusPage />);
    expect(await screen.findByText(/some systems degraded/i)).toBeInTheDocument();
    expect(screen.getByText('Down')).toBeInTheDocument();
  });

  it('shows an error state when the request fails', async () => {
    api.send.mockRejectedValue(new Error('boom'));
    render(<StatusPage />);
    await waitFor(() => expect(screen.getByText(/couldn’t load system status/i)).toBeInTheDocument());
  });
});
