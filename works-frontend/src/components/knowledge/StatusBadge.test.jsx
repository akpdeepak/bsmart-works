import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StatusBadge, STATUS_COLORS, STATUS_LABELS } from './StatusBadge';

describe('StatusBadge (KR-017)', () => {
  it('renders a span (non-interactive) when onClick is omitted', () => {
    const { container } = render(<StatusBadge status="DRAFT" />);
    expect(container.querySelector('span')).toBeTruthy();
    expect(container.querySelector('button')).toBeNull();
  });

  it('renders a button with aria-label when onClick is provided', () => {
    render(<StatusBadge status="DRAFT" onClick={vi.fn()} />);
    const btn = screen.getByRole('button');
    expect(btn.getAttribute('aria-label')).toMatch(/draft/i);
  });

  it('renders the correct label for each status', () => {
    Object.entries(STATUS_LABELS).forEach(([s, label]) => {
      const { unmount } = render(<StatusBadge status={s} />);
      expect(screen.getByText(label)).toBeTruthy();
      unmount();
    });
  });

  it('falls back to DRAFT when status is undefined', () => {
    render(<StatusBadge />);
    expect(screen.getByText('Draft')).toBeTruthy();
  });

  it('calls onClick when the badge button is clicked', () => {
    const onClick = vi.fn();
    render(<StatusBadge status="IN_REVIEW" onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('applies status-specific color classes', () => {
    const { container } = render(<StatusBadge status="PUBLISHED" />);
    const el = container.firstChild;
    const cls = STATUS_COLORS.PUBLISHED;
    cls.split(' ').forEach(c => expect(el.className).toContain(c));
  });
});
