import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expectNoA11yViolations } from '@/test/a11y';
import { TIER } from '@/lib/nav-model';
import { MoreMenu } from './more-menu';
import { ShellBreadcrumbs } from './shell-breadcrumbs';

describe('navigation shell accessibility', () => {
  it('keeps the More menu and breadcrumb orientation free of serious violations', async () => {
    const user = userEvent.setup();
    const { container, getByRole } = render(
      <div>
        <MoreMenu activeView="aicontrol" visibility={TIER.ADMIN} onNavigate={() => {}} />
        <ShellBreadcrumbs view="aicontrol" />
      </div>,
    );

    await user.click(getByRole('button', { name: 'More' }));
    await expectNoA11yViolations(container);
  });
});
