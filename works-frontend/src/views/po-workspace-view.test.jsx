import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PoWorkspaceView from './po-workspace-view';

const noop = () => {};
const baseProps = {
  i15ProjectId: '', projects: [], poTab: 'roadmap', roadmapThemes: [], newTheme: { name: '', quarter: '', description: '' },
  ideas: [], newIdea: { title: '', description: '' }, feedbackItems: [], feedbackClusters: null,
  newFeedback: { customer: '', source: 'PORTAL', content: '' }, objectives: [], activeObjective: null,
  newObjective: { title: '', quarter: '' }, newKr: { title: '' }, releaseNotesName: '', releaseNotesResult: null,
  setI15ProjectId: noop, setPoTab: noop, setNewTheme: noop, setNewIdea: noop, setNewFeedback: noop,
  setNewObjective: noop, setNewKr: noop, setReleaseNotesName: noop, setView: noop, setPmProjectId: noop,
  updateThemeStatus: noop, createTheme: noop, deleteTheme: noop, voteIdea: noop, promoteIdea: noop,
  createIdea: noop, clusterFeedback: noop, createFeedback: noop, openObjective: noop,
  updateKrProgress: noop, addKeyResult: noop, createObjective: noop, runReleaseNotes: noop,
  fetchStakeholders: noop,
};

const sampleThemes = [
  { id: 'THM-1', name: 'Mobile-first portal', status: 'IN_PROGRESS', quarter: '2026-Q2', description: 'Replatform portal onto PWA.', startDate: '2026-04-01', targetDate: '2026-06-30', color: '#1E4D8C' },
  { id: 'THM-2', name: 'SAML SSO rollout',    status: 'PLANNED',     quarter: '2026-Q3', description: null, startDate: null, targetDate: null, color: null },
  { id: 'THM-3', name: 'Unscheduled spike',   status: 'ON_HOLD',     quarter: null,      description: 'Exploratory.', startDate: null, targetDate: null, color: null },
];

describe('PoWorkspaceView', () => {
  it('uses the sanctioned dashboard page shell', () => {
    const { container } = render(<PoWorkspaceView {...baseProps} />);
    expect(container.firstChild).toHaveClass('max-w-workspace', 'px-6', 'py-6');
  });

  it('renders the roadmap tab empty state by default', () => {
    render(<PoWorkspaceView {...baseProps} />);
    expect(screen.getByRole('heading', { name: 'Product Owner Workspace' })).toBeInTheDocument();
    expect(screen.getByText('No themes yet')).toBeInTheDocument();
  });

  it('switches tabs via the tab bar', () => {
    const setPoTab = vi.fn();
    render(<PoWorkspaceView {...baseProps} setPoTab={setPoTab} />);
    fireEvent.click(screen.getByRole('button', { name: 'OKRs' }));
    expect(setPoTab).toHaveBeenCalledWith('okr');
  });

  it('renders the ideas tab with its empty inbox', () => {
    render(<PoWorkspaceView {...baseProps} poTab="ideas" />);
    expect(screen.getByText('Empty inbox')).toBeInTheDocument();
  });

  it('groups themes by quarter with section headings', () => {
    render(<PoWorkspaceView {...baseProps} roadmapThemes={sampleThemes} />);
    expect(screen.getByRole('heading', { name: '2026-Q2' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '2026-Q3' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Unscheduled' })).toBeInTheDocument();
    expect(screen.getByText('Mobile-first portal')).toBeInTheDocument();
    expect(screen.getByText('SAML SSO rollout')).toBeInTheDocument();
    expect(screen.getByText('Unscheduled spike')).toBeInTheDocument();
  });

  it('shows date range when both dates are present', () => {
    render(<PoWorkspaceView {...baseProps} roadmapThemes={sampleThemes} />);
    expect(screen.getByText('2026-04-01')).toBeInTheDocument();
    expect(screen.getByText('2026-06-30')).toBeInTheDocument();
  });

  it('calls deleteTheme with the correct id when delete button is clicked', () => {
    const deleteTheme = vi.fn();
    render(<PoWorkspaceView {...baseProps} roadmapThemes={sampleThemes} deleteTheme={deleteTheme} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete Mobile-first portal' }));
    expect(deleteTheme).toHaveBeenCalledWith('THM-1');
  });

  it('calls updateThemeStatus when the status select changes', () => {
    const updateThemeStatus = vi.fn();
    render(<PoWorkspaceView {...baseProps} roadmapThemes={sampleThemes} updateThemeStatus={updateThemeStatus} />);
    const selects = screen.getAllByRole('combobox', { name: /Change status for/i });
    fireEvent.change(selects[0], { target: { value: 'SHIPPED' } });
    expect(updateThemeStatus).toHaveBeenCalledWith(sampleThemes[0], 'SHIPPED');
  });

  it('renders status badges for themes', () => {
    render(<PoWorkspaceView {...baseProps} roadmapThemes={sampleThemes} />);
    // Use getAllByText because the same values appear in both badges and select options
    expect(screen.getAllByText('IN PROGRESS').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('PLANNED').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('ON HOLD').length).toBeGreaterThanOrEqual(1);
  });
});
