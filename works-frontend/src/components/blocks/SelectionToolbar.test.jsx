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

  // KR-005: text color and highlight palette tests
  it('renders the Text color and Highlight color toggle buttons (KR-005)', () => {
    render(<SelectionToolbar rect={RECT} onWrap={vi.fn()} />);
    expect(screen.getByRole('button', { name: /text color/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /highlight color/i })).toBeInTheDocument();
  });

  it('opens the text color palette when Text color button is clicked (KR-005)', async () => {
    const user = userEvent.setup();
    render(<SelectionToolbar rect={RECT} onWrap={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /text color/i }));
    expect(screen.getByRole('group', { name: /text color palette/i })).toBeInTheDocument();
  });

  it('opens the highlight palette when Highlight color button is clicked (KR-005)', async () => {
    const user = userEvent.setup();
    render(<SelectionToolbar rect={RECT} onWrap={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /highlight color/i }));
    expect(screen.getByRole('group', { name: /highlight color palette/i })).toBeInTheDocument();
  });

  it('calls onWrap with a span tag when a text color swatch is clicked (KR-005)', async () => {
    const onWrap = vi.fn();
    const user = userEvent.setup();
    render(<SelectionToolbar rect={RECT} onWrap={onWrap} />);
    await user.click(screen.getByRole('button', { name: /text color/i }));
    await user.click(screen.getByRole('button', { name: 'Text: Red' }));
    expect(onWrap).toHaveBeenCalledWith('<span class="text-semantic-danger">', '</span>');
  });

  it('calls onWrap with a highlight span when a highlight swatch is clicked (KR-005)', async () => {
    const onWrap = vi.fn();
    const user = userEvent.setup();
    render(<SelectionToolbar rect={RECT} onWrap={onWrap} />);
    await user.click(screen.getByRole('button', { name: /highlight color/i }));
    await user.click(screen.getByRole('button', { name: 'Highlight: Yellow' }));
    expect(onWrap).toHaveBeenCalledWith(expect.stringContaining('bg-yellow-100'), '</span>');
  });

  it('closes the color palette after a swatch is chosen (KR-005)', async () => {
    const user = userEvent.setup();
    render(<SelectionToolbar rect={RECT} onWrap={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /text color/i }));
    await user.click(screen.getByRole('button', { name: 'Text: Navy' }));
    expect(screen.queryByRole('group', { name: /text color palette/i })).not.toBeInTheDocument();
  });
});
