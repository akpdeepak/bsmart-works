import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmDialog } from './confirm-dialog';

describe('ConfirmDialog', () => {
  it('renders nothing when open is false', () => {
    const { container } = render(
      <ConfirmDialog open={false} onClose={() => {}} onConfirm={() => {}} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the title when open', () => {
    render(
      <ConfirmDialog open onClose={() => {}} onConfirm={() => {}} title="Delete item?" />
    );
    expect(screen.getByText('Delete item?')).toBeInTheDocument();
  });

  it('uses default title when none provided', () => {
    render(<ConfirmDialog open onClose={() => {}} onConfirm={() => {}} />);
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
  });

  it('renders the message when provided', () => {
    render(
      <ConfirmDialog open onClose={() => {}} onConfirm={() => {}} message="This cannot be undone." />
    );
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();
  });

  it('renders confirm and cancel buttons with default labels', () => {
    render(<ConfirmDialog open onClose={() => {}} onConfirm={() => {}} />);
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('uses custom confirm and cancel labels', () => {
    render(
      <ConfirmDialog
        open onClose={() => {}} onConfirm={() => {}}
        confirmLabel="Yes, delete" cancelLabel="Keep it"
      />
    );
    expect(screen.getByRole('button', { name: 'Yes, delete' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keep it' })).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', () => {
    const fn = vi.fn();
    render(<ConfirmDialog open onClose={() => {}} onConfirm={fn} />);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when cancel button is clicked', () => {
    const fn = vi.fn();
    render(<ConfirmDialog open onClose={fn} onConfirm={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('disables both buttons when loading', () => {
    render(<ConfirmDialog open onClose={() => {}} onConfirm={() => {}} loading />);
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });

  it('renders a dialog role accessible to screen readers', () => {
    render(<ConfirmDialog open onClose={() => {}} onConfirm={() => {}} title="Confirm action" />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
