import { describe, expect, it, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { FirstUseTour } from './first-use-tour';

const steps = [
  { id: 'one', title: 'Open the board', body: 'Start with active work.' },
  { id: 'two', title: 'Use filters' },
];

describe('FirstUseTour', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders ordered tour steps', () => {
    render(<FirstUseTour tourId="board" title="Board basics" steps={steps} />);
    expect(screen.getByRole('region', { name: /board basics tour/i })).toBeInTheDocument();
    expect(screen.getByText('Open the board')).toBeInTheDocument();
    expect(screen.getByText('Use filters')).toBeInTheDocument();
  });

  it('persists completion when dismissed', () => {
    const onDone = vi.fn();
    const { rerender } = render(<FirstUseTour tourId="board" title="Board basics" steps={steps} onDone={onDone} />);
    fireEvent.click(screen.getByRole('button', { name: /got it/i }));
    expect(onDone).toHaveBeenCalled();
    rerender(<FirstUseTour tourId="board" title="Board basics" steps={steps} />);
    expect(screen.queryByRole('region', { name: /board basics tour/i })).not.toBeInTheDocument();
  });
});
