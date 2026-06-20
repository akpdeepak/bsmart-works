import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DashboardsView from './dashboards-view';
import { aiClient } from '@/lib/ai';

// Mock only the api surface; keep the real pure helpers (capabilityEnabled, compiledSpecToMeta).
vi.mock('@/lib/ai', async () => {
  const actual = await vi.importActual('@/lib/ai');
  return {
    ...actual,
    aiClient: {
      compileConversationalDashboard: vi.fn(),
      saveConversationalDashboard: vi.fn(),
      suggestDashboard: vi.fn(),
    },
  };
});

const noop = () => {};

const baseProps = {
  customDashboards: [],
  selectedDashboard: null,
  dashboardEditMode: false,
  dashboardScope: 'PROJECT',
  dashboardTeamId: null,
  dashboardAggregate: null,
  dashboardDrill: null,
  shareInfo: null,
  teams: [],
  workItems: [],
  sprints: [],
  velocityData: null,
  currentUser: null,
  createDashboard: noop,
  openDashboard: noop,
  deleteDashboard: noop,
  addDashboardWidget: noop,
  removeDashboardWidget: noop,
  resizeDashboardWidget: noop,
  updateDashboardWidgetConfig: noop,
  reorderDashboardWidgets: noop,
  setDashboardEditMode: noop,
  setSelectedDashboard: noop,
  setDashboardScope: noop,
  setDashboardTeamId: noop,
  setDashboardDrill: noop,
  setDragWidgetId: noop,
  fetchDashboardAggregate: noop,
  mintShare: noop,
  stopShare: noop,
  showToast: noop,
};

describe('DashboardsView', () => {
  it('uses the sanctioned dashboard page shell', () => {
    const { container } = render(<DashboardsView {...baseProps} />);
    expect(container.firstChild).toHaveClass('max-w-workspace', 'px-6', 'py-6');
  });

  it('renders the heading and empty state with no dashboards', () => {
    render(<DashboardsView {...baseProps} />);
    expect(screen.getByRole('heading', { name: /^dashboards$/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/no dashboards yet/i)).toBeInTheDocument();
  });

  it('renders dashboard cards when dashboards exist', () => {
    const dashboards = [
      { id: 'd1', name: 'Sprint Health', scope: 'TEAM', updatedAt: null },
    ];
    render(<DashboardsView {...baseProps} customDashboards={dashboards} />);
    expect(screen.getByText('Sprint Health')).toBeInTheDocument();
  });

  it('renders New dashboard button', () => {
    render(<DashboardsView {...baseProps} />);
    expect(screen.getAllByRole('button', { name: /new dashboard/i })[0]).toBeInTheDocument();
  });

  describe('conversational dashboard entry (Cap O, RB-40 §2)', () => {
    beforeEach(() => vi.clearAllMocks());

    const ENABLED = [{ id: 'conversational_dashboard', label: 'Conversational dashboards', enabled: true, fallback: 'parser' }];
    const DISABLED = [{ id: 'conversational_dashboard', label: 'Conversational dashboards', enabled: false, fallback: 'parser' }];

    it('hides the NL entry when the capability is disabled', () => {
      render(<DashboardsView {...baseProps} aiCapabilities={DISABLED} activeWorkspaceId="ws-1" />);
      expect(screen.queryByText(/describe a dashboard/i)).not.toBeInTheDocument();
    });

    it('shows the NL entry when the capability is enabled', () => {
      render(<DashboardsView {...baseProps} aiCapabilities={ENABLED} activeWorkspaceId="ws-1" />);
      expect(screen.getByText(/describe a dashboard/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/describe the dashboard you want/i)).toBeInTheDocument();
    });

    it('compiles a prompt and renders the returned widget spec preview', async () => {
      aiClient.compileConversationalDashboard.mockResolvedValue({
        spec: {
          title: 'Velocity by team',
          metric: 'velocity',
          groupBy: 'team',
          chart: 'bar',
          timeframe: { amount: 6, unit: 'sprint' },
          composites: ['predictability'],
        },
        usedAi: false,
        fallback: true,
        policyState: 'OFF',
        tier: 'NONE',
      });

      render(<DashboardsView {...baseProps} aiCapabilities={ENABLED} activeWorkspaceId="ws-1" />);
      fireEvent.change(screen.getByLabelText(/describe the dashboard you want/i), {
        target: { value: 'velocity per team last 6 sprints with predictability' },
      });
      fireEvent.click(screen.getByRole('button', { name: /build preview/i }));

      await waitFor(() => expect(aiClient.compileConversationalDashboard).toHaveBeenCalledWith(
        'ws-1', 'velocity per team last 6 sprints with predictability',
      ));
      // Preview surfaces the compiled spec + the deterministic-fallback provenance badge.
      expect(await screen.findByText('Velocity by team')).toBeInTheDocument();
      expect(screen.getByText(/last 6 sprint/i)).toBeInTheDocument();
      expect(screen.getByText(/deterministic fallback/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save dashboard/i })).toBeInTheDocument();
    });
  });
});

