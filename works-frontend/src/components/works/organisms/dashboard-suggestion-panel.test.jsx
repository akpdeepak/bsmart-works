import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DashboardSuggestionPanel } from './dashboard-suggestion-panel';
import { aiClient } from '@/lib/ai';

vi.mock('@/lib/ai', async () => {
  const actual = await vi.importActual('@/lib/ai');
  return { ...actual, aiClient: { suggestDashboard: vi.fn() } };
});

const SUGGESTION = {
  role: 'scrum-master',
  name: 'Scrum Master starter dashboard',
  rationale: 'A 5-widget starter set tuned for the Scrum Master role.',
  widgets: [
    { widgetType: 'SCORECARD', title: 'Open items', config: {}, gridW: 3 },
    { widgetType: 'BAR', title: 'Velocity', config: {}, gridW: 4 },
  ],
  usedAi: true,
  fallback: false,
  policyState: 'ENABLED',
  tier: 'haiku',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DashboardSuggestionPanel', () => {
  it('fetches and shows the proposed widgets when Suggest is clicked', async () => {
    aiClient.suggestDashboard.mockResolvedValue(SUGGESTION);
    render(<DashboardSuggestionPanel workspaceId="ws-1" roleKey="scrum-master" />);

    fireEvent.click(screen.getByRole('button', { name: /suggest a dashboard/i }));

    expect(await screen.findByText('Scrum Master starter dashboard')).toBeInTheDocument();
    expect(screen.getByText('Open items')).toBeInTheDocument();
    expect(screen.getByText('Velocity')).toBeInTheDocument();
    expect(aiClient.suggestDashboard).toHaveBeenCalledWith('ws-1', 'scrum-master');
  });

  it('accepting creates the dashboard via onAccept with the suggestion', async () => {
    aiClient.suggestDashboard.mockResolvedValue(SUGGESTION);
    const onAccept = vi.fn().mockResolvedValue({ id: 'DSH-1' });
    const showToast = vi.fn();
    render(<DashboardSuggestionPanel workspaceId="ws-1" roleKey="scrum-master" onAccept={onAccept} showToast={showToast} />);

    fireEvent.click(screen.getByRole('button', { name: /suggest a dashboard/i }));
    await screen.findByText('Scrum Master starter dashboard');
    fireEvent.click(screen.getByRole('button', { name: /accept & create/i }));

    await waitFor(() => expect(onAccept).toHaveBeenCalledWith(SUGGESTION));
    expect(showToast).toHaveBeenCalledWith('Created "Scrum Master starter dashboard"');
  });

  it('shows an explicit AI-off note when the result is a deterministic fallback', async () => {
    aiClient.suggestDashboard.mockResolvedValue({ ...SUGGESTION, usedAi: false, fallback: true, tier: 'none', policyState: 'DISABLED_WORKSPACE' });
    render(<DashboardSuggestionPanel workspaceId="ws-1" roleKey="developer" />);

    fireEvent.click(screen.getByRole('button', { name: /suggest a dashboard/i }));

    expect(await screen.findByText(/AI off — showing the deterministic role-based starter set/i)).toBeInTheDocument();
    expect(screen.getByText('Deterministic fallback')).toBeInTheDocument();
    // The widgets still render on fallback — the starter set is always usable.
    expect(screen.getByText('Open items')).toBeInTheDocument();
  });

  it('surfaces an error and does not crash when the request fails', async () => {
    aiClient.suggestDashboard.mockRejectedValue(new Error('boom'));
    render(<DashboardSuggestionPanel workspaceId="ws-1" roleKey="developer" />);

    fireEvent.click(screen.getByRole('button', { name: /suggest a dashboard/i }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
