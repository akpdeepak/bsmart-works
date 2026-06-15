import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Drawer } from './drawer';

describe('Drawer', () => {
  it('renders nothing when open is false', () => {
    const { container } = render(
      <Drawer open={false} onClose={() => {}} title="Settings">
        <p>Content</p>
      </Drawer>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the title when open', () => {
    render(
      <Drawer open onClose={() => {}} title="Edit Profile">
        <p>Content</p>
      </Drawer>
    );
    expect(screen.getByText('Edit Profile')).toBeInTheDocument();
  });

  it('renders children when open', () => {
    render(
      <Drawer open onClose={() => {}} title="Panel">
        <p>Drawer body</p>
      </Drawer>
    );
    expect(screen.getByText('Drawer body')).toBeInTheDocument();
  });

  it('has role="dialog" and aria-modal', () => {
    render(
      <Drawer open onClose={() => {}} title="Panel">
        <p>Content</p>
      </Drawer>
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('is labelled by its title', () => {
    render(
      <Drawer open onClose={() => {}} title="My Panel">
        <p>Content</p>
      </Drawer>
    );
    expect(screen.getByRole('dialog', { name: 'My Panel' })).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    const fn = vi.fn();
    render(
      <Drawer open onClose={fn} title="Panel">
        <p>Content</p>
      </Drawer>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('calls onClose on Escape key', () => {
    const fn = vi.fn();
    render(
      <Drawer open onClose={fn} title="Panel">
        <p>Content</p>
      </Drawer>
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('renders the footer slot when provided', () => {
    render(
      <Drawer open onClose={() => {}} title="Panel" footer={<button>Save</button>}>
        <p>Content</p>
      </Drawer>
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('does not render footer when not provided', () => {
    render(
      <Drawer open onClose={() => {}} title="Panel">
        <p>Content</p>
      </Drawer>
    );
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
  });
});
