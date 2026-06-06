import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DashboardView from './dashboard-view';

const noop = () => {};
const baseProps = {
  currentUser: { id: 'USR-1', fullName: 'Deepak Pandey' },
  userRole: { tier: 5 },
  dashboardRole: 'developer',
  dashLoading: false,
  developerDash: { myOpenItemCount: 3, myOpenItems: [], mySprintItems: [], blockers: [], recentWorklogs: [], weeklyMinutes: 0 },
  smDash: null,
  poDash: null,
  execDash: null,
  adminDash: null,
  workItems: [],
  selectedItem: null,
  setIsCreateOpen: noop,
  setDashboardRole: noop,
  fetchDashboard: noop,
  setView: noop,
  setSelectedItem: noop,
  setIsWorklogOpen: noop,
  showToast: noop,
  fetchBacklog: noop,
  fetchSprints: noop,
  fetchMembers: noop,
};

describe('DashboardView', () => {
  it('greets the user and renders the developer StatCards', () => {
    render(<DashboardView {...baseProps} />);
    expect(screen.getByRole('heading', { name: /Deepak/ })).toBeInTheDocument();
    // "My Open Items" / "Blockers" appear as both a StatCard and a panel heading; assert on the
    // StatCards' unique sub-labels instead.
    expect(screen.getByText('Assigned to me')).toBeInTheDocument();
    expect(screen.getByText('Items blocked on me')).toBeInTheDocument();
  });

  it('shows role tabs filtered by the user tier and switches role on click', () => {
    const setDashboardRole = vi.fn();
    const fetchDashboard = vi.fn();
    render(<DashboardView {...baseProps} setDashboardRole={setDashboardRole} fetchDashboard={fetchDashboard} />);
    fireEvent.click(screen.getByRole('button', { name: 'Admin' }));
    expect(setDashboardRole).toHaveBeenCalledWith('admin');
    expect(fetchDashboard).toHaveBeenCalledWith('admin');
  });

  it('hides higher-tier tabs for a low-tier user', () => {
    render(<DashboardView {...baseProps} userRole={{ tier: 1 }} />);
    expect(screen.getByRole('button', { name: 'Developer' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Admin' })).toBeNull();
  });

  it('shows a loading state while the dashboard is fetching', () => {
    render(<DashboardView {...baseProps} dashLoading={true} />);
    expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
  });
});
