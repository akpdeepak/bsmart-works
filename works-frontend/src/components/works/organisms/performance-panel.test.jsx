import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PerformancePanel } from './performance-panel';
import { kpiClient } from '@/lib/kpi';
import { api } from '@/lib/apiClient';
import { aiClient } from '@/lib/ai';

// PerformancePanel reads the project list via useProjects (TanStack Query), so each render needs a
// fresh QueryClient/provider — fresh so there is no cache bleed between tests.
function renderWith(ui) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

vi.mock('@/lib/ai', async () => {
  const actual = await vi.importActual('@/lib/ai');
  return { ...actual, aiClient: { explainAnomaly: vi.fn(), budget: vi.fn() } };
});

const AI_CAPS = [{ id: 'anomaly_explain', label: 'Explain anomaly', enabled: true }];

vi.mock('@/lib/kpi', async () => {
  const actual = await vi.importActual('@/lib/kpi');
  return {
    ...actual,
    kpiClient: {
      personal: vi.fn(), org: vi.fn(), manager: vi.fn(), team: vi.fn(), project: vi.fn(),
      distribution: vi.fn(), health: vi.fn(), shares: vi.fn(), share: vi.fn(), unshare: vi.fn(),
    },
  };
});

vi.mock('@/lib/apiClient', () => ({ api: { send: vi.fn() } }));

const DISTRIBUTION = { median: 36, p85: 200, buckets: [2, 5, 3, 1, 0], outliers: ['WI-101', 'WI-102'] };
const HEALTH = {
  teamId: 'TEAM-1', predictability: 85, scopeStability: 70, flowEfficiency: 40, overall: 65,
  bands: ['predictability:healthy', 'scopeStability:watch', 'flowEfficiency:risk'],
};
const USERS = [
  { id: 'u-1', fullName: 'Alice Admin', email: 'alice@x.io' },
  { id: 'u-2', fullName: 'Bob Builder', email: 'bob@x.io' },
];

const PERSONAL = {
  scopeLevel: 'INDIVIDUAL', scopeId: 'me', label: 'Personal', privacyNote: '',
  metrics: [{ key: 'throughput', label: 'Throughput', value: 5, unit: 'count', sampleSize: 8 }],
};
const TEAM_LAYER = {
  scopeLevel: 'TEAM', scopeId: 'TEAM-1', label: 'WEB Portal Team', privacyNote: 'aggregated',
  metrics: [{
    key: 'velocity', label: 'Velocity', value: 42, unit: 'points', sampleSize: 5, higherIsBetter: true,
    trend: { previousValue: 30, delta: 12, previousPeriod: '2026-06-01T10', direction: 'UP', improving: true },
  }],
};
const PROJECT_LAYER = {
  scopeLevel: 'PROJECT', scopeId: 'PROJ-1', label: 'Web Portal', privacyNote: 'aggregated',
  metrics: [{ key: 'cycle', label: 'Cycle time', value: 3, unit: 'days', sampleSize: 20 }],
};
const TEAMS = [{ id: 'TEAM-1', name: 'WEB Portal Team' }, { id: 'TEAM-2', name: 'AMR Team' }];
const PROJECTS = [{ id: 'PROJ-1', name: 'Web Portal' }];

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
  kpiClient.team.mockResolvedValue(TEAM_LAYER);
  kpiClient.project.mockResolvedValue(PROJECT_LAYER);
  kpiClient.distribution.mockResolvedValue(DISTRIBUTION);
  kpiClient.health.mockResolvedValue(HEALTH);
  kpiClient.shares.mockResolvedValue([]);
  kpiClient.share.mockImplementation((_ws, viewerUserId) =>
    Promise.resolve({ id: 'SH-1', workspaceId: 'ws-1', ownerUserId: 'me', viewerUserId }));
  kpiClient.unshare.mockResolvedValue({ ok: true });
  aiClient.budget.mockResolvedValue({ percent: 20, degraded: false, disabled: false });
  aiClient.explainAnomaly.mockResolvedValue({
    explanation: 'Throughput is within the normal range.', meta: { usedAi: true, fallback: false, tier: 'sonnet', policyState: 'ENABLED' },
  });
});