describe('DashboardsView — suggested dashboard entry (dashboard_suggestion gate, §2.2)', () => {
  beforeEach(() => vi.clearAllMocks());

  const ON = [{ id: 'dashboard_suggestion', label: 'AI-suggested starter dashboard', enabled: true }];
  const OFF = [{ id: 'dashboard_suggestion', label: 'AI-suggested starter dashboard', enabled: false }];

  it('hides the suggest entry when the capability is disabled', () => {
    render(<DashboardsView {...baseProps} aiCapabilities={OFF} activeWorkspaceId="ws-1" />);
    expect(screen.queryByText(/suggest a dashboard/i)).not.toBeInTheDocument();
  });

  it('shows the suggest entry when the capability is enabled', () => {
    render(<DashboardsView {...baseProps} aiCapabilities={ON} activeWorkspaceId="ws-1" />);
    expect(screen.getAllByText(/suggest a dashboard/i)[0]).toBeInTheDocument();
  });

  it('accepting a suggestion creates a dashboard via the handler', async () => {
    aiClient.suggestDashboard.mockResolvedValue({
      role: 'developer', name: 'Developer starter dashboard',
      rationale: 'A starter set tuned for the Developer role.',
      widgets: [{ widgetType: 'SCORECARD', title: 'My open work', config: {}, gridW: 3 }],
      usedAi: false, fallback: true, policyState: 'DISABLED_WORKSPACE', tier: 'none',
    });
    const acceptDashboardSuggestion = vi.fn().mockResolvedValue({ id: 'DSH-9' });
    render(<DashboardsView {...baseProps} aiCapabilities={ON} activeWorkspaceId="ws-1"
      dashboardRole="developer" acceptDashboardSuggestion={acceptDashboardSuggestion} />);

    fireEvent.click(screen.getByRole('button', { name: /suggest a dashboard/i }));
    expect(await screen.findByText('Developer starter dashboard')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /accept & create/i }));

    await waitFor(() => expect(acceptDashboardSuggestion).toHaveBeenCalled());
  });
});

describe('DashboardsView — share + embed surface (Cap J)', () => {
  const sharedProps = {
    ...baseProps,
    activeWorkspaceId: 'ws-1',
    selectedDashboard: { id: 'd1', name: 'Customer Status', widgets: [], scope: 'TEAM' },
    shareInfo: { id: 'd1', token: 'tok-xyz' },
  };

  it('shows both the public link and the iframe embed snippet when a share token exists', () => {
    render(<DashboardsView {...sharedProps} />);

    const link = screen.getByLabelText(/public dashboard link/i);
    expect(link.value).toContain('?share=tok-xyz');

    const embed = screen.getByLabelText(/embed iframe snippet/i);
    expect(embed.value).toContain('<iframe');
    expect(embed.value).toContain('/embed/dashboard/tok-xyz');
    expect(embed.value).toContain('title="Customer Status"');
  });

  it('does not show the share/embed panel when there is no share token', () => {
    render(<DashboardsView {...sharedProps} shareInfo={null} />);
    expect(screen.queryByLabelText(/embed iframe snippet/i)).not.toBeInTheDocument();
  });
});

