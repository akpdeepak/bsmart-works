import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import DashboardsView from './dashboards-view';

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
