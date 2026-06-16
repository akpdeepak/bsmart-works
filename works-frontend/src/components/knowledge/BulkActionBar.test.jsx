import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BulkActionBar } from './BulkActionBar';

describe('BulkActionBar (KR-038)', () => {
  const twoSelected = new Set(['ART-1', 'ART-2']);

  it('renders nothing when selection is empty', () => {
    const { container } = render(
      <BulkActionBar selectedIds={new Set()} onArchive={vi.fn()} onDelete={vi.fn()} onClear={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows the count when articles are selected', () => {
    render(
      <BulkActionBar selectedIds={twoSelected} onArchive={vi.fn()} onDelete={vi.fn()} onClear={vi.fn()} />,
    );
    expect(screen.getByText(/2 articles selected/i)).toBeInTheDocument();
  });

  it('calls onArchive when Archive button is clicked', () => {
    const onArchive = vi.fn();
    render(
      <BulkActionBar selectedIds={twoSelected} onArchive={onArchive} onDelete={vi.fn()} onClear={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /archive 2/i }));
    expect(onArchive).toHaveBeenCalledTimes(1);
  });

  it('requires a second click to confirm delete (safety guard)', () => {
    const onDelete = vi.fn();
    render(
      <BulkActionBar selectedIds={twoSelected} onArchive={vi.fn()} onDelete={onDelete} onClear={vi.fn()} />,
    );
    // First click shows confirmation
    fireEvent.click(screen.getByRole('button', { name: /delete 2/i }));
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByText(/confirm permanent delete/i)).toBeInTheDocument();

    // Second click (on the confirm button) calls the handler
    fireEvent.click(screen.getByRole('button', { name: /confirm delete 2/i }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('Cancel resets the delete confirmation', () => {
    render(
      <BulkActionBar selectedIds={twoSelected} onArchive={vi.fn()} onDelete={vi.fn()} onClear={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /delete 2/i }));
    expect(screen.getByText(/confirm permanent delete/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByText(/confirm permanent delete/i)).not.toBeInTheDocument();
  });

  it('calls onClear when Clear button is clicked', () => {
    const onClear = vi.fn();
    render(
      <BulkActionBar selectedIds={twoSelected} onArchive={vi.fn()} onDelete={vi.fn()} onClear={onClear} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /clear selection/i }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('disables Archive and Delete buttons when busy', () => {
    render(
      <BulkActionBar selectedIds={twoSelected} onArchive={vi.fn()} onDelete={vi.fn()} onClear={vi.fn()} busy />,
    );
    expect(screen.getByRole('button', { name: /archive 2/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /delete 2/i })).toBeDisabled();
  });

  it('has an accessible toolbar role with label', () => {
    render(
      <BulkActionBar selectedIds={twoSelected} onArchive={vi.fn()} onDelete={vi.fn()} onClear={vi.fn()} />,
    );
    expect(screen.getByRole('toolbar', { name: /bulk actions for 2/i })).toBeInTheDocument();
  });
});
