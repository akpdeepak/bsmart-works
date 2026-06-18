import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Bell } from 'lucide-react';
import { EmptyState } from './empty-state';

describe('EmptyState', () => {
  it('renders title and subtitle', () => {
    render(<EmptyState icon={Bell} title="All caught up" subtitle="Nothing to see." />);
    expect(screen.getByRole('heading', { name: 'All caught up' })).toBeInTheDocument();
    expect(screen.getByText('Nothing to see.')).toBeInTheDocument();
  });

  it('renders a Lucide (forwardRef) icon without crashing', () => {
    const { container } = render(<EmptyState icon={Bell} title="t" subtitle="s" />);
    // The regression this guards: a forwardRef icon must render as an <svg>, not throw.
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders the optional action node', () => {
    render(<EmptyState icon={Bell} title="t" subtitle="s" action={<button>Do it</button>} />);
    expect(screen.getByRole('button', { name: 'Do it' })).toBeInTheDocument();
  });

  it('applies a sanctioned illustration variant', () => {
    const { container } = render(<EmptyState icon={Bell} title="Saved" subtitle="Done." variant="success" />);
    expect(container.querySelector('.bg-semantic-success-surface')).toBeInTheDocument();
  });
});
