import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { WorkItemStatusTimeline } from './work-item-status-timeline';
import { api } from '@/lib/apiClient';

vi.mock('@/lib/apiClient', () => ({ api: { send: vi.fn() } }));

// 4h Todo, 2d 4h In Progress (reopened once), 1d Done  → total 3d 8h.
const DURATIONS = [
  { status: 'Todo', totalSeconds: 14400, timesEntered: 1 },
  { status: 'In Progress', totalSeconds: 187200, timesEntered: 2 },
  { status: 'Done', totalSeconds: 86400, timesEntered: 1 },
];

beforeEach(() => vi.clearAllMocks());

describe('WorkItemStatusTimeline', () => {
  it('renders per-status durations and the total cycle time', async () => {
    api.send.mockResolvedValue(DURATIONS);
    render(<WorkItemStatusTimeline workItemId="WRK-1" />);
    expect(await screen.findByText('In Progress')).toBeInTheDocument();
    expect(api.send).toHaveBeenCalledWith('/work-items/WRK-1/status-durations');
    expect(screen.getByText('Total cycle time')).toBeInTheDocument();
    expect(screen.getByText('3d 8h')).toBeInTheDocument(); // total
    expect(screen.getByText('2d 4h')).toBeInTheDocument(); // In Progress segment
    // bar exposes an accessible cycle-time summary
    expect(screen.getByRole('img', { name: /Total cycle time 3d 8h/ })).toBeInTheDocument();
  });

  it('notes when an item was returned to a status', async () => {
    api.send.mockResolvedValue(DURATIONS);
    render(<WorkItemStatusTimeline workItemId="WRK-1" />);
    expect(await screen.findByText(/Returned to In Progress 1 time/)).toBeInTheDocument();
  });

  it('shows an empty state when there is no status history', async () => {
    api.send.mockResolvedValue([]);
    render(<WorkItemStatusTimeline workItemId="WRK-1" />);
    expect(await screen.findByText(/No status history yet/)).toBeInTheDocument();
  });

  it('shows an error state when the request fails', async () => {
    api.send.mockRejectedValue(new Error('boom'));
    render(<WorkItemStatusTimeline workItemId="WRK-1" />);
    await waitFor(() => expect(screen.getByText('boom')).toBeInTheDocument());
  });

  it('renders from a controlled durations prop without fetching', () => {
    render(<WorkItemStatusTimeline durations={DURATIONS} />);
    expect(screen.getByText('Total cycle time')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(api.send).not.toHaveBeenCalled();
  });
});
