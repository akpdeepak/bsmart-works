import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Select } from './select';

describe('Select', () => {
  it('renders a select element', () => {
    render(
      <Select aria-label="Choose option">
        <option value="a">Option A</option>
        <option value="b">Option B</option>
      </Select>
    );
    expect(screen.getByRole('combobox', { name: 'Choose option' })).toBeInTheDocument();
  });

  it('renders all option children', () => {
    render(
      <Select aria-label="Choose">
        <option value="a">Apple</option>
        <option value="b">Banana</option>
      </Select>
    );
    expect(screen.getByRole('option', { name: 'Apple' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Banana' })).toBeInTheDocument();
  });

  it('reflects controlled value', () => {
    render(
      <Select aria-label="Choose" value="b" onChange={() => {}}>
        <option value="a">A</option>
        <option value="b">B</option>
      </Select>
    );
    expect(screen.getByRole('combobox')).toHaveValue('b');
  });

  it('calls onChange when selection changes', () => {
    const fn = vi.fn();
    render(
      <Select aria-label="Choose" onChange={fn}>
        <option value="a">A</option>
        <option value="b">B</option>
      </Select>
    );
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'b' } });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is set', () => {
    render(
      <Select aria-label="Choose" disabled>
        <option value="a">A</option>
      </Select>
    );
    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('has aria-invalid when invalid prop is set', () => {
    render(
      <Select aria-label="Choose" invalid>
        <option value="a">A</option>
      </Select>
    );
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('forwards ref to the native select', () => {
    const ref = { current: null };
    render(
      <Select aria-label="Choose" ref={ref}>
        <option value="a">A</option>
      </Select>
    );
    expect(ref.current).toBeInstanceOf(HTMLSelectElement);
  });

  it('merges custom className onto the select', () => {
    render(
      <Select aria-label="Choose" className="my-class">
        <option value="a">A</option>
      </Select>
    );
    expect(screen.getByRole('combobox')).toHaveClass('my-class');
  });
});
