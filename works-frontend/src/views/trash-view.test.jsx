import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import TrashView from './trash-view';

const noop = () => {};
const baseProps = {
  trashItems: [],
  restoreFromTrash: noop,
  permanentDelete: noop,
};

describe('TrashView', () => {
  it('shows the empty state when the trash is empty', () => {
    render(<TrashView {...baseProps} />);
    expect(screen.getByText('Trash is empty')).toBeInTheDocument();
  });

  it('lists deleted items with restore and permanent-delete actions', () => {
    render(
      <TrashView
        {...baseProps}
        trashItems={[{ id: 'WRK-9', title: 'Old task', type: 'Task', deletedAt: '2026-06-01' }]}
      />,
    );
    expect(screen.getByText('Old task')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Restore' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete permanently' })).toBeInTheDocument();
  });

  it('restores an item by id', () => {
    const restoreFromTrash = vi.fn();
    render(<TrashView {...baseProps} restoreFromTrash={restoreFromTrash} trashItems={[{ id: 'WRK-9', title: 'X', type: 'Task' }]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Restore' }));
    expect(restoreFromTrash).toHaveBeenCalledWith('WRK-9');
  });

  it('permanently deletes an item by id after confirm dialog', () => {
    const permanentDelete = vi.fn();
    render(<TrashView {...baseProps} permanentDelete={permanentDelete} trashItems={[{ id: 'WRK-9', title: 'X', type: 'Task' }]} />);
    // Step 1: trigger opens the confirm dialog
    fireEvent.click(screen.getByRole('button', { name: 'Delete permanently' }));
    // Step 2: confirm via the dialog's danger button (dialog element is role="dialog")
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete permanently' }));
    expect(permanentDelete).toHaveBeenCalledWith('WRK-9');
  });

  it('cancel in the confirm dialog does not delete', () => {
    const permanentDelete = vi.fn();
    render(<TrashView {...baseProps} permanentDelete={permanentDelete} trashItems={[{ id: 'WRK-9', title: 'X', type: 'Task' }]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete permanently' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(permanentDelete).not.toHaveBeenCalled();
  });
});
