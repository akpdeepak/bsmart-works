import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ReportsView from './reports-view';

const noop = () => {};
const baseProps = {
  velocityData: [],
  sprints: [],
  selectedSprintId: null,
  sprintReport: null,
  scopeChanges: [],
  setSelectedSprintId: noop,
  fetchSprintReport: noop,
};

describe('ReportsView', () => {
  it('shows the empty state when there are no sprints', () => {
    render(<ReportsView {...baseProps} />);
    expect(screen.getByText('No sprints to report on')).toBeInTheDocument();
  });

  it('prompts to pick a sprint when one exists but no report is loaded', () => {
    render(<ReportsView {...baseProps} sprints={[{ id: 'S1', name: 'Sprint 1' }]} />);
    expect(screen.getByText('Select a sprint above to view its report.')).toBeInTheDocument();
  });

  it('fetches a report when a sprint chip is clicked', () => {
    const fetchSprintReport = vi.fn();
    const setSelectedSprintId = vi.fn();
    render(<ReportsView {...baseProps} sprints={[{ id: 'S1', name: 'Sprint 1' }]} setSelectedSprintId={setSelectedSprintId} fetchSprintReport={fetchSprintReport} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sprint 1' }));
    expect(setSelectedSprintId).toHaveBeenCalledWith('S1');
    expect(fetchSprintReport).toHaveBeenCalledWith('S1');
  });

  it('renders the KPI cards when a report is loaded', () => {
    render(
      <ReportsView
        {...baseProps}
        sprints={[{ id: 'S1', name: 'Sprint 1' }]}
        selectedSprintId="S1"
        sprintReport={{ totalItems: 10, doneItems: 6, completionRate: 60, donePoints: 12, totalPoints: 20, inProgressItems: 2, todoItems: 2, velocityRate: 60, items: [] }}
      />,
    );
    expect(screen.getByText('Total Items')).toBeInTheDocument();
    expect(screen.getByText('Completion')).toBeInTheDocument();
    expect(screen.getByText('12/20pt')).toBeInTheDocument();
  });
});
