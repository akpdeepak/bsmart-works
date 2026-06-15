import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Pagination } from './pagination';

describe('Pagination', () => {
  it('renders a navigation landmark', () => {
    render(<Pagination page={0} totalPages={5} onPageChange={vi.fn()} />);
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument();
  });

  it('returns null when totalPages <= 1', () => {
    const { container } = render(<Pagination page={0} totalPages={1} />);
    expect(container.firstChild).toBeNull();
  });

  it('disables prev/first buttons on page 0', () => {
    render(<Pagination page={0} totalPages={5} onPageChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'First page' })).toBeDisabled();
  });

  it('disables next/last buttons on the last page', () => {
    render(<Pagination page={4} totalPages={5} onPageChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Last page' })).toBeDisabled();
  });

  it('marks the current page button with aria-current="page"', () => {
    render(<Pagination page={2} totalPages={5} onPageChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Page 3' })).toHaveAttribute('aria-current', 'page');
  });

  it('calls onPageChange with next page on next click', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Pagination page={1} totalPages={5} onPageChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('calls onPageChange with prev page on prev click', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Pagination page={3} totalPages={5} onPageChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Previous page' }));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('shows first and last page numbers', () => {
    render(<Pagination page={5} totalPages={10} onPageChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Page 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Page 10' })).toBeInTheDocument();
  });
});
