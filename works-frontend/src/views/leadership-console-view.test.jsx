import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LeadershipConsoleView from './leadership-console-view';
import { leadershipClient } from '@/lib/leadership';

vi.mock('@/lib/leadership', () => ({
  leadershipClient: {
    rollup: vi.fn(),
    resourceAllocation: vi.fn(),
    riskPortfolio: vi.fn(),
    customerHealth: vi.fn(),
    strategicThemes: vi.fn(),
    strategyExecution: vi.fn(),
    boardDeck: vi.fn(),
    briefings: vi.fn(),
    generateBriefing: vi.fn(),
  },
}));

const ROLLUP = {
  totals: { total: 40, done: 22, in_progress: 6, open: 18, overdue: 2, unassigned: 1 },
  completionRate: 55,
  projects: [{ id: 'P1', name: 'WEB Portal', total: 30, done: 18, overdue: 1, completionRate: 60 }],
  teams: [{ id: 'T1', name: 'WEB', project_count: 2 }],
};

describe('LeadershipConsoleView', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the cross-team rollup overview from the API', async () => {
    leadershipClient.rollup.mockResolvedValue(ROLLUP);
    render(<LeadershipConsoleView workspaceId="WS-001" />);
    expect(await screen.findByText('40')).toBeInTheDocument();      // total work items
    expect(screen.getByText('55%')).toBeInTheDocument();            // completion
    expect(screen.getByText('WEB Portal')).toBeInTheDocument();     // per-project
    expect(leadershipClient.rollup).toHaveBeenCalledWith('WS-001');
  });

  it('generates an executive briefing through the AI control plane', async () => {
    leadershipClient.rollup.mockResolvedValue(ROLLUP);
    leadershipClient.briefings.mockResolvedValue([
      { id: 'EB-1', title: 'Weekly briefing', cadence: 'WEEKLY', tone: 'EXECUTIVE', length: 'MEDIUM', content: 'old' },
    ]);
    leadershipClient.generateBriefing.mockResolvedValue({
      briefing: { id: 'EB-1', title: 'Weekly briefing', content: '# Fresh briefing' },
      meta: { fallback: false, tier: 'SONNET' },
    });

    render(<LeadershipConsoleView workspaceId="WS-001" onToast={vi.fn()} />);
    fireEvent.click(await screen.findByRole('tab', { name: /AI briefing/i }));
    fireEvent.click(await screen.findByRole('button', { name: /generate/i }));

    await waitFor(() => expect(leadershipClient.generateBriefing).toHaveBeenCalledWith('EB-1'));
    expect(await screen.findByText(/Fresh briefing/)).toBeInTheDocument();
  });

  it('shows an error state with retry when a tab fails to load', async () => {
    leadershipClient.rollup.mockRejectedValue(new Error('boom'));
    render(<LeadershipConsoleView workspaceId="WS-001" />);
    expect(await screen.findByText("Couldn't load this view")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
});
