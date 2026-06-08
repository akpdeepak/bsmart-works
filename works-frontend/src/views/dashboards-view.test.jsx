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
    expect(screen.getByRole('heading', { name: /dashboards/i })).toBeInTheDocument();
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
