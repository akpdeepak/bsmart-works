import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Radio, RadioGroup } from './radio';

describe('Radio (standalone)', () => {
  it('renders with a label', () => {
    render(<Radio value="a">Option A</Radio>);
    expect(screen.getByRole('radio', { name: 'Option A' })).toBeInTheDocument();
  });

  it('is unchecked by default', () => {
    render(<Radio value="a">A</Radio>);
    expect(screen.getByRole('radio')).not.toBeChecked();
  });

  it('is disabled when disabled prop is set', () => {
    render(<Radio value="a" disabled>A</Radio>);
    expect(screen.getByRole('radio')).toBeDisabled();
  });
});

describe('RadioGroup', () => {
  it('renders all options', () => {
    render(
      <RadioGroup value="b" onChange={() => {}}>
        <Radio value="a">A</Radio>
        <Radio value="b">B</Radio>
        <Radio value="c">C</Radio>
      </RadioGroup>
    );
    expect(screen.getAllByRole('radio')).toHaveLength(3);
  });

  it('marks the selected option as checked (controlled)', () => {
    render(
      <RadioGroup value="b" onChange={() => {}}>
        <Radio value="a">A</Radio>
        <Radio value="b">B</Radio>
      </RadioGroup>
    );
    expect(screen.getByRole('radio', { name: 'A' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'B' })).toBeChecked();
  });

  it('calls onChange with the new value on click', () => {
    const fn = vi.fn();
    render(
      <RadioGroup value="a" onChange={fn}>
        <Radio value="a">A</Radio>
        <Radio value="b">B</Radio>
      </RadioGroup>
    );
    fireEvent.click(screen.getByRole('radio', { name: 'B' }));
    expect(fn).toHaveBeenCalledWith('b');
  });

  it('works uncontrolled with defaultValue', () => {
    render(
      <RadioGroup defaultValue="a">
        <Radio value="a">A</Radio>
        <Radio value="b">B</Radio>
      </RadioGroup>
    );
    expect(screen.getByRole('radio', { name: 'A' })).toBeChecked();
    fireEvent.click(screen.getByRole('radio', { name: 'B' }));
    expect(screen.getByRole('radio', { name: 'B' })).toBeChecked();
  });

  it('has role=radiogroup on the wrapper', () => {
    render(
      <RadioGroup value="a" onChange={() => {}}>
        <Radio value="a">A</Radio>
      </RadioGroup>
    );
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
  });
});
