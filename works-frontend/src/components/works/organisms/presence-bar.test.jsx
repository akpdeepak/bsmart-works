import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PresenceBar } from './presence-bar';

const roster = [
  { userId: 'U1', name: 'Asha Rao', location: 'board' },
  { userId: 'U2', name: 'Ben Lee' },
  { userId: 'U3', name: 'Cara Yu' },
];

describe('PresenceBar', () => {
  it('renders nothing when only the current user is present', () => {
    const { container } = render(<PresenceBar present={[{ userId: 'me', name: 'Me' }]} currentUserId="me" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows other present users and excludes the current user', () => {
    render(<PresenceBar present={roster} currentUserId="U1" />);
    expect(screen.getByLabelText(/2 others viewing/i)).toBeInTheDocument();
  });

  it('shows an overflow chip beyond the max', () => {
    render(<PresenceBar present={roster} currentUserId="me" max={2} />);
    expect(screen.getByText('+1')).toBeInTheDocument();
  });
});
