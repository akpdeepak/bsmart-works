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
});
