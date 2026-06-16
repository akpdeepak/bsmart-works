import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the query hooks so tests don't hit the network.
vi.mock('@/hooks/queries/useHeartMetrics', () => ({
  useHeartMetrics: vi.fn(),
  useActivationFunnel: vi.fn(),
}));

import { useHeartMetrics, useActivationFunnel } from '@/hooks/queries/useHeartMetrics';
import {
  HeartDashboardWidget,
  ActivationFunnelWidget,
  EngagementScoreWidget,
  RetentionMetricsWidget,
  TaskSuccessWidget,
} from './heart-widgets';

function Wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

function r(ui) {
  return render(ui, { wrapper: Wrapper });
}

const MOCK_HEART = {
  happiness:   { score: 85, onTime: 17, completed: 20 },
  engagement:  { score: 72, active7d: 18, totalMembers: 25 },
  adoption:    { score: 60, creators: 15, totalMembers: 25 },
  retention:   { score: 90, thisWeek: 18, lastWeek: 20 },
  taskSuccess: { score: 55, done: 11, total: 20 },
};

const MOCK_FUNNEL = [
  { label: 'Invited',      description: 'Members added',    count: 25, pct: 100 },
  { label: 'Signed in',    description: 'First login',      count: 20, pct: 80 },
  { label: 'Created item', description: 'At least one',     count: 12, pct: 48 },
  { label: 'Collaborated', description: 'Comment/assigned', count: 8,  pct: 32 },
  { label: 'Retained',     description: 'Active 7 days',    count: 18, pct: 72 },
];

beforeEach(() => {
  useHeartMetrics.mockReturnValue({ data: undefined, isLoading: false, isError: false });
  useActivationFunnel.mockReturnValue({ data: undefined, isLoading: false, isError: false });
});

// ── HeartDashboardWidget ─────────────────────────────────────────────────────

