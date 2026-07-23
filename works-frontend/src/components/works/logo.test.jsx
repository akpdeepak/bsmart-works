import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Logo } from './logo';

/**
 * Brand placement (roadmap W6): the workspace's own `branding.logoUrl` was configurable but the
 * logo component ignored it, so each surface that wanted tenant branding hand-rolled its own
 * conditional. The mark belongs in one component.
 */
describe('Logo', () => {
  it('renders the bSmart lockup when the workspace has no logo', () => {
    render(<Logo />);
    expect(screen.getByText('bSmart')).toBeInTheDocument();
    expect(screen.getByText('Works')).toBeInTheDocument();
  });

  it('renders the workspace mark when one is configured', () => {
    render(<Logo logoUrl="https://cdn.example.com/acme.png" alt="Acme" />);
    const mark = screen.getByRole('img', { name: 'Acme' });
    expect(mark).toHaveAttribute('src', 'https://cdn.example.com/acme.png');
    expect(screen.queryByText('bSmart')).not.toBeInTheDocument();
  });

  it('names the workspace mark for screen readers even without an explicit alt', () => {
    render(<Logo logoUrl="https://cdn.example.com/acme.png" />);
    expect(screen.getByRole('img', { name: 'Workspace logo' })).toBeInTheDocument();
  });

  it('falls back to the product lockup for a blank configured value', () => {
    render(<Logo logoUrl="   " />);
    expect(screen.getByText('bSmart')).toBeInTheDocument();
  });

  /** The workspace mark replaces every variant, including the dark-background lockups. */
  it('honours the workspace mark in the reverse and icon variants too', () => {
    const { rerender } = render(<Logo variant="reverse" logoUrl="/acme.svg" alt="Acme" />);
    expect(screen.getByRole('img', { name: 'Acme' })).toHaveAttribute('src', '/acme.svg');
    rerender(<Logo variant="icon" logoUrl="/acme.svg" alt="Acme" />);
    expect(screen.getByRole('img', { name: 'Acme' })).toHaveAttribute('src', '/acme.svg');
  });

  it('keeps the product lockups when no workspace mark is set', () => {
    const { rerender } = render(<Logo variant="reverse" />);
    expect(screen.getByRole('img', { name: 'bSmart Works' })).toHaveAttribute('src', '/logo-reverse.svg');
    rerender(<Logo variant="icon" />);
    expect(screen.getByRole('img', { name: 'bSmart Works' })).toHaveAttribute('src', '/logo-icon.svg');
  });
});
