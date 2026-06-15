import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Checkbox } from './checkbox';

describe('Checkbox', () => {
  it('renders an unchecked checkbox by default', () => {
    render(<Checkbox>Accept terms</Checkbox>);
    const cb = screen.getByRole('checkbox', { name: 'Accept terms' });
    expect(cb).not.toBeChecked();
  });

  it('renders a label when children provided', () => {
    render(<Checkbox>My label</Checkbox>);
    expect(screen.getByText('My label')).toBeInTheDocument();
  });

  it('renders without label (no children)', () => {
    render(<Checkbox aria-label="standalone" />);
    expect(screen.getByRole('checkbox', { name: 'standalone' })).toBeInTheDocument();
  });

  it('is checked when checked prop is true (controlled)', () => {
    render(<Checkbox checked onChange={() => {}}>Checked</Checkbox>);
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('toggles in uncontrolled mode', () => {
    render(<Checkbox defaultChecked={false}>Toggle me</Checkbox>);
    const cb = screen.getByRole('checkbox');
    expect(cb).not.toBeChecked();
    fireEvent.click(cb);
    expect(cb).toBeChecked();
  });

  it('calls onChange on click', () => {
    const fn = vi.fn();
    render(<Checkbox onChange={fn}>Click</Checkbox>);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is set', () => {
    render(<Checkbox disabled>Disabled</Checkbox>);
    expect(screen.getByRole('checkbox')).toBeDisabled();
  });

  it('has aria-invalid when invalid prop is set', () => {
    render(<Checkbox invalid>Invalid</Checkbox>);
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('forwards ref to the native input', () => {
    const ref = { current: null };
    render(<Checkbox ref={ref}>Ref</Checkbox>);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current.type).toBe('checkbox');
  });
});
