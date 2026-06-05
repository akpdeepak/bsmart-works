import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from './modal';

describe('Modal', () => {
  it('renders the title and children with dialog semantics', () => {
    render(
      <Modal title="New Sprint" onClose={() => {}}>
        <p>Body content</p>
      </Modal>
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    // labelled by its title
    expect(dialog).toHaveAccessibleName('New Sprint');
    expect(screen.getByText('Body content')).toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<Modal title="T" onClose={onClose}>x</Modal>);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on backdrop click', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<Modal title="T" onClose={onClose}>x</Modal>);
    await user.click(screen.getByRole('button', { name: 'Close dialog' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes via the close button', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<Modal title="T" onClose={onClose}>x</Modal>);
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close when the dialog body is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<Modal title="T" onClose={onClose}><button type="button">Inside</button></Modal>);
    await user.click(screen.getByRole('button', { name: 'Inside' }));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('moves focus into the dialog on open', () => {
    render(<Modal title="T" onClose={() => {}}>x</Modal>);
    // first focusable is the close button
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
  });

  it('locks body scroll while open and restores it on close', () => {
    const { unmount } = render(<Modal title="T" onClose={() => {}}>x</Modal>);
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('');
  });
});
