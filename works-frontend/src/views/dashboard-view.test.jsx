import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TIER } from '@/lib/nav-model';
import { availableTodayRoles } from '@/lib/today-roles';
import DashboardView from './dashboard-view';

function Wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const noop = () => {};
const baseProps = {
  currentUser: { id: 'USR-1', fullName: 'Deepak Pandey' },
  activeWorkspaceId: 'WS-A',
  userRole: { tier: TIER.MEMBER, permissions: [] },
  dashboardRole: 'developer',
  dashLoading: false,
  setDashboardRole: noop,
  fetchDashboard: noop,
  smDash: null,
  poDash: null,
  supportDash: null,
  execDash: null,
  adminDash: null,
  developerDash: {
    myOpenItemCount: 2,
    myOpenItems: [{ id: 'WRK-1', title: 'Fix login', type: 'Bug', status: 'In Progress', priority: 'HIGH' }],
    mySprintItems: [{ id: 'WRK-1' }],
    blockers: [],
    recentWorklogs: [],
    weeklyMinutes: 120,
    activeSprint: { name: 'Sprint 24', goal: 'Ship SAML', done_items: 6, total_items: 12, done_points: 24, total_points: 40 },
  },
  workItems: [],
  selectedItem: null,
  setIsCreateOpen: noop,
  setView: noop,
  setSelectedItem: noop,
  setIsWorklogOpen: noop,
  showToast: noop,
};

describe('DashboardView (My Works home)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('greets the user and renders the KPI cards', () => {
    render(<DashboardView {...baseProps} />, { wrapper: Wrapper });
    expect(screen.getByRole('heading', { name: /Deepak/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Daily clarity' })).toBeInTheDocument();
    expect(screen.getByText('High-priority work in your queue.')).toBeInTheDocument();
    expect(screen.getByText('Open work items')).toBeInTheDocument();
    expect(screen.getByText('Items blocked on me')).toBeInTheDocument();
  });

  it('lists assigned items in the needs-attention table and opens one on click', () => {
    const setSelectedItem = vi.fn();
    render(<DashboardView {...baseProps} setSelectedItem={setSelectedItem} />, { wrapper: Wrapper });
    const row = screen.getAllByText('Fix login').at(-1);
    expect(row).toBeInTheDocument();
    fireEvent.click(row);
    expect(setSelectedItem).toHaveBeenCalled();
  });

  it('routes the daily clarity primary action into My Works', () => {
    const setView = vi.fn();
    render(<DashboardView {...baseProps} setView={setView} />, { wrapper: Wrapper });
    fireEvent.click(screen.getAllByRole('button', { name: /Plan my day/i })[0]);
    expect(setView).toHaveBeenCalledWith('myworks');
  });

  it('dismisses an attention signal for this workspace, user, and role', () => {
    const showToast = vi.fn();
    render(<DashboardView {...baseProps} showToast={showToast} />, { wrapper: Wrapper });

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss Fix login' }));

    expect(screen.queryByText('High-priority work in your queue.')).not.toBeInTheDocument();
    expect(showToast).toHaveBeenCalledWith('Dismissed from Today');
    expect(localStorage.getItem('bsmart.today.attention.v1:WS-A:USR-1:developer')).toContain('dismissed');
  });

  it('snoozes an attention signal until the next Today visit', () => {
    const showToast = vi.fn();
    render(<DashboardView {...baseProps} showToast={showToast} />, { wrapper: Wrapper });

    fireEvent.click(screen.getByRole('button', { name: 'Snooze Fix login until tomorrow' }));

    expect(screen.queryByText('High-priority work in your queue.')).not.toBeInTheDocument();
    expect(showToast).toHaveBeenCalledWith('Snoozed until tomorrow');
    expect(localStorage.getItem('bsmart.today.attention.v1:WS-A:USR-1:developer')).toContain('snoozed');
  });

  it('renders the active-sprint ring with the completion percent', () => {
    render(<DashboardView {...baseProps} />, { wrapper: Wrapper });
    expect(screen.getByText('Active sprint')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument(); // 6 of 12 items
    expect(screen.getByText(/6\/12 items/)).toBeInTheDocument();
  });

  it('shows the empty state when nothing is assigned', () => {
    render(<DashboardView {...baseProps} developerDash={{ ...baseProps.developerDash, myOpenItems: [], myOpenItemCount: 0 }} />, { wrapper: Wrapper });
    expect(screen.getByText(/All caught up/)).toBeInTheDocument();
  });

  it('offers only role layouts authorized by tier and permission', () => {
    expect(availableTodayRoles({ tier: TIER.MEMBER, permissions: [] }).map(({ role }) => role))
      .toEqual(['developer']);
    expect(availableTodayRoles({ tier: TIER.MEMBER, permissions: ['work_service'] }).map(({ role }) => role))
      .toEqual(['developer', 'support-agent']);
    expect(availableTodayRoles({ tier: TIER.LEAD, permissions: [] }).map(({ role }) => role))
      .toEqual(['developer', 'scrum-master', 'product-owner']);
    expect(availableTodayRoles({ tier: TIER.ADMIN, permissions: ['work_service'] }).map(({ role }) => role))
      .toEqual(['developer', 'scrum-master', 'product-owner', 'support-agent', 'executive', 'admin']);
  });

  it('renders a support-agent queue and routes its action to the support inbox', () => {
    const setView = vi.fn();
    render(
      <DashboardView
        {...baseProps}
        dashboardRole="support-agent"
        userRole={{ tier: TIER.MEMBER, permissions: ['work_service'] }}
        developerDash={null}
        supportDash={{
          escalatedCount: 1,
          openCount: 2,
          assignedToMeCount: 1,
          resolvedTodayCount: 3,
          conversations: [{ id: 'CHAT-1', subject: 'Billing outage', status: 'ESCALATED' }],
        }}
        setView={setView}
      />,
      { wrapper: Wrapper },
    );

    expect(screen.getAllByText('Billing outage').length).toBeGreaterThan(0);
    expect(screen.getByText('Customer conversations')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Open support inbox' })[0]);
    expect(setView).toHaveBeenCalledWith('supportinbox');
  });
});
