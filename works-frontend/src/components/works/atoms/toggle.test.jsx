import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Toggle } from './toggle';

describe('Toggle', () => {
  it('renders with role="switch"', () => {
    render(<Toggle aria-label="Enable feature" />);
    expect(screen.getByRole('switch', { name: 'Enable feature' })).toBeInTheDocument();
  });

  it('is off by default (uncontrolled)', () => {
    render(<Toggle aria-label="toggle" />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  });

  it('renders a label when children provided', () => {
    render(<Toggle>Dark mode</Toggle>);
    expect(screen.getByText('Dark mode')).toBeInTheDocument();
  });

  it('toggles on click (uncontrolled)', () => {
    render(<Toggle aria-label="toggle" />);
    const sw = screen.getByRole('switch');
    expect(sw).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(sw);
    expect(sw).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(sw);
    expect(sw).toHaveAttribute('aria-checked', 'false');
  });

  it('starts checked when defaultChecked is true', () => {
    render(<Toggle defaultChecked aria-label="toggle" />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('is controlled by checked prop', () => {
    render(<Toggle checked={true} onChange={() => {}} aria-label="toggle" />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onChange with new boolean value on click', () => {
    const fn = vi.fn();
    render(<Toggle onChange={fn} aria-label="toggle" />);
    fireEvent.click(screen.getByRole('switch'));
    expect(fn).toHaveBeenCalledWith(true);
  });

  it('is disabled when disabled prop is set', () => {
    render(<Toggle disabled aria-label="toggle" />);
    expect(screen.getByRole('switch')).toBeDisabled();
  });

  it('does not toggle when disabled', () => {
    const fn = vi.fn();
    render(<Toggle disabled onChange={fn} aria-label="toggle" />);
    fireEvent.click(screen.getByRole('switch'));
    expect(fn).not.toHaveBeenCalled();
  });

  it('forwards ref to the button element', () => {
    const ref = { current: null };
    render(<Toggle ref={ref} aria-label="toggle" />);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});
