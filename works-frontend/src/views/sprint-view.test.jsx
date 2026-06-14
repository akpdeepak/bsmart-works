import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SprintView from './sprint-view';

const noop = () => {};

const baseProps = {
  activeSprint: null,
  sprints: [],
  sprintItems: [],
  sprintMetrics: null,
  sprintMetricsLoading: false,
  swimlaneBy: 'none',
  sprintFilters: { search: '', assignees: [], types: [], priorities: [], mine: false },
  sprintSort: { field: 'none', dir: 'asc' },
  savedFilters: [],
  showSaveFilter: false,
  saveFilterName: '',
  density: 'comfortable',
  workItems: [],
  users: [],
  columns: [
    { name: 'Todo', display: 'TODO' },
    { name: 'In Progress', display: 'IN PROGRESS' },
    { name: 'Done', display: 'DONE' },
  ],
  currentUser: null,
  setActiveSprint: noop,
  setSwimlaneBy: noop,
  setSprintFilters: noop,
  setSprintSort: noop,
  setShowSaveFilter: noop,
  setSaveFilterName: noop,
  setSprintItems: noop,
  setSelectedItem: noop,
  setView: noop,
  fetchSprintItems: noop,
  fetchSprintMetrics: noop,
  fetchBacklog: noop,
  fetchSprints: noop,
  fetchSavedFilters: noop,
  handleSaveFilter: noop,
  handleDragStart: noop,
  handleDragOver: noop,
  handleDelete: noop,
  applyFilter: items => items,
  showToast: noop,
  reportError: noop,
  selectedProjectId: 'PROJ-001',
  headers: () => ({}),
};

describe('SprintView', () => {
  it('shows empty state when no active sprint', () => {
    render(<SprintView {...baseProps} />);
    expect(screen.getByText(/no sprints yet/i)).toBeInTheDocument();
  });

  it('renders active sprint heading and metrics area', () => {
    const sprint = {
      id: 'S-1', name: 'Sprint 1', status: 'ACTIVE',
      goal: 'Ship login', startDate: '2026-06-01', endDate: '2026-06-14',
      capacity: 20, usedPoints: 10,
    };
    render(<SprintView {...baseProps} activeSprint={sprint} sprints={[sprint]} />);
    expect(screen.getByRole('heading', { name: /sprint 1/i })).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
  });

  it('renders the shared filter/sort bar (unified across Deliver surfaces)', () => {
    const sprint = { id: 'S-1', name: 'Sprint 1', status: 'ACTIVE', startDate: null, endDate: null, capacity: 0 };
    render(<SprintView {...baseProps} activeSprint={sprint} sprints={[sprint]} />);
    expect(screen.getByRole('searchbox', { name: /search items/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /my items/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/sort by/i)).toBeInTheDocument();
  });
});