describe('DashboardsView — empty open dashboard "start from a template" (RB-20 §3 defaults)', () => {
  const emptyOpen = {
    ...baseProps,
    activeWorkspaceId: 'ws-1',
    selectedDashboard: { id: 'd1', name: 'New dashboard', widgets: [], scope: 'PERSONAL' },
  };

  it('offers a Start-from-a-template CTA that drops a multi-widget starter set in one click', () => {
    const addDashboardWidget = vi.fn();
    render(<DashboardsView {...emptyOpen} addDashboardWidget={addDashboardWidget} />);
    const cta = screen.getByRole('button', { name: /start from a template/i });
    expect(cta).toBeInTheDocument();
    fireEvent.click(cta);
    // The opinionated starter set adds several real, no-config widgets (not a blank canvas).
    expect(addDashboardWidget.mock.calls.length).toBeGreaterThanOrEqual(6);
    const types = addDashboardWidget.mock.calls.map(c => c[0]);
    expect(types).toContain('SCORECARD');
    expect(types).toContain('STATUS_BAR');
  });
});

describe('DashboardsView — widget library (canonical presets, no dead controls)', () => {
  const editOpen = {
    ...baseProps,
    activeWorkspaceId: 'ws-1',
    dashboardEditMode: true,
    selectedDashboard: { id: 'd1', name: 'My dash', widgets: [], scope: 'PERSONAL' },
  };

  it('offers a real Cumulative-flow widget that maps to CUMULATIVE_FLOW (CUMFLOW typo fixed)', () => {
    const addDashboardWidget = vi.fn();
    render(<DashboardsView {...editOpen} addDashboardWidget={addDashboardWidget} />);
    fireEvent.click(screen.getByRole('button', { name: /cumulative flow/i }));
    expect(addDashboardWidget).toHaveBeenCalledWith('CUMULATIVE_FLOW', expect.anything(), 'Cumulative flow', expect.anything());
  });

  it('no longer offers the dead AI-usage / SLA-health presets (never rendered real data)', () => {
    render(<DashboardsView {...editOpen} />);
    expect(screen.queryByRole('button', { name: /^ai usage$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^sla health$/i })).not.toBeInTheDocument();
  });
});

describe('DashboardsView — AI summary band (dashboard_summary gate)', () => {
  const openProps = {
    ...baseProps,
    activeWorkspaceId: 'ws-1',
    selectedDashboard: { id: 'd1', name: 'Sprint Health', widgets: [], scope: 'TEAM' },
    workItems: [{ id: 'WRK-1', status: 'Open' }],
  };

  it('is hidden entirely when the dashboard_summary capability is off', () => {
    render(<DashboardsView {...openProps} aiCapabilities={[{ id: 'dashboard_summary', enabled: false }]} />);
    expect(screen.queryByText(/AI summary & anomalies/i)).not.toBeInTheDocument();
  });

  it('is hidden when only unrelated capabilities are enabled (most-restrictive-wins)', () => {
    render(<DashboardsView {...openProps} aiCapabilities={[{ id: 'nl_to_bql', enabled: true }]} />);
    expect(screen.queryByText(/AI summary & anomalies/i)).not.toBeInTheDocument();
  });

  it('shows the band when dashboard_summary is enabled', () => {
    render(<DashboardsView {...openProps} aiCapabilities={[{ id: 'dashboard_summary', enabled: true }]} />);
    expect(screen.getByText(/AI summary & anomalies/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /summarise/i })).toBeInTheDocument();
  });
});
