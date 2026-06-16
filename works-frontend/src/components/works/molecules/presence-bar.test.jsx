// presence-bar.test.jsx — unit tests for the PresenceBar molecule.
// WI-29: SSE presence indicators for the collaborative knowledge editor.

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PresenceBar } from './presence-bar';

const VIEWERS_2 = [
  { userId: 'U-1', name: 'Asha Mehta', editingBlockId: null },
  { userId: 'U-2', name: 'Priya Nair', editingBlockId: 'blk-1' },
];

const VIEWERS_6 = [
  { userId: 'U-1', name: 'Asha Mehta', editingBlockId: null },
  { userId: 'U-2', name: 'Priya Nair', editingBlockId: null },
  { userId: 'U-3', name: 'Ravi Kumar', editingBlockId: null },
  { userId: 'U-4', name: 'Deepak Pandey', editingBlockId: null },
  { userId: 'U-5', name: 'Sunita Rao', editingBlockId: null },
  { userId: 'U-6', name: 'Anil Sharma', editingBlockId: null },
];

describe('PresenceBar', () => {
  it('renders nothing when viewers is empty and lockGranted is true', () => {
    const { container } = render(
      <PresenceBar viewers={[]} lockGranted={true} lockedBy={null} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the status region when viewers are present', () => {
    render(<PresenceBar viewers={VIEWERS_2} lockGranted={true} lockedBy={null} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows the lock banner when lockGranted=false with a lockedBy name', () => {
    render(<PresenceBar viewers={[]} lockGranted={false} lockedBy="Priya Nair" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/Priya Nair is editing/)).toBeInTheDocument();
    expect(screen.getByText(/read-only mode/)).toBeInTheDocument();
  });

  it('does not show the lock banner when lockGranted=true', () => {
    render(<PresenceBar viewers={VIEWERS_2} lockGranted={true} lockedBy={null} />);
    expect(screen.queryByText(/is editing/)).not.toBeInTheDocument();
  });

  it('renders viewer avatars for each viewer', () => {
    render(<PresenceBar viewers={VIEWERS_2} lockGranted={true} lockedBy={null} />);
    // Avatar renders initials; both viewers should produce initials elements
    const avatarContainer = screen.getByLabelText('2 other viewers');
    expect(avatarContainer).toBeInTheDocument();
  });

  it('renders singular "viewer" label for exactly one viewer', () => {
    render(<PresenceBar viewers={[VIEWERS_2[0]]} lockGranted={true} lockedBy={null} />);
    expect(screen.getByLabelText('1 other viewer')).toBeInTheDocument();
  });

  it('shows +N overflow chip when there are more than 4 viewers', () => {
    render(<PresenceBar viewers={VIEWERS_6} lockGranted={true} lockedBy={null} />);
    expect(screen.getByLabelText(`${VIEWERS_6.length - 4} more viewers`)).toBeInTheDocument();
    expect(screen.getByText(`+${VIEWERS_6.length - 4}`)).toBeInTheDocument();
  });

  it('does not show overflow chip when viewers count is exactly 4', () => {
    render(<PresenceBar viewers={VIEWERS_6.slice(0, 4)} lockGranted={true} lockedBy={null} />);
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
  });

  it('renders both the lock banner and viewer avatars simultaneously', () => {
    render(<PresenceBar viewers={VIEWERS_2} lockGranted={false} lockedBy="Admin User" />);
    expect(screen.getByText(/Admin User is editing/)).toBeInTheDocument();
    expect(screen.getByLabelText('2 other viewers')).toBeInTheDocument();
  });
});
