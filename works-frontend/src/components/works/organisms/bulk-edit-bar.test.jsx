import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BulkEditBar } from './bulk-edit-bar';

const users = [{ id: 'u1', fullName: 'Alice' }, { id: 'u2', fullName: 'Bob' }];
const items = [
  { id: 'i1', autoId: 'WI-1', title: 'Login bug', priority: 'LOW', assigneeId: 'u1', tags: [] },
  { id: 'i2', autoId: 'WI-2', title: 'Signup', priority: 'MEDIUM', assigneeId: null, tags: [] },
];

describe('BulkEditBar', () => {
  it('shows the selected count', () => {
    render(<BulkEditBar count={3} users={users} onApply={vi.fn()} onClear={vi.fn()} />);
    expect(screen.getByText(/3/)).toBeInTheDocument();
    expect(screen.getByText(/selected/i)).toBeInTheDocument();
  });

  it('opens the preview wizard before applying, then commits on confirm', () => {
    const onApply = vi.fn(() => Promise.resolve());
    render(<BulkEditBar count={2} users={users} selectedItems={items} onApply={onApply} onClear={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/set priority/i), { target: { value: 'HIGH' } });
    // Clicking "Review changes" opens the preview — it does NOT apply yet.
    fireEvent.click(screen.getByRole('button', { name: /review changes/i }));
    expect(onApply).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // Confirm inside the wizard runs the apply path.
    fireEvent.click(screen.getByRole('button', { name: /apply change/i }));
    expect(onApply).toHaveBeenCalledWith('priority', 'HIGH');
  });

  it('cancelling the wizard does not apply', () => {
    const onApply = vi.fn(() => Promise.resolve());
    render(<BulkEditBar count={2} users={users} selectedItems={items} onApply={onApply} onClear={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/set priority/i), { target: { value: 'HIGH' } });
    fireEvent.click(screen.getByRole('button', { name: /review changes/i }));
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onApply).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('previews unassign for an empty assignee value (allowed)', () => {
    const onApply = vi.fn(() => Promise.resolve());
    render(<BulkEditBar count={2} users={users} selectedItems={items} onApply={onApply} onClear={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/field/i), { target: { value: 'assignee' } });
    fireEvent.click(screen.getByRole('button', { name: /review changes/i }));
    fireEvent.click(screen.getByRole('button', { name: /apply change/i }));
    expect(onApply).toHaveBeenCalledWith('assignee', '');
  });

  it('blocks an empty label — Review stays disabled, no preview opens', () => {
    const onApply = vi.fn(() => Promise.resolve());
    render(<BulkEditBar count={2} users={users} selectedItems={items} onApply={onApply} onClear={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/field/i), { target: { value: 'addLabel' } });
    fireEvent.click(screen.getByRole('button', { name: /review changes/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onApply).not.toHaveBeenCalled();
  });

  it('calls onClear', () => {
    const onClear = vi.fn();
    render(<BulkEditBar count={1} users={users} onApply={vi.fn()} onClear={onClear} />);
    fireEvent.click(screen.getByRole('button', { name: /clear/i }));
    expect(onClear).toHaveBeenCalled();
  });
});
