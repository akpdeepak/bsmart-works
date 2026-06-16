import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DashboardView from './dashboard-view';

// DashboardView's developer surface mounts TodayNudges, which uses TanStack Query — so renders need
// a QueryClientProvider. retry:false keeps the test fast; the AI nudges client degrades to a
// fallback when the request fails, so no network is required.
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const renderWithClient = (ui) => render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);

const noop = () => {};
const baseProps = {
  currentUser: { id: 'USR-1', fullName: 'Deepak Pandey' },
  dashboardRole: 'developer',
  dashLoading: false,
  setDashboardRole: noop,
  fetchDashboard: noop,
  smDash: null,
  poDash: null,
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
  it('greets the user and renders the KPI cards', () => {
    renderWithClient(<DashboardView {...baseProps} />);
    expect(screen.getByRole('heading', { name: /Deepak/ })).toBeInTheDocument();
    expect(screen.getByText('Open work items')).toBeInTheDocument();
    expect(screen.getByText('Items blocked on me')).toBeInTheDocument();
  });

  it('lists assigned items in the needs-attention table and opens one on click', () => {
    const setSelectedItem = vi.fn();
    renderWithClient(<DashboardView {...baseProps} setSelectedItem={setSelectedItem} />);
    const row = screen.getByText('Fix login');
    expect(row).toBeInTheDocument();
    fireEvent.click(row);
    expect(setSelectedItem).toHaveBeenCalled();
  });

  it('renders the active-sprint ring with the completion percent', () => {
    renderWithClient(<DashboardView {...baseProps} />);
    expect(screen.getByText('Active sprint')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument(); // 6 of 12 items
    expect(screen.getByText(/6\/12 items/)).toBeInTheDocument();
  });

  it('shows the empty state when nothing is assigned', () => {
    renderWithClient(<DashboardView {...baseProps} developerDash={{ ...baseProps.developerDash, myOpenItems: [], myOpenItemCount: 0 }} />);
    expect(screen.getByText(/All caught up/)).toBeInTheDocument();
  });
});
