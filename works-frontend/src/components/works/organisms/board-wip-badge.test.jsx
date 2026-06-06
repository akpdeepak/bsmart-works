import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BoardWipBadge } from './board-wip-badge';

describe('BoardWipBadge', () => {
  it('shows only the count when no limit is set', () => {
    render(<BoardWipBadge count={3} limit={null} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows count/limit when a limit is set', () => {
    render(<BoardWipBadge count={2} limit={5} />);
    expect(screen.getByText('2/5')).toBeInTheDocument();
  });

  it('flags a column that is over its limit', () => {
    render(<BoardWipBadge count={6} limit={5} />);
    expect(screen.getByText('6/5')).toBeInTheDocument();
    expect(screen.getByTitle('Over WIP limit')).toBeInTheDocument();
  });

  it('is read-only without canEdit (no button)', () => {
    render(<BoardWipBadge count={2} limit={5} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('lets a manager set a limit inline', () => {
    const onSet = vi.fn();
    render(<BoardWipBadge count={2} limit={null} canEdit onSet={onSet} />);
    fireEvent.click(screen.getByTitle('Set WIP limit'));
    const input = screen.getByLabelText('WIP limit');
    fireEvent.change(input, { target: { value: '4' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSet).toHaveBeenCalledWith(4);
  });

  it('clears the limit when emptied', () => {
    const onSet = vi.fn();
    render(<BoardWipBadge count={2} limit={4} canEdit onSet={onSet} />);
    fireEvent.click(screen.getByTitle('Set WIP limit'));
    const input = screen.getByLabelText('WIP limit');
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);
    expect(onSet).toHaveBeenCalledWith(null);
  });
});
