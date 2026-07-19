import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TIER } from '@/lib/nav-model';
import { expectNoA11yViolations } from '@/test/a11y';
import DashboardView from './dashboard-view';

function Wrapper({ children }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('Today accessibility', () => {
  it('keeps a populated attention surface free of serious accessibility violations', async () => {
    const { container } = render(
      <DashboardView
        currentUser={{ id: 'USR-1', fullName: 'Deepak Pandey' }}
        activeWorkspaceId=""
        userRole={{ tier: TIER.MEMBER, permissions: [] }}
        dashboardRole="developer"
        dashLoading={false}
        developerDash={{
          myOpenItemCount: 1,
          myOpenItems: [{ id: 'WRK-1', title: 'Fix login', status: 'In Progress', priority: 'HIGH' }],
          mySprintItems: [{ id: 'WRK-1' }],
          blockers: [],
          recentWorklogs: [],
          weeklyMinutes: 60,
          activeSprint: { name: 'Sprint 24', done_items: 1, total_items: 2 },
        }}
        workItems={[]}
        fetchDashboard={() => {}}
        setDashboardRole={() => {}}
        setView={() => {}}
        setSelectedItem={() => {}}
        setIsCreateOpen={() => {}}
        setIsWorklogOpen={() => {}}
        showToast={() => {}}
      />,
      { wrapper: Wrapper },
    );

    await expectNoA11yViolations(container);
  });
});
