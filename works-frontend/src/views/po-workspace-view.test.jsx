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
  updateThemeStatus: noop, createTheme: noop, voteIdea: noop, promoteIdea: noop, createIdea: noop,
  clusterFeedback: noop, createFeedback: noop, openObjective: noop, updateKrProgress: noop,
  addKeyResult: noop, createObjective: noop, runReleaseNotes: noop, fetchStakeholders: noop,
};

describe('PoWorkspaceView', () => {
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
});
