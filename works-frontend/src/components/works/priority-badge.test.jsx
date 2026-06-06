import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PriorityBadge } from './priority-badge';

describe('PriorityBadge', () => {
  it('renders a known priority label', () => {
    render(<PriorityBadge priority="HIGH" />);
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('falls back to Medium for an unknown priority', () => {
    render(<PriorityBadge priority="WHATEVER" />);
    expect(screen.getByText('Medium')).toBeInTheDocument();
  });
});
