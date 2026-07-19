import { render, screen } from '@testing-library/react';
import { ShellBreadcrumbs } from './shell-breadcrumbs';

describe('ShellBreadcrumbs', () => {
  it('orients a rail destination', () => {
    render(<ShellBreadcrumbs view="board" />);
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toHaveTextContent('DeliverBoard');
    expect(screen.getByText('Board')).toHaveAttribute('aria-current', 'page');
  });

  it('orients a More destination and an open entity', () => {
    render(<ShellBreadcrumbs view="aicontrol" entityLabel="WRK-42" />);
    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(breadcrumb).toHaveTextContent('MoreAI ControlWRK-42');
    expect(screen.getByText('WRK-42')).toHaveAttribute('aria-current', 'page');
  });
});
