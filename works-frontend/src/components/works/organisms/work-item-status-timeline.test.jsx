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

// Lead 3d 8h (created → done), Cycle 2d 4h (in progress → done), completed.
const METRICS = {
  durations: DURATIONS,
  leadSeconds: 288000,
  cycleSeconds: 187200,
  completed: true,
  started: true,
};

beforeEach(() => vi.clearAllMocks());

describe('WorkItemStatusTimeline', () => {
  it('fetches and renders lead time, cycle time, and per-status durations', async () => {
    api.send.mockResolvedValue(METRICS);
    render(<WorkItemStatusTimeline workItemId="WRK-1" />);
    expect(await screen.findByText('In Progress')).toBeInTheDocument();
    expect(api.send).toHaveBeenCalledWith('/work-items/WRK-1/status-durations');
    expect(screen.getByText('Lead time')).toBeInTheDocument();
    expect(screen.getByText('Cycle time')).toBeInTheDocument();
    expect(screen.getByText('Total time in workflow')).toBeInTheDocument();
    // '3d 8h' appears as both lead time and total; '2d 4h' as both cycle time and the In Progress segment.
    expect(screen.getAllByText('3d 8h').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('2d 4h').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole('img', { name: /Time in workflow 3d 8h/ })).toBeInTheDocument();
  });

  it('shows "Not started" cycle time and a running lead time when not yet in progress', async () => {
    api.send.mockResolvedValue({
      durations: [{ status: 'Todo', totalSeconds: 3600, timesEntered: 1 }],
      leadSeconds: 3600, cycleSeconds: null, completed: false, started: false,
    });
    render(<WorkItemStatusTimeline workItemId="WRK-2" />);
    expect(await screen.findByText('Not started')).toBeInTheDocument();
    expect(screen.getByText('1h so far')).toBeInTheDocument(); // lead time, running
  });

  it('notes when an item was returned to a status', async () => {
    api.send.mockResolvedValue(METRICS);
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

  it('renders from a controlled metrics prop without fetching', () => {
    render(<WorkItemStatusTimeline metrics={METRICS} />);
    expect(screen.getByText('Lead time')).toBeInTheDocument();
    expect(screen.getByText('Total time in workflow')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(api.send).not.toHaveBeenCalled();
  });

  it('still accepts a bare durations array (legacy controlled mode)', () => {
    render(<WorkItemStatusTimeline durations={DURATIONS} />);
    expect(screen.getByText('Total time in workflow')).toBeInTheDocument();
    expect(screen.queryByText('Lead time')).not.toBeInTheDocument();
    expect(api.send).not.toHaveBeenCalled();
  });
});
