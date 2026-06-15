import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ListSkeleton } from './list-skeleton';

describe('ListSkeleton', () => {
  it('renders the default number of rows (5)', () => {
    const { container } = render(<ListSkeleton />);
    // Each row is a flex container; count by the gap-3 row divs inside the wrapper.
    const rows = container.querySelectorAll('[aria-busy="true"] > div');
    expect(rows).toHaveLength(5);
  });

  it('respects the rows prop', () => {
    const { container } = render(<ListSkeleton rows={3} />);
    const rows = container.querySelectorAll('[aria-busy="true"] > div');
    expect(rows).toHaveLength(3);
  });

  it('marks the wrapper as aria-busy="true" so screen readers announce loading once', () => {
    render(<ListSkeleton rows={2} />);
    expect(document.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });

  it('has an accessible aria-label on the wrapper', () => {
    render(<ListSkeleton />);
    expect(document.querySelector('[aria-label="Loading"]')).toBeInTheDocument();
  });

  it('marks individual skeleton bars as aria-hidden so screen readers skip them', () => {
    const { container } = render(<ListSkeleton rows={1} />);
    const bars = container.querySelectorAll('[aria-hidden="true"]');
    expect(bars.length).toBeGreaterThanOrEqual(1);
  });
});
