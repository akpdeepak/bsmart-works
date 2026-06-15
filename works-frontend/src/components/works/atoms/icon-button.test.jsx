import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Settings } from 'lucide-react';
import { IconButton } from './icon-button';

describe('IconButton', () => {
  it('renders with aria-label', () => {
    render(<IconButton aria-label="Settings"><Settings /></IconButton>);
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument();
  });

  it('applies ghost variant by default', () => {
    render(<IconButton aria-label="x"><Settings /></IconButton>);
    expect(screen.getByRole('button')).toHaveClass('bg-transparent');
  });

  it('applies primary variant', () => {
    render(<IconButton aria-label="x" variant="primary"><Settings /></IconButton>);
    expect(screen.getByRole('button')).toHaveClass('bg-brand-navy');
  });

  it('applies danger variant', () => {
    render(<IconButton aria-label="x" variant="danger"><Settings /></IconButton>);
    expect(screen.getByRole('button')).toHaveClass('text-semantic-danger');
  });

  it('applies size classes', () => {
    render(<IconButton aria-label="x" size="lg"><Settings /></IconButton>);
    expect(screen.getByRole('button')).toHaveClass('h-10', 'w-10');
  });

  it('applies xs size', () => {
    render(<IconButton aria-label="x" size="xs"><Settings /></IconButton>);
    expect(screen.getByRole('button')).toHaveClass('h-7', 'w-7');
  });

  it('is disabled when disabled prop is set', () => {
    render(<IconButton aria-label="x" disabled><Settings /></IconButton>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('calls onClick when clicked', () => {
    const fn = vi.fn();
    render(<IconButton aria-label="x" onClick={fn}><Settings /></IconButton>);
    screen.getByRole('button').click();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('forwards ref', () => {
    const ref = { current: null };
    render(<IconButton aria-label="x" ref={ref}><Settings /></IconButton>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it('merges custom className', () => {
    render(<IconButton aria-label="x" className="my-class"><Settings /></IconButton>);
    expect(screen.getByRole('button')).toHaveClass('my-class');
  });
});
