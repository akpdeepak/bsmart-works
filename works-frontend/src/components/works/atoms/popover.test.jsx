import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Popover } from './popover';

describe('Popover', () => {
  it('is closed by default', () => {
    render(
      <Popover trigger={<button type="button">Open</button>}>
        <p>Content</p>
      </Popover>
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens on trigger click', async () => {
    const user = userEvent.setup();
    render(
      <Popover trigger={<button type="button">Open</button>}>
        <p>Popover content</p>
      </Popover>
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Popover content')).toBeInTheDocument();
  });

  it('closes on second trigger click', async () => {
    const user = userEvent.setup();
    render(
      <Popover trigger={<button type="button">Open</button>}>
        <p>Content</p>
      </Popover>
    );
    await user.click(screen.getByRole('button'));
    await user.click(screen.getByRole('button'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes on Escape key', async () => {
    const user = userEvent.setup();
    render(
      <Popover trigger={<button type="button">Open</button>}>
        <p>Content</p>
      </Popover>
    );
    await user.click(screen.getByRole('button'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('sets aria-expanded on trigger when open', async () => {
    const user = userEvent.setup();
    render(
      <Popover trigger={<button type="button">Open</button>}>
        <p>Content</p>
      </Popover>
    );
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false');
    await user.click(screen.getByRole('button'));
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
  });
});
