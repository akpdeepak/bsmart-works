import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Collapsible } from './collapsible';

describe('Collapsible', () => {
  it('renders title', () => {
    render(<Collapsible title="Sprint backlog">Content</Collapsible>);
    expect(screen.getByText('Sprint backlog')).toBeInTheDocument();
  });

  it('renders children when defaultOpen=true (default)', () => {
    render(<Collapsible title="Section">Visible content</Collapsible>);
    expect(screen.getByText('Visible content')).toBeInTheDocument();
  });

  it('shows count badge when count is provided', () => {
    render(<Collapsible title="Items" count={5}>Content</Collapsible>);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('does not render count badge when count is undefined', () => {
    const { container } = render(<Collapsible title="Items">Content</Collapsible>);
    // Badge only rendered when count != null
    expect(container.querySelectorAll('[class*="rounded-full"]').length).toBe(0);
  });

  it('toggle button has aria-expanded=true when open', () => {
    render(<Collapsible title="Section">Content</Collapsible>);
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
  });

  it('toggle button has aria-expanded=false when defaultOpen=false', () => {
    render(<Collapsible title="Section" defaultOpen={false}>Content</Collapsible>);
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false');
  });

  it('toggles open/closed on button click', async () => {
    const user = userEvent.setup();
    render(<Collapsible title="Section">Inner</Collapsible>);
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-expanded', 'true');
    await user.click(btn);
    expect(btn).toHaveAttribute('aria-expanded', 'false');
    await user.click(btn);
    expect(btn).toHaveAttribute('aria-expanded', 'true');
  });

  it('button has aria-controls wired to the region', () => {
    render(<Collapsible title="Section">Inner</Collapsible>);
    const btn = screen.getByRole('button');
    const controlsId = btn.getAttribute('aria-controls');
    expect(controlsId).toBeTruthy();
    expect(document.getElementById(controlsId)).toBeTruthy();
  });
});
