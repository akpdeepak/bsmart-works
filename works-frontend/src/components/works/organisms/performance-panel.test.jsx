import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PerformancePanel } from './performance-panel';
import { kpiClient } from '@/lib/kpi';
import { api } from '@/lib/apiClient';

vi.mock('@/lib/kpi', async () => {
  const actual = await vi.importActual('@/lib/kpi');
  return {
    ...actual,
    kpiClient: { personal: vi.fn(), org: vi.fn(), manager: vi.fn(), team: vi.fn(), project: vi.fn() },
  };
});

vi.mock('@/lib/apiClient', () => ({ api: { send: vi.fn() } }));

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
    return Promise.resolve([]);
  });
  kpiClient.personal.mockResolvedValue(PERSONAL);
  kpiClient.org.mockResolvedValue({ ...PERSONAL, label: 'Organization' });
  kpiClient.manager.mockResolvedValue([]);
  kpiClient.team.mockResolvedValue(TEAM_LAYER);
  kpiClient.project.mockResolvedValue(PROJECT_LAYER);
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
});
