import { describe, it, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PerformancePanel } from './performance-panel';
import { kpiClient } from '@/lib/kpi';
import { api } from '@/lib/apiClient';
import { aiClient } from '@/lib/ai';
import { expectNoA11yViolations } from '@/test/a11y';

vi.mock('@/lib/ai', async () => {
  const actual = await vi.importActual('@/lib/ai');
  return { ...actual, aiClient: { explainAnomaly: vi.fn(), budget: vi.fn() } };
});
vi.mock('@/lib/kpi', async () => {
  const actual = await vi.importActual('@/lib/kpi');
  return {
    ...actual,
    kpiClient: {
      personal: vi.fn(), org: vi.fn(), manager: vi.fn(), team: vi.fn(), project: vi.fn(),
      distribution: vi.fn(), shares: vi.fn(), share: vi.fn(), unshare: vi.fn(),
    },
  };
});
vi.mock('@/lib/apiClient', () => ({ api: { send: vi.fn() } }));

const AI_CAPS = [{ id: 'anomaly_explain', label: 'Explain anomaly', enabled: true }];
const PERSONAL = {
  scopeLevel: 'INDIVIDUAL', scopeId: 'me', label: 'Personal', privacyNote: '',
  metrics: [{ key: 'throughput', label: 'Throughput', value: 5, unit: 'count', sampleSize: 8 }],
};
const DISTRIBUTION = { median: 36, p85: 200, buckets: [2, 5, 3, 1, 0], outliers: ['WI-101', 'WI-102'] };
const TEAMS = [{ id: 'TEAM-1', name: 'WEB Portal Team' }];
const PROJECTS = [{ id: 'PROJ-1', name: 'Web Portal' }];
const USERS = [{ id: 'u-1', fullName: 'Alice', email: 'a@x.io' }];

beforeEach(() => {
  vi.clearAllMocks();
  api.send.mockImplementation((url) => {
    if (url.startsWith('/teams')) return Promise.resolve(TEAMS);
    if (url.startsWith('/projects')) return Promise.resolve(PROJECTS);
    if (url.startsWith('/users')) return Promise.resolve(USERS);
    return Promise.resolve([]);
  });
  kpiClient.personal.mockResolvedValue(PERSONAL);
  kpiClient.org.mockResolvedValue({ ...PERSONAL, label: 'Organization' });
  kpiClient.manager.mockResolvedValue([]);
  kpiClient.team.mockResolvedValue({ ...PERSONAL, scopeLevel: 'TEAM', label: 'Team', privacyNote: 'aggregated' });
  kpiClient.project.mockResolvedValue({ ...PERSONAL, scopeLevel: 'PROJECT', label: 'Project', privacyNote: 'aggregated' });
  kpiClient.distribution.mockResolvedValue(DISTRIBUTION);
  kpiClient.shares.mockResolvedValue([]);
  aiClient.budget.mockResolvedValue({ percent: 20, degraded: false, disabled: false });
  aiClient.explainAnomaly.mockResolvedValue({
    explanation: 'Within range.', meta: { usedAi: true, fallback: false, tier: 'sonnet', policyState: 'ENABLED' },
  });
});

describe('PerformancePanel a11y', () => {
  it('Individual layer (default, with histogram + sharing) has no serious/critical violations', async () => {
    const { container } = render(<PerformancePanel workspaceId="ws-1" aiCapabilities={AI_CAPS} />);
    await screen.findByText('Throughput');
    await screen.findByText('Cycle-time distribution');
    await expectNoA11yViolations(container);
  });

  it('Manager privacy-guardrail layer has no serious/critical violations', async () => {
    const { container } = render(<PerformancePanel workspaceId="ws-1" />);
    await screen.findByText('Throughput');
    fireEvent.click(screen.getByRole('tab', { name: 'Manager' }));
    await waitFor(() => expect(kpiClient.manager).toHaveBeenCalled());
    await expectNoA11yViolations(container);
  });

  it('Explain-anomaly output (AI badge) has no serious/critical violations', async () => {
    const { container } = render(<PerformancePanel workspaceId="ws-1" aiCapabilities={AI_CAPS} />);
    fireEvent.click(await screen.findByRole('button', { name: /Explain Throughput anomaly/i }));
    await screen.findByText('Within range.');
    await expectNoA11yViolations(container);
  });
});
