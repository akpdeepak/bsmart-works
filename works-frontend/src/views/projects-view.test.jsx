import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProjectsView from './projects-view';

const noop = () => {};
const baseProps = {
  projects: [],
  workItems: [],
  setIsProjectOpen: noop,
  handleArchiveProject: noop,
  userName: () => 'Someone',
};

describe('ProjectsView', () => {
  it('shows the empty state with a create CTA', () => {
    render(<ProjectsView {...baseProps} />);
    expect(screen.getByText('No teams yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create first team' })).toBeInTheDocument();
  });

  it('renders a project card with its item progress', () => {
    render(
      <ProjectsView
        {...baseProps}
        projects={[{ id: 'PRJ-1', name: 'Apollo', keyPrefix: 'AP' }]}
        workItems={[
          { id: 'W1', projectId: 'PRJ-1', status: 'Done' },
          { id: 'W2', projectId: 'PRJ-1', status: 'Todo' },
        ]}
      />,
    );
    expect(screen.getByText('Apollo')).toBeInTheDocument();
    expect(screen.getByText('2 items')).toBeInTheDocument();
    expect(screen.getByText('50% complete')).toBeInTheDocument();
    expect(screen.getByLabelText('Project command center for Apollo')).toBeInTheDocument();
    expect(screen.getByText(/On track: 50% complete/)).toBeInTheDocument();
    expect(screen.getByText('Project room ready')).toBeInTheDocument();
    expect(screen.getByText('Customer update draft can cite these signals')).toBeInTheDocument();
  });

  it('explains at-risk project health from blockers and SLA signals', () => {
    render(
      <ProjectsView
        {...baseProps}
        projects={[{ id: 'PRJ-1', name: 'Apollo', keyPrefix: 'AP' }]}
        projectMetrics={{ 'PRJ-1': { completionPct: 33 } }}
        workItems={[
          { id: 'W1', projectId: 'PRJ-1', type: 'STORY', status: 'Blocked' },
          { id: 'W2', projectId: 'PRJ-1', type: 'BUG', status: 'In Progress', slaBreachFlag: true },
          { id: 'W3', projectId: 'PRJ-1', type: 'DECISION', status: 'Todo', pullRequestUrl: 'https://github.com/acme/repo/pull/8' },
        ]}
      />,
    );

    expect(screen.getByText(/At risk: 1 blocker and 1 SLA risk need attention/)).toBeInTheDocument();
    expect(screen.getByText('1 at risk')).toBeInTheDocument();
    expect(screen.getByText('1 pending')).toBeInTheDocument();
    expect(screen.getByText('1 linked items')).toBeInTheDocument();
    expect(screen.getByText(/Sources: project fields, 3 work items, project metrics, 1 DevSync-linked item/)).toBeInTheDocument();
  });

  it('counts custom done-category statuses via the status resolver', () => {
    // A workflow that renames its done status to "Shipped" must still roll up as complete.
    const statusResolver = {
      categoryOf: (_type, status) => (status === 'Shipped' ? 'done' : 'todo'),
    };
    render(
      <ProjectsView
        {...baseProps}
        statusResolver={statusResolver}
        projects={[{ id: 'PRJ-1', name: 'Apollo', keyPrefix: 'AP' }]}
        workItems={[
          { id: 'W1', projectId: 'PRJ-1', type: 'STORY', status: 'Shipped' },
          { id: 'W2', projectId: 'PRJ-1', type: 'STORY', status: 'Backlog' },
        ]}
      />,
    );
    expect(screen.getByText('50% complete')).toBeInTheDocument();
  });

  it('opens the new-project flow from the header button', () => {
    const setIsProjectOpen = vi.fn();
    render(<ProjectsView {...baseProps} setIsProjectOpen={setIsProjectOpen} />);
    fireEvent.click(screen.getByRole('button', { name: '+ New Team' }));
    expect(setIsProjectOpen).toHaveBeenCalledWith(true);
  });
});