describe('HeartDashboardWidget', () => {
  it('renders the section heading', () => {
    r(<HeartDashboardWidget workspaceId="ws-1" />);
    expect(screen.getByRole('region', { name: /heart metrics/i })).toBeInTheDocument();
  });

  it('shows loading skeleton when isLoading', () => {
    useHeartMetrics.mockReturnValue({ data: undefined, isLoading: true, isError: false });
    r(<HeartDashboardWidget workspaceId="ws-1" />);
    expect(screen.getByRole('region', { name: /heart metrics/i }).querySelector('[aria-busy]')).toBeTruthy();
  });

  it('shows error alert when isError', () => {
    useHeartMetrics.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    r(<HeartDashboardWidget workspaceId="ws-1" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders all five HEART dimension rings', () => {
    useHeartMetrics.mockReturnValue({ data: MOCK_HEART, isLoading: false, isError: false });
    r(<HeartDashboardWidget workspaceId="ws-1" />);
    expect(screen.getByText('Happiness')).toBeInTheDocument();
    expect(screen.getByText('Engagement')).toBeInTheDocument();
    expect(screen.getByText('Adoption')).toBeInTheDocument();
    expect(screen.getByText('Retention')).toBeInTheDocument();
    expect(screen.getByText('Task Success')).toBeInTheDocument();
  });

  it('renders score percentages for each dimension', () => {
    useHeartMetrics.mockReturnValue({ data: MOCK_HEART, isLoading: false, isError: false });
    r(<HeartDashboardWidget workspaceId="ws-1" />);
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('72%')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();
    expect(screen.getByText('55%')).toBeInTheDocument();
  });

  it('renders as a listitem for each dimension', () => {
    useHeartMetrics.mockReturnValue({ data: MOCK_HEART, isLoading: false, isError: false });
    r(<HeartDashboardWidget workspaceId="ws-1" />);
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
  });
});

// ── ActivationFunnelWidget ───────────────────────────────────────────────────

describe('ActivationFunnelWidget', () => {
  it('renders the section heading', () => {
    r(<ActivationFunnelWidget workspaceId="ws-1" />);
    expect(screen.getByRole('region', { name: /activation funnel/i })).toBeInTheDocument();
  });

  it('shows loading skeleton when isLoading', () => {
    useActivationFunnel.mockReturnValue({ data: undefined, isLoading: true, isError: false });
    r(<ActivationFunnelWidget workspaceId="ws-1" />);
    expect(screen.getByRole('region').querySelector('[aria-busy]')).toBeTruthy();
  });

  it('shows error alert when isError', () => {
    useActivationFunnel.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    r(<ActivationFunnelWidget workspaceId="ws-1" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('shows empty state when stages is empty array', () => {
    useActivationFunnel.mockReturnValue({ data: [], isLoading: false, isError: false });
    r(<ActivationFunnelWidget workspaceId="ws-1" />);
    expect(screen.getByText(/no funnel data yet/i)).toBeInTheDocument();
  });

  it('renders all five funnel stages', () => {
    useActivationFunnel.mockReturnValue({ data: MOCK_FUNNEL, isLoading: false, isError: false });
    r(<ActivationFunnelWidget workspaceId="ws-1" />);
    expect(screen.getByText('Invited')).toBeInTheDocument();
    expect(screen.getByText('Signed in')).toBeInTheDocument();
    expect(screen.getByText('Created item')).toBeInTheDocument();
    expect(screen.getByText('Collaborated')).toBeInTheDocument();
    expect(screen.getByText('Retained')).toBeInTheDocument();
  });

  it('renders a progressbar for each stage', () => {
    useActivationFunnel.mockReturnValue({ data: MOCK_FUNNEL, isLoading: false, isError: false });
    r(<ActivationFunnelWidget workspaceId="ws-1" />);
    const bars = screen.getAllByRole('progressbar');
    expect(bars).toHaveLength(5);
  });

  it('progressbar aria-valuenow matches stage pct', () => {
    useActivationFunnel.mockReturnValue({ data: MOCK_FUNNEL, isLoading: false, isError: false });
    r(<ActivationFunnelWidget workspaceId="ws-1" />);
    const bars = screen.getAllByRole('progressbar');
    expect(bars[0]).toHaveAttribute('aria-valuenow', '100');
    expect(bars[1]).toHaveAttribute('aria-valuenow', '80');
  });
});

// ── EngagementScoreWidget ────────────────────────────────────────────────────

describe('EngagementScoreWidget', () => {
  it('renders the section heading', () => {
    r(<EngagementScoreWidget workspaceId="ws-1" />);
    expect(screen.getByRole('region', { name: /engagement/i })).toBeInTheDocument();
  });

  it('shows loading skeleton when isLoading', () => {
    useHeartMetrics.mockReturnValue({ data: undefined, isLoading: true, isError: false });
    r(<EngagementScoreWidget workspaceId="ws-1" />);
    expect(screen.getByRole('region').querySelector('[aria-busy]')).toBeTruthy();
  });

  it('shows error alert when isError', () => {
    useHeartMetrics.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    r(<EngagementScoreWidget workspaceId="ws-1" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders the engagement score prominently', () => {
    useHeartMetrics.mockReturnValue({ data: MOCK_HEART, isLoading: false, isError: false });
    r(<EngagementScoreWidget workspaceId="ws-1" />);
    expect(screen.getByLabelText('72%')).toBeInTheDocument();
  });

  it('shows member count breakdown', () => {
    useHeartMetrics.mockReturnValue({ data: MOCK_HEART, isLoading: false, isError: false });
    r(<EngagementScoreWidget workspaceId="ws-1" />);
    expect(screen.getByText(/18.*of.*25/i)).toBeInTheDocument();
  });

  it('renders a progressbar for the engagement score', () => {
    useHeartMetrics.mockReturnValue({ data: MOCK_HEART, isLoading: false, isError: false });
    r(<EngagementScoreWidget workspaceId="ws-1" />);
    const bar = screen.getByRole('progressbar', { name: /engagement/i });
    expect(bar).toHaveAttribute('aria-valuenow', '72');
  });
});

// ── RetentionMetricsWidget ───────────────────────────────────────────────────

describe('RetentionMetricsWidget', () => {
  it('renders the section heading', () => {
    r(<RetentionMetricsWidget workspaceId="ws-1" />);
    expect(screen.getByRole('region', { name: /retention/i })).toBeInTheDocument();
  });

  it('shows loading skeleton when isLoading', () => {
    useHeartMetrics.mockReturnValue({ data: undefined, isLoading: true, isError: false });
    r(<RetentionMetricsWidget workspaceId="ws-1" />);
    expect(screen.getByRole('region').querySelector('[aria-busy]')).toBeTruthy();
  });

  it('shows error alert when isError', () => {
    useHeartMetrics.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    r(<RetentionMetricsWidget workspaceId="ws-1" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders the retention score', () => {
    useHeartMetrics.mockReturnValue({ data: MOCK_HEART, isLoading: false, isError: false });
    r(<RetentionMetricsWidget workspaceId="ws-1" />);
    expect(screen.getByLabelText('90%')).toBeInTheDocument();
  });

  it('shows this-week and last-week counts', () => {
    useHeartMetrics.mockReturnValue({ data: MOCK_HEART, isLoading: false, isError: false });
    r(<RetentionMetricsWidget workspaceId="ws-1" />);
    expect(screen.getByText('18')).toBeInTheDocument(); // thisWeek
    expect(screen.getByText('20')).toBeInTheDocument(); // lastWeek
  });

  it('renders strong-retention message when score >= 80', () => {
    useHeartMetrics.mockReturnValue({ data: MOCK_HEART, isLoading: false, isError: false });
    r(<RetentionMetricsWidget workspaceId="ws-1" />);
    expect(screen.getByText(/strong retention/i)).toBeInTheDocument();
  });

  it('renders low-retention message when score < 50', () => {
    const lowData = { ...MOCK_HEART, retention: { score: 30, thisWeek: 6, lastWeek: 20 } };
    useHeartMetrics.mockReturnValue({ data: lowData, isLoading: false, isError: false });
    r(<RetentionMetricsWidget workspaceId="ws-1" />);
    expect(screen.getByText(/low retention/i)).toBeInTheDocument();
  });
});

// ── TaskSuccessWidget ────────────────────────────────────────────────────────

describe('TaskSuccessWidget', () => {
  it('renders the section heading', () => {
    r(<TaskSuccessWidget workspaceId="ws-1" />);
    expect(screen.getByRole('region', { name: /task success rate/i })).toBeInTheDocument();
  });

  it('shows loading skeleton when isLoading', () => {
    useHeartMetrics.mockReturnValue({ data: undefined, isLoading: true, isError: false });
    r(<TaskSuccessWidget workspaceId="ws-1" />);
    expect(screen.getByRole('region').querySelector('[aria-busy]')).toBeTruthy();
  });

  it('shows error alert when isError', () => {
    useHeartMetrics.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    r(<TaskSuccessWidget workspaceId="ws-1" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders the task success score', () => {
    useHeartMetrics.mockReturnValue({ data: MOCK_HEART, isLoading: false, isError: false });
    r(<TaskSuccessWidget workspaceId="ws-1" />);
    expect(screen.getByLabelText('55%')).toBeInTheDocument();
  });

  it('shows done and total counts', () => {
    useHeartMetrics.mockReturnValue({ data: MOCK_HEART, isLoading: false, isError: false });
    r(<TaskSuccessWidget workspaceId="ws-1" />);
    expect(screen.getByText('11')).toBeInTheDocument(); // done
    expect(screen.getByText('20')).toBeInTheDocument(); // total
  });

  it('renders a progressbar for the task success rate', () => {
    useHeartMetrics.mockReturnValue({ data: MOCK_HEART, isLoading: false, isError: false });
    r(<TaskSuccessWidget workspaceId="ws-1" />);
    const bar = screen.getByRole('progressbar', { name: /task success rate/i });
    expect(bar).toHaveAttribute('aria-valuenow', '55');
  });
});
