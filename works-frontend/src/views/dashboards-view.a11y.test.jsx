import { describe, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import DashboardsView from './dashboards-view';
import { expectNoA11yViolations } from '@/test/a11y';

// AI panels (suggestion / conversational / summary) are gated on capabilities and covered by their
// own organism a11y tests; this view sweep leaves them off to focus on the dashboard shell,
// widget grid, scope controls, and the share panel.
const noop = () => {};
const WORK_ITEMS = [
  { id: 'WI-1', title: 'Login bug', status: 'Open', priority: 'HIGH', type: 'BUG', assigneeId: 'u-1' },
  { id: 'WI-2', title: 'Done thing', status: 'Done', priority: 'LOW', type: 'STORY', assigneeId: 'u-1' },
];
const DASHBOARDS = [
  { id: 'D-1', name: 'Team health', scope: 'TEAM', updatedAt: '2026-06-10T10:00:00Z' },
  { id: 'D-2', name: 'My work', scope: 'PERSONAL', updatedAt: '2026-06-11T10:00:00Z' },
];

const baseProps = {
  customDashboards: DASHBOARDS, selectedDashboard: null, dashboardEditMode: false,
  dashboardScope: 'PROJECT', dashboardTeamId: null, dashboardAggregate: null, dashboardDrill: null,
  shareInfo: null, teams: [{ id: 'TEAM-1', name: 'Web' }], workItems: WORK_ITEMS, sprints: [],
  velocityData: [], currentUser: { id: 'u-1' }, activeWorkspaceId: 'ws-1', aiCapabilities: [],
  dashboardRole: 'developer',
  acceptDashboardSuggestion: noop, createDashboard: noop, openDashboard: noop, deleteDashboard: noop,
  addDashboardWidget: noop, removeDashboardWidget: noop, resizeDashboardWidget: noop,
  updateDashboardWidgetConfig: noop, reorderDashboardWidgets: noop, setDashboardEditMode: noop,
  setSelectedDashboard: noop, setDashboardScope: noop, setDashboardTeamId: noop, setDashboardDrill: noop,
  setDragWidgetId: noop, fetchDashboardAggregate: noop, mintShare: noop, stopShare: noop,
  showToast: noop, onConversationalDashboardSaved: noop,
};

const OPEN = {
  ...baseProps,
  selectedDashboard: {
    id: 'D-1', name: 'Team health',
    widgets: [
      { id: 'w-1', widgetType: 'STATUS_BAR', title: 'By status', gridW: 6, config: JSON.stringify({ dimension: 'status' }) },
      { id: 'w-2', widgetType: 'SCORECARD', title: 'Open', gridW: 4, config: JSON.stringify({ filter: { open: true } }) },
    ],
  },
};

describe('DashboardsView a11y', () => {
  it('the dashboards list has no serious/critical violations', async () => {
    const { container } = render(<DashboardsView {...baseProps} />);
    await screen.findByText('Team health');
    await expectNoA11yViolations(container);
  });

  it('the empty list has no serious/critical violations', async () => {
    const { container } = render(<DashboardsView {...baseProps} customDashboards={[]} />);
    await expectNoA11yViolations(container);
  });

  it('an open dashboard (widget grid + scope + share controls) has no serious/critical violations', async () => {
    const { container } = render(<DashboardsView {...OPEN} />);
    await screen.findByText('By status');
    await expectNoA11yViolations(container);
  });

  it('an open dashboard with the share panel expanded has no serious/critical violations', async () => {
    const { container } = render(<DashboardsView {...OPEN} shareInfo={{ id: 'D-1', token: 'abc123' }} />);
    await screen.findByLabelText('Public dashboard link');
    await expectNoA11yViolations(container);
  });
});
