import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Avatar } from './avatar';

describe('Avatar', () => {
  it('derives two-letter initials from a full name', () => {
    render(<Avatar name="Deepak Pandey" />);
    expect(screen.getByText('DP')).toBeInTheDocument();
  });

  it('uses the first two letters for a single-word name', () => {
    render(<Avatar name="Demo" />);
    expect(screen.getByText('DE')).toBeInTheDocument();
  });

  it('falls back to ?? when no name is given', () => {
    render(<Avatar name="" />);
    expect(screen.getByText('??')).toBeInTheDocument();
  });

  it('uses a deterministic labelled initials avatar', () => {
    const { rerender } = render(<Avatar name="Deepak Pandey" />);
    const first = screen.getByLabelText('Deepak Pandey avatar').className;
    rerender(<Avatar name="Deepak Pandey" />);
    expect(screen.getByLabelText('Deepak Pandey avatar').className).toBe(first);
  });

  it('renders an image avatar when imageUrl is supplied', () => {
    render(<Avatar name="Deepak Pandey" imageUrl="/avatar.png" />);
    expect(screen.getByRole('img', { name: 'Deepak Pandey avatar' })).toHaveAttribute('src', '/avatar.png');
  });
});
