import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConflictResolver } from './conflict-resolver';

const conflicts = [
  {
    id: 'WRK-1',
    draft: { title: 'My title', status: 'In Progress' },
    server: { title: 'Their title', status: 'Done', version: 5 },
  },
];

describe('ConflictResolver', () => {
  it('renders nothing with no conflicts', () => {
    const { container } = render(<ConflictResolver conflicts={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows both versions and resolves to mine', () => {
    const onResolve = vi.fn();
    render(<ConflictResolver conflicts={conflicts} onResolve={onResolve} onClose={vi.fn()} />);
    expect(screen.getByText('My title')).toBeInTheDocument();
    expect(screen.getByText('Their title')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /keep my changes/i }));
    expect(onResolve).toHaveBeenCalledWith(conflicts[0], 'mine');
  });

  it('resolves to server version', () => {
    const onResolve = vi.fn();
    render(<ConflictResolver conflicts={conflicts} onResolve={onResolve} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /keep server version/i }));
    expect(onResolve).toHaveBeenCalledWith(conflicts[0], 'theirs');
  });
});
