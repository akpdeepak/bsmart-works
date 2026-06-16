// KR-076: SelectionToolbar — Simplify button and grade sub-menu tests.
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SelectionToolbar } from '@/components/blocks/SelectionToolbar';

const RECT = { top: 200, left: 100, width: 50, height: 20 };

describe('SelectionToolbar', () => {
  it('renders nothing when rect is null', () => {
    const { container } = render(
      <SelectionToolbar rect={null} onWrap={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders core formatting buttons when rect is provided', () => {
    render(<SelectionToolbar rect={RECT} onWrap={vi.fn()} />);
    expect(screen.getByRole('button', { name: /bold/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /italic/i })).toBeInTheDocument();
  });

  it('does not show the Simplify button when onSimplify is not provided', () => {
    render(<SelectionToolbar rect={RECT} onWrap={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /simplify/i })).not.toBeInTheDocument();
  });

  it('shows the Simplify button when onSimplify prop is provided (KR-076)', () => {
    render(<SelectionToolbar rect={RECT} onWrap={vi.fn()} onSimplify={vi.fn()} />);
    expect(screen.getByRole('button', { name: /simplify/i })).toBeInTheDocument();
  });

  it('opens the grade sub-menu when Simplify is clicked', async () => {
    const user = userEvent.setup();
    render(<SelectionToolbar rect={RECT} onWrap={vi.fn()} onSimplify={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /simplify/i }));
    expect(screen.getByRole('button', { name: /simplify to grade 6/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /simplify to grade 8/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /simplify to grade 12/i })).toBeInTheDocument();
  });

  it('calls onSimplify with the grade value when a grade is chosen', async () => {
    const onSimplify = vi.fn();
    const user = userEvent.setup();
    render(<SelectionToolbar rect={RECT} onWrap={vi.fn()} onSimplify={onSimplify} />);
    await user.click(screen.getByRole('button', { name: /simplify/i }));
    await user.click(screen.getByRole('button', { name: /simplify to grade 6/i }));
    expect(onSimplify).toHaveBeenCalledWith('grade:6');
  });

  it('closes the grade sub-menu after a grade is chosen', async () => {
    const user = userEvent.setup();
    render(<SelectionToolbar rect={RECT} onWrap={vi.fn()} onSimplify={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /simplify/i }));
    await user.click(screen.getByRole('button', { name: /simplify to grade 8/i }));
    expect(screen.queryByRole('button', { name: /simplify to grade 6/i })).not.toBeInTheDocument();
  });

  it('calls onWrap for Bold button click', async () => {
    const onWrap = vi.fn();
    const user = userEvent.setup();
    render(<SelectionToolbar rect={RECT} onWrap={onWrap} />);
    await user.click(screen.getByRole('button', { name: /bold/i }));
    expect(onWrap).toHaveBeenCalledWith('**', '**');
  });
});
