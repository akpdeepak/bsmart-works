import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BulkEditBar } from './bulk-edit-bar';

const users = [{ id: 'u1', fullName: 'Alice' }, { id: 'u2', fullName: 'Bob' }];

describe('BulkEditBar', () => {
  it('shows the selected count', () => {
    render(<BulkEditBar count={3} users={users} onApply={vi.fn()} onClear={vi.fn()} />);
    expect(screen.getByText(/3/)).toBeInTheDocument();
    expect(screen.getByText(/selected/i)).toBeInTheDocument();
  });

  it('applies a priority change with the chosen value', () => {
    const onApply = vi.fn(() => Promise.resolve());
    render(<BulkEditBar count={2} users={users} onApply={onApply} onClear={vi.fn()} />);
    // default action is priority — choose a value, then Apply
    fireEvent.change(screen.getByLabelText(/set priority/i), { target: { value: 'HIGH' } });
    fireEvent.click(screen.getByRole('button', { name: /apply/i }));
    expect(onApply).toHaveBeenCalledWith('priority', 'HIGH');
  });

  it('allows an empty assignee value (unassign) but blocks empty labels', () => {
    const onApply = vi.fn(() => Promise.resolve());
    render(<BulkEditBar count={1} users={users} onApply={onApply} onClear={vi.fn()} />);
    // switch to assignee — empty value means "Unassigned", which is allowed
    fireEvent.change(screen.getByLabelText(/field/i), { target: { value: 'assignee' } });
    fireEvent.click(screen.getByRole('button', { name: /apply/i }));
    expect(onApply).toHaveBeenCalledWith('assignee', '');

    onApply.mockClear();
    // switch to addLabel — empty text is blocked (Apply disabled)
    fireEvent.change(screen.getByLabelText(/field/i), { target: { value: 'addLabel' } });
    fireEvent.click(screen.getByRole('button', { name: /apply/i }));
    expect(onApply).not.toHaveBeenCalled();
  });

  it('calls onClear', () => {
    const onClear = vi.fn();
    render(<BulkEditBar count={1} users={users} onApply={vi.fn()} onClear={onClear} />);
    fireEvent.click(screen.getByRole('button', { name: /clear/i }));
    expect(onClear).toHaveBeenCalled();
  });
});
