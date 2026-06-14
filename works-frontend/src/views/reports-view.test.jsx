import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
    render(<ReportsView {...baseProps} sprints={[{ id: 'S1', name: 'Sprint 1', status: 'ACTIVE' }]} setSelectedSprintId={setSelectedSprintId} fetchSprintReport={fetchSprintReport} />);
    // Open the searchable picker, then choose the sprint option.
    fireEvent.click(screen.getByRole('button', { name: /pick a sprint/i }));
    fireEvent.click(screen.getByRole('option', { name: /Sprint 1/i }));
    expect(setSelectedSprintId).toHaveBeenCalledWith('S1');
    expect(fetchSprintReport).toHaveBeenCalledWith('S1');
  });

  it('renders the KPI cards when a report is loaded', () => {
    render(
      <ReportsView
        {...baseProps}
        sprints={[{ id: 'S1', name: 'Sprint 1', status: 'ACTIVE' }]}
        selectedSprintId="S1"
        sprintReport={{ sprint: { goal: 'Ship it', capacity: 20 }, totalItems: 10, doneItems: 6, completionRate: 60, donePoints: 12, totalPoints: 20, inProgressItems: 2, todoItems: 2, velocityRate: 60, items: [] }}
      />,
    );
    expect(screen.getByText('Total Items')).toBeInTheDocument();
    // "Completion" now appears on both the at-a-glance ring and the KPI card.
    expect(screen.getAllByText('Completion').length).toBeGreaterThanOrEqual(1);
    // Velocity card shows delivered/committed points without the unit suffix.
    expect(screen.getByText('12/20')).toBeInTheDocument();
    // The visual at-a-glance ring section is present.
    expect(screen.getByText('At a glance')).toBeInTheDocument();
  });

  it('renders the sprint picker at the top, before the report', () => {
    render(<ReportsView {...baseProps} sprints={[{ id: 'S1', name: 'Sprint 1', status: 'ACTIVE' }]} />);
    // The picker is the primary control — present without a report loaded.
    expect(screen.getByRole('button', { name: /pick a sprint/i })).toBeInTheDocument();
  });

  it('auto-selects the ACTIVE sprint on first load', async () => {
    const fetchSprintReport = vi.fn();
    const setSelectedSprintId = vi.fn();
    render(<ReportsView {...baseProps}
      sprints={[{ id: 'S1', name: 'Sprint 1', status: 'COMPLETED' }, { id: 'S2', name: 'Sprint 2', status: 'ACTIVE' }]}
      setSelectedSprintId={setSelectedSprintId} fetchSprintReport={fetchSprintReport} />);
    await waitFor(() => expect(fetchSprintReport).toHaveBeenCalledWith('S2'));
    expect(setSelectedSprintId).toHaveBeenCalledWith('S2');
  });

  it('does not override an already-selected sprint', async () => {
    const fetchSprintReport = vi.fn();
    render(<ReportsView {...baseProps} selectedSprintId="S1"
      sprints={[{ id: 'S1', name: 'Sprint 1', status: 'COMPLETED' }, { id: 'S2', name: 'Sprint 2', status: 'ACTIVE' }]}
      fetchSprintReport={fetchSprintReport} />);
    // Give the deferred effect a tick; it must NOT auto-fetch since a sprint is already chosen.
    await new Promise((r) => setTimeout(r, 10));
    expect(fetchSprintReport).not.toHaveBeenCalled();
  });
});
