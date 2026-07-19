import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TIER } from '@/lib/nav-model';
import { MoreMenu } from './more-menu';

describe('MoreMenu', () => {
  it('shows only destinations allowed by the current visibility', async () => {
    const user = userEvent.setup();
    render(<MoreMenu activeView="account" visibility={TIER.MEMBER} onNavigate={() => {}} />);

    await user.click(screen.getByRole('button', { name: 'More' }));

    expect(screen.getByRole('menuitem', { name: 'My Account' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('menuitem', { name: 'Developer' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'BQL Query' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Settings' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Security' })).not.toBeInTheDocument();
  });

  it('navigates in two clicks and closes the menu', async () => {
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    render(<MoreMenu visibility={TIER.ADMIN} onNavigate={onNavigate} />);

    await user.click(screen.getByRole('button', { name: 'More' }));
    await user.click(screen.getByRole('menuitem', { name: 'AI Control' }));

    expect(onNavigate).toHaveBeenCalledWith('aicontrol');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    render(<MoreMenu visibility={TIER.OWNER} onNavigate={() => {}} />);

    await user.click(screen.getByRole('button', { name: 'More' }));
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
