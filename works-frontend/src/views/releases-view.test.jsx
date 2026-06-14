import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ReleasesView from './releases-view';

const noop = () => {};
const baseProps = {
  releases: [],
  releaseSearch: '',
  selectedRelease: null,
  releaseItems: [],
  projects: [],
  workItems: [],
  setIsReleaseOpen: noop,
  setReleaseSearch: noop,
  setSelectedRelease: noop,
  setSelectedItem: noop,
  fetchReleases: noop,
  fetchReleaseItems: noop,
  updateRelease: noop,
  deleteRelease: noop,
  removeItemFromRelease: noop,
  addItemToRelease: noop,
  onPressKey: noop,
};

describe('ReleasesView', () => {
  it('shows the empty state when no release is selected, with labelled controls', () => {
    render(<ReleasesView {...baseProps} />);
    expect(screen.getByText('Select a release')).toBeInTheDocument();
    expect(screen.getByLabelText('Search releases')).toBeInTheDocument();
    expect(screen.getByLabelText('Filter releases by project')).toBeInTheDocument();
  });

  it('renders the selected release detail with its linked items', () => {
    const selected = { id: 'REL-1', name: 'v1 launch', version: '1.0', status: 'IN_PROGRESS' };
    render(
      <ReleasesView
        {...baseProps}
        releases={[selected]}
        selectedRelease={selected}
        releaseItems={[{ id: 'WRK-1', title: 'Ship it', type: 'Story', status: 'Done' }]}
      />,
    );
    expect(screen.getByRole('heading', { name: 'v1 launch' })).toBeInTheDocument();
    expect(screen.getByText('Ship it')).toBeInTheDocument();
    expect(screen.getByText('1/1 done')).toBeInTheDocument();
  });

  it('filters the add-to-release picker by the search box', () => {
    const selected = { id: 'REL-1', name: 'v1 launch', version: '1.0', status: 'IN_PROGRESS' };
    render(
      <ReleasesView
        {...baseProps}
        releases={[selected]}
        selectedRelease={selected}
        releaseItems={[]}
        workItems={[
          { id: 'WRK-1', title: 'Login page', type: 'Story', status: 'Todo' },
          { id: 'WRK-2', title: 'Billing export', type: 'Story', status: 'Todo' },
        ]}
      />,
    );
    // Both candidates visible initially.
    expect(screen.getByText('Login page')).toBeInTheDocument();
    expect(screen.getByText('Billing export')).toBeInTheDocument();
    // Searching narrows to the match.
    fireEvent.change(screen.getByLabelText('Search work items to add to this release'), {
      target: { value: 'billing' },
    });
    expect(screen.queryByText('Login page')).not.toBeInTheDocument();
    expect(screen.getByText('Billing export')).toBeInTheDocument();
  });

  it('opens the new-release flow from the empty-state CTA', () => {
    const setIsReleaseOpen = vi.fn();
    render(<ReleasesView {...baseProps} setIsReleaseOpen={setIsReleaseOpen} />);
    fireEvent.click(screen.getByRole('button', { name: 'New Release' }));
    expect(setIsReleaseOpen).toHaveBeenCalledWith(true);
  });
});
