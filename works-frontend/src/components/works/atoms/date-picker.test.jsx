import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DatePicker } from './date-picker';

describe('DatePicker', () => {
  it('renders a date input', () => {
    render(<DatePicker aria-label="Due date" />);
    expect(document.querySelector('input[type="date"]')).toBeInTheDocument();
  });

  it('calls onChange with the ISO date string', () => {
    const onChange = vi.fn();
    render(<DatePicker aria-label="Due date" onChange={onChange} />);
    const input = document.querySelector('input[type="date"]');
    fireEvent.change(input, { target: { value: '2026-07-01' } });
    expect(onChange).toHaveBeenCalledWith('2026-07-01');
  });

  it('is disabled when disabled=true', () => {
    render(<DatePicker aria-label="Due date" disabled />);
    expect(document.querySelector('input[type="date"]')).toBeDisabled();
  });

  it('sets aria-invalid when invalid=true', () => {
    render(<DatePicker aria-label="Due date" invalid />);
    expect(document.querySelector('input[type="date"]')).toHaveAttribute('aria-invalid', 'true');
  });

  it('forwards min and max to the input', () => {
    render(<DatePicker aria-label="Due date" min="2026-01-01" max="2026-12-31" />);
    const input = document.querySelector('input[type="date"]');
    expect(input).toHaveAttribute('min', '2026-01-01');
    expect(input).toHaveAttribute('max', '2026-12-31');
  });
});
