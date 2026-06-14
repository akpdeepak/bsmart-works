import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PmView from './pm-view';

const noop = () => {};

const baseProps = {
  pmProjectId: '',
  pmTab: 'raid',
  raidDashboard: null,
  risks: [],
  assumptions: [],
  pmIssues: [],
  dependencies: [],
  decisions: [],
  meetings: [],
  actionItems: [],
  stakeholders: [],
  lessonsLearned: [],
  crossProjectDeps: [],
  selectedMeeting: null,
  meetingNotes: [],
  pmFormOpen: null,
  pmForm: {},
  isCrossProjOpen: false,
  crossProjForm: { title: '', description: '', targetProjectId: '', deadline: '', isBlocker: false },
  projects: [],
  users: [],
  setPmProjectId: noop,
  setPmTab: noop,
  setSelectedMeeting: noop,
  setMeetingNotes: noop,
  setPmFormOpen: noop,
  setPmForm: noop,
  setIsCrossProjOpen: noop,
  setCrossProjForm: noop,
  fetchRaidDashboard: noop,
  fetchRisks: noop,
  fetchAssumptions: noop,
  fetchPmIssues: noop,
  fetchDependencies: noop,
  fetchDecisions: noop,
  fetchMeetings: noop,
  fetchActionItems: noop,
  fetchStakeholders: noop,
  fetchLessons: noop,
  fetchCrossProjectDeps: noop,
  pmDelete: noop,
  pmCreate: noop,
  createCrossProjectDep: noop,
  reportError: noop,
  showToast: noop,
  api: { raw: () => Promise.resolve({ json: () => ({}) }), send: () => Promise.resolve() },
};

describe('PmView', () => {
  it('renders the Project Management heading', () => {
    render(<PmView {...baseProps} />);
    expect(screen.getByRole('heading', { name: /^project management$/i, level: 1 })).toBeInTheDocument();
  });

  it('shows empty state when no project selected', () => {
    render(<PmView {...baseProps} />);
    expect(screen.getByText(/select a project/i)).toBeInTheDocument();
  });

  it('renders project selector', () => {
    render(<PmView {...baseProps} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('surfaces a save status for meeting notes instead of saving silently', async () => {
    const selected = { id: 'MTG-1', title: 'Kickoff', meetingType: 'GENERAL' };
    render(
      <PmView
        {...baseProps}
        pmProjectId="PRJ-1"
        projects={[{ id: 'PRJ-1', name: 'Apollo' }]}
        pmTab="meeting-detail"
        selectedMeeting={selected}
        meetingNotes={[]}
      />,
    );
    const agenda = screen.getByPlaceholderText('Enter agenda...');
    fireEvent.change(agenda, { target: { value: 'Discuss roadmap' } });
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    fireEvent.blur(agenda);
    expect(await screen.findByText('Saved')).toBeInTheDocument();
  });
});
