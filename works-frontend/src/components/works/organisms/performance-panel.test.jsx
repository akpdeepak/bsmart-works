import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PerformancePanel } from './performance-panel';
import { kpiClient } from '@/lib/kpi';
import { api } from '@/lib/apiClient';
import { aiClient } from '@/lib/ai';

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
      distribution: vi.fn(), shares: vi.fn(), share: vi.fn(), unshare: vi.fn(),
    },
  };
});

vi.mock('@/lib/apiClient', () => ({ api: { send: vi.fn() } }));

const DISTRIBUTION = { median: 36, p85: 200, buckets: [2, 5, 3, 1, 0], outliers: ['WI-101', 'WI-102'] };
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
  metrics: [{ key: 'velocity', label: 'Velocity', value: 42, unit: 'points', sampleSize: 5 }],
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
  it('shows the personal layer with a privacy message by default', async () => {
    render(<PerformancePanel workspaceId="ws-1" />);
    await waitFor(() => expect(kpiClient.personal).toHaveBeenCalledWith('ws-1'));
    expect(await screen.findByText('Throughput')).toBeInTheDocument();
    expect(screen.getByText(/private metrics/i)).toBeInTheDocument();
  });

  it('shows the manager privacy guardrail callout when switching to Manager', async () => {
    render(<PerformancePanel workspaceId="ws-1" />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Manager' }));
    await waitFor(() => expect(kpiClient.manager).toHaveBeenCalledWith('ws-1'));
    expect(await screen.findByText(/comparison is unavailable by design/i)).toBeInTheDocument();
  });

  it('loads team metrics with a team selector when switching to Team', async () => {
    render(<PerformancePanel workspaceId="ws-1" />);
    await screen.findByText('Throughput');
    fireEvent.click(screen.getByRole('tab', { name: 'Team' }));
    await waitFor(() => expect(kpiClient.team).toHaveBeenCalledWith('ws-1', 'TEAM-1'));
    expect(await screen.findByText('Velocity')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'WEB Portal Team' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'AMR Team' })).toBeInTheDocument();
  });

  it('refetches team metrics when a different team is selected', async () => {
    render(<PerformancePanel workspaceId="ws-1" />);
    await screen.findByText('Throughput');
    fireEvent.click(screen.getByRole('tab', { name: 'Team' }));
    await waitFor(() => expect(kpiClient.team).toHaveBeenCalledWith('ws-1', 'TEAM-1'));
    fireEvent.change(screen.getByLabelText('Team'), { target: { value: 'TEAM-2' } });
    await waitFor(() => expect(kpiClient.team).toHaveBeenCalledWith('ws-1', 'TEAM-2'));
  });

  it('loads project metrics when switching to Project', async () => {
    render(<PerformancePanel workspaceId="ws-1" />);
    await screen.findByText('Throughput');
    fireEvent.click(screen.getByRole('tab', { name: 'Project' }));
    await waitFor(() => expect(kpiClient.project).toHaveBeenCalledWith('ws-1', 'PROJ-1'));
    expect(await screen.findByText('Cycle time')).toBeInTheDocument();
  });

  it('renders the cycle-time distribution histogram with an outlier drill on the Individual layer', async () => {
    const onOpenItem = vi.fn();
    render(<PerformancePanel workspaceId="ws-1" onOpenItem={onOpenItem} />);
    await waitFor(() => expect(kpiClient.distribution).toHaveBeenCalledWith('ws-1', 'INDIVIDUAL', undefined));
    expect(await screen.findByText('Cycle-time distribution')).toBeInTheDocument();
    expect(await screen.findByText(/Outliers — slower than P85 \(2\)/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open outlier work item WI-101' }));
    expect(onOpenItem).toHaveBeenCalledWith('WI-101');
  });

  it('does not render a histogram on the Manager rollup layer', async () => {
    render(<PerformancePanel workspaceId="ws-1" />);
    await screen.findByText('Throughput');
    fireEvent.click(screen.getByRole('tab', { name: 'Manager' }));
    await waitFor(() => expect(kpiClient.manager).toHaveBeenCalledWith('ws-1'));
    expect(screen.queryByText('Cycle-time distribution')).not.toBeInTheDocument();
  });

  it('shows the metric-sharing control only on the Individual layer', async () => {
    render(<PerformancePanel workspaceId="ws-1" />);
    expect(await screen.findByText('Share my metrics with…')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Team' }));
    await waitFor(() => expect(kpiClient.team).toHaveBeenCalled());
    expect(screen.queryByText('Share my metrics with…')).not.toBeInTheDocument();
  });

  it('renders an AiMetaBadge on the Explain-anomaly output (§2.4)', async () => {
    render(<PerformancePanel workspaceId="ws-1" aiCapabilities={AI_CAPS} />);
    fireEvent.click(await screen.findByRole('button', { name: /Explain Throughput anomaly/i }));
    await waitFor(() => expect(aiClient.explainAnomaly).toHaveBeenCalled());
    expect(await screen.findByText('Throughput is within the normal range.')).toBeInTheDocument();
    expect(screen.getByText('AI · sonnet')).toBeInTheDocument();
  });

  it('shows the explicit AI-off note when an anomaly explanation falls back', async () => {
    aiClient.explainAnomaly.mockResolvedValue({
      explanation: 'No AI — value shown as-is.', meta: { usedAi: false, fallback: true, tier: 'none', policyState: 'DISABLED_WORKSPACE' },
    });
    render(<PerformancePanel workspaceId="ws-1" aiCapabilities={AI_CAPS} />);
    fireEvent.click(await screen.findByRole('button', { name: /Explain Throughput anomaly/i }));
    expect(await screen.findByText(/AI off — showing deterministic result/i)).toBeInTheDocument();
    expect(screen.getByText('Deterministic fallback')).toBeInTheDocument();
  });

  it('surfaces the budget notice when AI is on and the workspace is degraded (§2.5)', async () => {
    aiClient.budget.mockResolvedValue({ percent: 90, degraded: true, disabled: false });
    render(<PerformancePanel workspaceId="ws-1" aiCapabilities={AI_CAPS} />);
    expect(await screen.findByText(/cheaper tier/i)).toBeInTheDocument();
  });
});
