import { describe, it, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { expectNoA11yViolations } from '@/test/a11y';

// Leadership Console fetches its own workspace-scoped data via leadershipClient. The previous a11y
// round SKIPPED it for want of a rollup mock; here we mock the full client (every tab's shape, per
// src/lib/leadership.js) so all 8 tabs render, then sweep each for serious/critical violations.

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

import LeadershipConsoleView from './leadership-console-view';
import { leadershipClient } from '@/lib/leadership';

const ROLLUP = {
  totals: { total: 40, done: 22, in_progress: 6, open: 18, overdue: 2, unassigned: 1 },
  completionRate: 55,
  projects: [{ id: 'P1', name: 'WEB Portal', total: 30, done: 18, overdue: 1, completionRate: 60 }],
  teams: [{ id: 'T1', name: 'WEB', project_count: 2 }],
};
const BRIEFINGS = [{ id: 'EB-1', title: 'Weekly briefing', cadence: 'WEEKLY', tone: 'EXECUTIVE', length: 'MEDIUM', content: 'Delivery is on track.' }];
const THEMES = { themes: [{ id: 'TH-1', name: 'Reliability', quarter: 'Q2 2026', status: 'ON_TRACK', progress: 65 }] };
const RESOURCES = {
  teamAverageOpen: 4, unassignedItems: 2, rebalancingSuggestions: [{}],
  members: [{ id: 'M-1', full_name: 'Asha Rao', open_items: 6, open_points: 13, allocation: 'OVER' }],
};
const RISKS = {
  openCount: 3, highImpactCount: 1,
  risks: [{ id: 'RK-1', title: 'Vendor delay', project_name: 'WEB Portal', score: 6 }],
};
const CUSTOMERS = {
  atRiskCount: 1,
  customers: [{ id: 'C-1', name: 'DISCOM North', tier: 'GOLD', healthScore: 72, avgCsat: 4.1, overdueRequests: 1, churnRisk: 'MEDIUM' }],
};
const STRATEGY = {
  objectives: [{
    id: 'O-1', title: 'Grow ARR', level: 'COMPANY', quarter: 'Q2 2026',
    keyResults: [{ id: 'KR-1', title: 'Land 3 DISCOMs', links: [{ work_item_title: 'Pilot North', work_item_status: 'In Progress' }] }],
  }],
};

function mockAll() {
  leadershipClient.rollup.mockResolvedValue(ROLLUP);
  leadershipClient.briefings.mockResolvedValue(BRIEFINGS);
  leadershipClient.strategicThemes.mockResolvedValue(THEMES);
  leadershipClient.resourceAllocation.mockResolvedValue(RESOURCES);
  leadershipClient.riskPortfolio.mockResolvedValue(RISKS);
  leadershipClient.customerHealth.mockResolvedValue(CUSTOMERS);
  leadershipClient.strategyExecution.mockResolvedValue(STRATEGY);
}

async function sweepTab(tabName, settle) {
  const { container } = render(<LeadershipConsoleView workspaceId="WS-001" onToast={vi.fn()} />);
  fireEvent.click(await screen.findByRole('tab', { name: tabName }));
  await settle();
  await expectNoA11yViolations(container);
}

describe('LeadershipConsoleView a11y', () => {
  beforeEach(() => { vi.clearAllMocks(); mockAll(); });

  it('overview tab (stat cards + per-project + teams) has no serious/critical violations', async () => {
    const { container } = render(<LeadershipConsoleView workspaceId="WS-001" onToast={vi.fn()} />);
    await screen.findByText('WEB Portal');
    await expectNoA11yViolations(container);
  });

  it('AI briefing tab has no serious/critical violations', async () => {
    await sweepTab(/AI briefing/i, () => screen.findByText('Weekly briefing'));
  });

  it('themes tab has no serious/critical violations', async () => {
    await sweepTab(/Themes/i, () => screen.findByText('Reliability'));
  });

  it('resources tab has no serious/critical violations', async () => {
    await sweepTab(/Resources/i, () => screen.findByText('Asha Rao'));
  });

  it('risks tab has no serious/critical violations', async () => {
    await sweepTab(/Risks/i, () => screen.findByText('Vendor delay'));
  });

  it('customer health tab has no serious/critical violations', async () => {
    await sweepTab(/Customer health/i, () => screen.findByText(/DISCOM North/));
  });

  it('strategy map tab has no serious/critical violations', async () => {
    await sweepTab(/Strategy map/i, () => screen.findByText('Grow ARR'));
  });

  it('board deck tab (empty prompt) has no serious/critical violations', async () => {
    await sweepTab(/Board deck/i, () => screen.findByText(/Quarterly board deck/));
  });

  it('error state (failed load) has no serious/critical violations', async () => {
    leadershipClient.rollup.mockRejectedValue(new Error('boom'));
    const { container } = render(<LeadershipConsoleView workspaceId="WS-001" />);
    await screen.findByText("Couldn't load this view");
    await expectNoA11yViolations(container);
  });
});
