import { describe, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { expectNoA11yViolations } from '@/test/a11y';

// The pivot strip fetches via resolvePivotBatch — stub it so the view renders deterministically.
vi.mock('@/lib/pivot', async () => {
  const actual = await vi.importActual('@/lib/pivot');
  return {
    ...actual,
    resolvePivotBatch: vi.fn(() => Promise.resolve([
      { id: 'byStatus', data: { dimensions: ['status'], measures: ['count'], rows: [{ status: 'Open', count: 3 }] } },
      { id: 'byType', data: { dimensions: ['type'], measures: ['count'], rows: [{ type: 'Bug', count: 2 }] } },
    ])),
  };
});

import ReportsView from './reports-view';

const SPRINTS = [{ id: 'S-1', name: 'Sprint 1' }, { id: 'S-2', name: 'Sprint 2' }];
const VELOCITY = [
  { sprintId: 'S-1', sprintName: 'Sprint 1', status: 'COMPLETED', capacity: 30, totalPoints: 28, donePoints: 25 },
];
const SPRINT_REPORT = {
  totalItems: 10, doneItems: 6, inProgressItems: 2, todoItems: 2, completionRate: 60, velocityRate: 70,
  totalPoints: 28, donePoints: 25, sprint: { capacity: 30 },
  items: [{ id: 'WI-1', type: 'BUG', title: 'A bug', status: 'Done', story_points: 3 }],
};

const baseProps = {
  velocityData: VELOCITY, sprints: SPRINTS, selectedSprintId: 'S-1', sprintReport: SPRINT_REPORT,
  scopeChanges: [], activeWorkspaceId: 'ws-1', setSelectedSprintId: () => {}, fetchSprintReport: () => {},
};

describe('ReportsView a11y', () => {
  it('the sprint report (charts + KPI cards + outcomes table) has no serious/critical violations', async () => {
    const { container } = render(<ReportsView {...baseProps} />);
    await screen.findByText('A bug');
    await expectNoA11yViolations(container);
  });

  it('the empty state (no sprints) has no serious/critical violations', async () => {
    const { container } = render(<ReportsView {...baseProps} sprints={[]} velocityData={[]} sprintReport={null} />);
    await expectNoA11yViolations(container);
  });
});
