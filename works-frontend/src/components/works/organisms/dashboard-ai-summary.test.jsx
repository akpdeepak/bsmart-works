import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DashboardAiSummary } from './dashboard-ai-summary';
import { aiClient } from '@/lib/ai';

vi.mock('@/lib/ai', async () => {
  const actual = await vi.importActual('@/lib/ai');
  return { ...actual, aiClient: { dashboardSummary: vi.fn(), budget: vi.fn() } };
});

const CAPS_ON = [{ id: 'dashboard_summary', label: 'Dashboard summary', enabled: true }];
const CAPS_OFF = [{ id: 'dashboard_summary', label: 'Dashboard summary', enabled: false }];
const SERIES = [{ label: 'Open', value: 4 }, { label: 'Done', value: 9 }];
const HEALTHY = { percent: 20, degraded: false, disabled: false };
const DEGRADED = { percent: 85, degraded: true, disabled: false };

beforeEach(() => {
  vi.clearAllMocks();
  aiClient.budget.mockResolvedValue(HEALTHY);
});

describe('DashboardAiSummary', () => {
  it('renders nothing when the dashboard_summary capability is off', () => {
    const { container } = render(
      <DashboardAiSummary workspaceId="ws-1" aiCapabilities={CAPS_OFF} series={SERIES} title="Status" />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders an AiMetaBadge on an AI summary result', async () => {
    aiClient.dashboardSummary.mockResolvedValue({ text: 'Throughput is up.', usedAi: true, fallback: false, tier: 'sonnet', policyState: 'ENABLED' });
    render(<DashboardAiSummary workspaceId="ws-1" aiCapabilities={CAPS_ON} series={SERIES} title="Status" />);
    fireEvent.click(screen.getByRole('button', { name: /summarise/i }));
    expect(await screen.findByText('Throughput is up.')).toBeInTheDocument();
    expect(screen.getByText('AI · sonnet')).toBeInTheDocument();
  });

  it('shows an explicit AI-off note when the result is a deterministic fallback', async () => {
    aiClient.dashboardSummary.mockResolvedValue({ text: 'Open: 4, Done: 9.', usedAi: false, fallback: true, tier: 'none', policyState: 'DISABLED_WORKSPACE' });
    render(<DashboardAiSummary workspaceId="ws-1" aiCapabilities={CAPS_ON} series={SERIES} title="Status" />);
    fireEvent.click(screen.getByRole('button', { name: /summarise/i }));
    expect(await screen.findByText(/AI off — showing deterministic result/i)).toBeInTheDocument();
    expect(screen.getByText('Deterministic fallback')).toBeInTheDocument();
  });

  it('shows the budget notice when the workspace AI budget is degraded', async () => {
    aiClient.budget.mockResolvedValue(DEGRADED);
    render(<DashboardAiSummary workspaceId="ws-1" aiCapabilities={CAPS_ON} series={SERIES} title="Status" />);
    expect(await screen.findByText(/cheaper tier/i)).toBeInTheDocument();
  });
});
