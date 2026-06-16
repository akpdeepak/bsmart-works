import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StatusTransitionPopover } from './StatusTransitionPopover';

const noop = vi.fn();

function renderPopover(status, overrides = {}) {
  const defaults = {
    status,
    open: true,
    onClose: noop,
    onSubmit: noop,
    onPublish: noop,
    onReject: noop,
    onArchive: noop,
    onRestore: noop,
    ...overrides,
  };
  return render(<StatusTransitionPopover {...defaults} />);
}

describe('StatusTransitionPopover (KR-017)', () => {
  it('renders nothing when open=false', () => {
    const { container } = render(
      <StatusTransitionPopover status="DRAFT" open={false} onClose={noop}
        onSubmit={noop} onPublish={noop} onReject={noop} onArchive={noop} onRestore={noop} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows the dialog and "Submit for Review" chip for DRAFT', () => {
    renderPopover('DRAFT');
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByRole('button', { name: /submit for review/i })).toBeTruthy();
  });

  it('calls onSubmit and onClose when DRAFT→IN_REVIEW is confirmed', () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();
    renderPopover('DRAFT', { onSubmit, onClose });
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows Publish and Request Changes chips for IN_REVIEW', () => {
    renderPopover('IN_REVIEW');
    expect(screen.getByRole('button', { name: /publish/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /request changes/i })).toBeTruthy();
  });

  it('calls onPublish when IN_REVIEW→PUBLISHED is confirmed', () => {
    const onPublish = vi.fn();
    const onClose = vi.fn();
    renderPopover('IN_REVIEW', { onPublish, onClose });
    fireEvent.click(screen.getByRole('button', { name: /^publish$/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    expect(onPublish).toHaveBeenCalledTimes(1);
  });

  it('calls onReject when Request Changes is selected and confirmed', () => {
    const onReject = vi.fn();
    const onClose = vi.fn();
    renderPopover('IN_REVIEW', { onReject, onClose });
    fireEvent.click(screen.getByRole('button', { name: /request changes/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    expect(onReject).toHaveBeenCalledTimes(1);
  });

  it('calls onArchive for PUBLISHED', () => {
    const onArchive = vi.fn();
    renderPopover('PUBLISHED', { onArchive });
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    expect(onArchive).toHaveBeenCalledTimes(1);
  });

  it('calls onRestore for ARCHIVED', () => {
    const onRestore = vi.fn();
    renderPopover('ARCHIVED', { onRestore });
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    expect(onRestore).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape key', () => {
    const onClose = vi.fn();
    renderPopover('DRAFT', { onClose });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on Cancel button click', () => {
    const onClose = vi.fn();
    renderPopover('DRAFT', { onClose });
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('has a labelled comment textarea', () => {
    renderPopover('DRAFT');
    expect(screen.getByRole('textbox', { name: /transition comment/i })).toBeTruthy();
  });
});
