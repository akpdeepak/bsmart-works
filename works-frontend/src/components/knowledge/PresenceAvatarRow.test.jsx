import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PresenceAvatarRow } from '@/components/knowledge/PresenceAvatarRow';

const makePresences = (count) =>
  Array.from({ length: count }, (_, i) => ({
    userId: `u-${i + 1}`,
    displayName: `User ${i + 1}`,
    avatarInitial: String.fromCharCode(65 + i), // A, B, C, …
  }));

describe('PresenceAvatarRow', () => {
  it('renders nothing when presences is empty', () => {
    const { container } = render(<PresenceAvatarRow presences={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders up to 4 avatar initials', () => {
    render(<PresenceAvatarRow presences={makePresences(3)} />);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
  });

  it('shows +N overflow badge when there are more than 4 viewers', () => {
    render(<PresenceAvatarRow presences={makePresences(6)} />);
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('does not show overflow badge for exactly 4 viewers', () => {
    render(<PresenceAvatarRow presences={makePresences(4)} />);
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
  });

  it('has an accessible aria-label with the viewer count', () => {
    render(<PresenceAvatarRow presences={makePresences(3)} />);
    expect(
      screen.getByRole('generic', { name: '3 people currently viewing' })
    ).toBeInTheDocument();
  });

  it('uses the singular form for exactly 1 viewer', () => {
    render(<PresenceAvatarRow presences={makePresences(1)} />);
    expect(
      screen.getByRole('generic', { name: '1 person currently viewing' })
    ).toBeInTheDocument();
  });

  it('derives initial from displayName when avatarInitial is not provided', () => {
    render(<PresenceAvatarRow presences={[{ userId: 'u-1', displayName: 'Zeynep' }]} />);
    expect(screen.getByText('Z')).toBeInTheDocument();
  });
});
