import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Pin } from 'lucide-react';
import { StatCard } from './stat-card';

describe('StatCard', () => {
  it('renders label, value and sub with a Lucide icon (no crash)', () => {
    const { container } = render(<StatCard label="Open Items" value={5} sub="Assigned" color="text-brand-navy" icon={Pin} />);
    expect(screen.getByText('Open Items')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('is a static figure (not a button) without onClick', () => {
    render(<StatCard label="X" value={1} sub="y" color="text-brand-navy" icon={Pin} />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('becomes a keyboard-operable button with onClick, firing on Enter', () => {
    const onClick = vi.fn();
    render(<StatCard label="Go" value={1} sub="y" color="text-brand-navy" icon={Pin} onClick={onClick} />);
    const card = screen.getByRole('button');
    expect(card).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(card, { key: 'Enter' });
    // onPressKey calls currentTarget.click(); the click handler is wired via onClick.
    expect(onClick).toHaveBeenCalled();
  });
});