describe('PerformancePanel', () => {
  it('uses the sanctioned dashboard page shell', () => {
    const { container } = renderWith(<PerformancePanel workspaceId="ws-1" />);
    expect(container.firstChild).toHaveClass('max-w-workspace', 'px-6', 'py-6');
  });

  it('shows the personal layer with a privacy message by default', async () => {
    renderWith(<PerformancePanel workspaceId="ws-1" />);
    await waitFor(() => expect(kpiClient.personal).toHaveBeenCalledWith('ws-1'));
    expect(await screen.findByText('Throughput')).toBeInTheDocument();
    expect(screen.getByText(/private metrics/i)).toBeInTheDocument();
  });

  it('shows the manager privacy guardrail callout when switching to Manager', async () => {
    renderWith(<PerformancePanel workspaceId="ws-1" />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Manager' }));
    await waitFor(() => expect(kpiClient.manager).toHaveBeenCalledWith('ws-1'));
    expect(await screen.findByText(/comparison is unavailable by design/i)).toBeInTheDocument();
  });

  it('loads team metrics with a team selector when switching to Team', async () => {
    renderWith(<PerformancePanel workspaceId="ws-1" />);
    await screen.findByText('Throughput');
    fireEvent.click(screen.getByRole('tab', { name: 'Team' }));
    await waitFor(() => expect(kpiClient.team).toHaveBeenCalledWith('ws-1', 'TEAM-1'));
    expect(await screen.findByText('Velocity')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'WEB Portal Team' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'AMR Team' })).toBeInTheDocument();
  });

  it('refetches team metrics when a different team is selected', async () => {
    renderWith(<PerformancePanel workspaceId="ws-1" />);
    await screen.findByText('Throughput');
    fireEvent.click(screen.getByRole('tab', { name: 'Team' }));
    await waitFor(() => expect(kpiClient.team).toHaveBeenCalledWith('ws-1', 'TEAM-1'));
    fireEvent.change(screen.getByLabelText('Team'), { target: { value: 'TEAM-2' } });
    await waitFor(() => expect(kpiClient.team).toHaveBeenCalledWith('ws-1', 'TEAM-2'));
  });

  it('loads project metrics when switching to Project', async () => {
    renderWith(<PerformancePanel workspaceId="ws-1" />);
    await screen.findByText('Throughput');
    fireEvent.click(screen.getByRole('tab', { name: 'Project' }));
    await waitFor(() => expect(kpiClient.project).toHaveBeenCalledWith('ws-1', 'PROJ-1'));
    expect(await screen.findByText('Cycle time')).toBeInTheDocument();
  });

  it('renders the cycle-time distribution histogram with an outlier drill on the Individual layer', async () => {
    const onOpenItem = vi.fn();
    renderWith(<PerformancePanel workspaceId="ws-1" onOpenItem={onOpenItem} />);
    await waitFor(() => expect(kpiClient.distribution).toHaveBeenCalledWith('ws-1', 'INDIVIDUAL', undefined));
    expect(await screen.findByText('Cycle-time distribution')).toBeInTheDocument();
    expect(await screen.findByText(/Outliers — slower than P85 \(2\)/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open outlier work item WI-101' }));
    expect(onOpenItem).toHaveBeenCalledWith('WI-101');
  });

  it('does not render a histogram on the Manager rollup layer', async () => {
    renderWith(<PerformancePanel workspaceId="ws-1" />);
    await screen.findByText('Throughput');
    fireEvent.click(screen.getByRole('tab', { name: 'Manager' }));
    await waitFor(() => expect(kpiClient.manager).toHaveBeenCalledWith('ws-1'));
    expect(screen.queryByText('Cycle-time distribution')).not.toBeInTheDocument();
  });

  it('shows the metric-sharing control only on the Individual layer', async () => {
    renderWith(<PerformancePanel workspaceId="ws-1" />);
    expect(await screen.findByText('Share my metrics with…')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Team' }));
    await waitFor(() => expect(kpiClient.team).toHaveBeenCalled());
    expect(screen.queryByText('Share my metrics with…')).not.toBeInTheDocument();
  });

  it('renders the vs-last-period trend on a metric that carries one', async () => {
    renderWith(<PerformancePanel workspaceId="ws-1" />);
    await screen.findByText('Throughput');
    fireEvent.click(screen.getByRole('tab', { name: 'Team' }));
    await waitFor(() => expect(kpiClient.team).toHaveBeenCalledWith('ws-1', 'TEAM-1'));
    expect(await screen.findByText('+12')).toBeInTheDocument();
    expect(screen.getByText('vs last period')).toBeInTheDocument();
  });

  it('shows an honest "no prior period" note when a metric has no trend', async () => {
    // The default PERSONAL throughput metric carries no `trend` field.
    renderWith(<PerformancePanel workspaceId="ws-1" />);
    expect(await screen.findByText('No prior period to compare yet.')).toBeInTheDocument();
  });

  it('shows an honest empty per-metric card when the sample size is zero', async () => {
    kpiClient.personal.mockResolvedValue({
      ...PERSONAL,
      metrics: [{ key: 'throughput', label: 'Throughput', value: 0, unit: 'count', sampleSize: 0 }],
    });
    renderWith(<PerformancePanel workspaceId="ws-1" />);
    await screen.findByText('Throughput');
    expect(await screen.findByText('No data yet')).toBeInTheDocument();
  });

  it('renders the team-health composite with banded gauges on the Team layer', async () => {
    renderWith(<PerformancePanel workspaceId="ws-1" />);
    await screen.findByText('Throughput');
    fireEvent.click(screen.getByRole('tab', { name: 'Team' }));
    await waitFor(() => expect(kpiClient.health).toHaveBeenCalledWith('ws-1', 'TEAM-1'));
    expect(await screen.findByText('Team health')).toBeInTheDocument();
    expect(screen.getByText('Predictability')).toBeInTheDocument();
    expect(screen.getByText('Scope stability')).toBeInTheDocument();
    expect(screen.getByText('Flow efficiency')).toBeInTheDocument();
    // Bands: predictability 85 → Healthy, flow efficiency 40 → Risk.
    expect(screen.getByText('Healthy')).toBeInTheDocument();
    expect(screen.getByText('Risk')).toBeInTheDocument();
  });

  it('does not render the team-health composite on the Individual layer', async () => {
    renderWith(<PerformancePanel workspaceId="ws-1" />);
    await screen.findByText('Throughput');
    expect(screen.queryByText('Team health')).not.toBeInTheDocument();
  });

  it('renders an AiMetaBadge on the Explain-anomaly output (§2.4)', async () => {
    renderWith(<PerformancePanel workspaceId="ws-1" aiCapabilities={AI_CAPS} />);
    fireEvent.click(await screen.findByRole('button', { name: /Explain Throughput anomaly/i }));
    await waitFor(() => expect(aiClient.explainAnomaly).toHaveBeenCalled());
    expect(await screen.findByText('Throughput is within the normal range.')).toBeInTheDocument();
    expect(screen.getByText('AI · sonnet')).toBeInTheDocument();
  });

  it('shows the explicit AI-off note when an anomaly explanation falls back', async () => {
    aiClient.explainAnomaly.mockResolvedValue({
      explanation: 'No AI — value shown as-is.', meta: { usedAi: false, fallback: true, tier: 'none', policyState: 'DISABLED_WORKSPACE' },
    });
    renderWith(<PerformancePanel workspaceId="ws-1" aiCapabilities={AI_CAPS} />);
    fireEvent.click(await screen.findByRole('button', { name: /Explain Throughput anomaly/i }));
    expect(await screen.findByText(/AI off — showing deterministic result/i)).toBeInTheDocument();
    expect(screen.getByText('Deterministic fallback')).toBeInTheDocument();
  });

  it('surfaces the budget notice when AI is on and the workspace is degraded (§2.5)', async () => {
    aiClient.budget.mockResolvedValue({ percent: 90, degraded: true, disabled: false });
    renderWith(<PerformancePanel workspaceId="ws-1" aiCapabilities={AI_CAPS} />);
    expect(await screen.findByText(/cheaper tier/i)).toBeInTheDocument();
  });
});
