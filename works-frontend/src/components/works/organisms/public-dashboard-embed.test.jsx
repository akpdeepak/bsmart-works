import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { PublicDashboardEmbed } from './public-dashboard-embed';
import { api } from '@/lib/apiClient';

// Mock the single apiClient surface (RB-10 §1 — one HTTP path). The component fetches the
// token-scoped public endpoint; we drive its three states through this mock.
vi.mock('@/lib/apiClient', () => ({ api: { raw: vi.fn() } }));

function mockResponse(body, ok = true) {
  return Promise.resolve({ ok, json: () => Promise.resolve(body) });
}

const SAMPLE = {
  name: 'Customer Status',
  layoutCols: 12,
  widgets: [
    { id: 1, widgetType: 'SCORECARD', title: 'Open items', config: '{"filter":{"open":true}}', gridW: 3 },
    { id: 2, widgetType: 'STATUS_BAR', title: 'By status', config: '{}', gridW: 6 },
    { id: 3, widgetType: 'PIVOT', title: 'Custom chart', config: '{"spec":{"chartType":"bar","sourceKind":"guided","measures":[{"field":"*","agg":"COUNT"}],"dimensions":["status"]}}', gridW: 6 },
  ],
  // The server pre-resolves PIVOT widgets (workspace from the token) and ships them keyed by id, so
  // the embed renders them without an authenticated workspace context (the public-embed PIVOT gap).
  pivots: { 3: { dimensions: ['status'], measures: ['count_all'], rows: [{ status: 'Open', count_all: 7 }] } },
  aggregate: { scope: 'ORG', total: 12, byStatus: [{ label: 'Open', value: 12 }], byType: [], byPriority: [], recent: [] },
};

describe('PublicDashboardEmbed', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches the token-scoped public endpoint and renders the widgets', async () => {
    api.raw.mockReturnValue(mockResponse(SAMPLE));

    render(<PublicDashboardEmbed token="abc123" />);

    await waitFor(() => expect(api.raw).toHaveBeenCalledWith('/public/dashboards/abc123'));
    // Both widget titles render from the mocked token response.
    expect(await screen.findByText('Open items')).toBeInTheDocument();
    expect(screen.getByText('By status')).toBeInTheDocument();
    // The shareable (non-embedded) surface shows its read-only header + the dashboard name.
    expect(screen.getByText('Customer Status')).toBeInTheDocument();
    expect(screen.getByText(/read-only/i)).toBeInTheDocument();
  });

  it('renders a PIVOT widget from the server-resolved pivots — no "no workspace" error (embed gap fix)', async () => {
    api.raw.mockReturnValue(mockResponse(SAMPLE));

    render(<PublicDashboardEmbed token="abc123" embedded />);

    expect(await screen.findByText('Custom chart')).toBeInTheDocument();
    // The pre-resolved bar chart renders its status row from data.pivots[3] — assert on the chart's
    // own text-alternative label (the SCORECARD also contains "Open", so scope to the bar chart).
    expect(await screen.findByLabelText(/bar chart: open 7/i)).toBeInTheDocument();
    // …and never falls back to the "no workspace selected" error the embed previously hit.
    expect(screen.queryByText(/no workspace/i)).not.toBeInTheDocument();
  });

  it('renders chrome-less when embedded — no header chrome, name only for screen readers', async () => {
    api.raw.mockReturnValue(mockResponse(SAMPLE));

    render(<PublicDashboardEmbed token="abc123" embedded />);

    await waitFor(() => expect(api.raw).toHaveBeenCalled());
    // Widgets still render…
    expect(await screen.findByText('Open items')).toBeInTheDocument();
    // …but the visible "Read-only" chrome badge is gone (embedded host owns the frame).
    expect(screen.queryByText(/read-only badge/i)).not.toBeInTheDocument();
    // The name survives as an accessible heading for screen readers.
    expect(screen.getByRole('heading', { name: /customer status — read-only dashboard/i })).toBeInTheDocument();
  });

  it('shows the error state for an invalid / revoked token', async () => {
    api.raw.mockReturnValue(mockResponse({}, false));

    render(<PublicDashboardEmbed token="revoked" />);

    expect(await screen.findByText(/dashboard unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/invalid or has been revoked/i)).toBeInTheDocument();
  });

  it('shows the empty state when the dashboard has no widgets', async () => {
    api.raw.mockReturnValue(mockResponse({ ...SAMPLE, widgets: [] }));

    render(<PublicDashboardEmbed token="abc123" />);

    expect(await screen.findByText(/this dashboard has no widgets/i)).toBeInTheDocument();
  });
});
