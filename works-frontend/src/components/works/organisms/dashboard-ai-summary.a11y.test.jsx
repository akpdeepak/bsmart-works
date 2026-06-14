import { describe, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DashboardAiSummary } from './dashboard-ai-summary';
import { aiClient } from '@/lib/ai';
import { expectNoA11yViolations } from '@/test/a11y';

vi.mock('@/lib/ai', async () => {
  const actual = await vi.importActual('@/lib/ai');
  return { ...actual, aiClient: { dashboardSummary: vi.fn(), budget: vi.fn() } };
});

const CAPS = [{ id: 'dashboard_summary', label: 'Dashboard summary', enabled: true }];
const SERIES = [{ label: 'Open', value: 6 }, { label: 'Done', value: 4 }];

beforeEach(() => {
  vi.clearAllMocks();
  aiClient.budget.mockResolvedValue({ percent: 20, degraded: false, disabled: false });
  aiClient.dashboardSummary.mockResolvedValue({
    text: 'Throughput steady; one outlier in Open.', usedAi: true, fallback: false, policyState: 'ENABLED', tier: 'sonnet',
  });
});

describe('DashboardAiSummary a11y', () => {
  it('idle band has no serious/critical violations', async () => {
    const { container } = render(<DashboardAiSummary workspaceId="ws-1" aiCapabilities={CAPS} series={SERIES} title="My dashboard" />);
    await screen.findByText('AI summary & anomalies');
    await expectNoA11yViolations(container);
  });

  it('generated summary (with AI badge) has no serious/critical violations', async () => {
    const { container } = render(<DashboardAiSummary workspaceId="ws-1" aiCapabilities={CAPS} series={SERIES} title="My dashboard" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Summarise' }));
    await waitFor(() => expect(aiClient.dashboardSummary).toHaveBeenCalled());
    await screen.findByText(/Throughput steady/);
    await expectNoA11yViolations(container);
  });
});
