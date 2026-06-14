import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserMenu } from './user-menu';

const defaultProps = {
  user: { fullName: 'Deepak Pandey', email: 'deepak@bcits.com' },
  role: 'Owner',
};

describe('UserMenu', () => {
  it('renders an accessible trigger button and hides the menu by default', () => {
    render(<UserMenu {...defaultProps} />);
    expect(screen.getByRole('button', { name: /user menu/i })).toBeInTheDocument();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('opens the menu showing identity, and fires My account + Sign out callbacks', async () => {
    const onOpenSettings = vi.fn();
    const onLogout = vi.fn();
    const user = userEvent.setup();
    render(<UserMenu {...defaultProps} onOpenSettings={onOpenSettings} onLogout={onLogout} />);

    await user.click(screen.getByRole('button', { name: /user menu/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByText('Deepak Pandey')).toBeInTheDocument();
    expect(screen.getByText('deepak@bcits.com')).toBeInTheDocument();
    expect(screen.getByText('Owner')).toBeInTheDocument();

    await user.click(screen.getByRole('menuitem', { name: /my account/i }));
    expect(onOpenSettings).toHaveBeenCalledOnce();

    await user.click(screen.getByRole('button', { name: /user menu/i }));
    await user.click(screen.getByRole('menuitem', { name: /sign out/i }));
    expect(onLogout).toHaveBeenCalledOnce();
  });

  it('toggles theme label based on darkMode and fires onToggleTheme', async () => {
    const onToggleTheme = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <UserMenu {...defaultProps} darkMode={false} onToggleTheme={onToggleTheme} />
    );
    await user.click(screen.getByRole('button', { name: /user menu/i }));
    expect(screen.getByRole('menuitem', { name: /dark mode/i })).toBeInTheDocument();
    await user.click(screen.getByRole('menuitem', { name: /dark mode/i }));
    expect(onToggleTheme).toHaveBeenCalledOnce();

    rerender(<UserMenu {...defaultProps} darkMode onToggleTheme={onToggleTheme} />);
    await user.click(screen.getByRole('button', { name: /user menu/i }));
    expect(screen.getByRole('menuitem', { name: /light mode/i })).toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    render(<UserMenu {...defaultProps} onLogout={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /user menu/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
