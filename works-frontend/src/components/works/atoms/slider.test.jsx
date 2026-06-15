import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Slider } from './slider';

describe('Slider', () => {
  it('renders a range input', () => {
    render(<Slider label="Volume" />);
    expect(screen.getByRole('slider', { name: 'Volume' })).toBeInTheDocument();
  });

  it('sets min, max, and step attributes', () => {
    render(<Slider label="Speed" min={10} max={200} step={10} />);
    const input = screen.getByRole('slider');
    expect(input).toHaveAttribute('min', '10');
    expect(input).toHaveAttribute('max', '200');
    expect(input).toHaveAttribute('step', '10');
  });

  it('defaults to min value when defaultValue not set', () => {
    render(<Slider label="Volume" min={5} max={100} />);
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '5');
  });

  it('renders the value display when showValue=true', () => {
    render(<Slider label="Brightness" value={60} showValue onChange={vi.fn()} />);
    expect(screen.getByText('60')).toBeInTheDocument();
  });

  it('calls onChange with the numeric value', () => {
    const onChange = vi.fn();
    render(<Slider label="Volume" min={0} max={100} onChange={onChange} />);
    const input = screen.getByRole('slider');
    fireEvent.change(input, { target: { value: '42' } });
    expect(onChange).toHaveBeenCalledWith(42);
  });

  it('is disabled when disabled=true', () => {
    render(<Slider label="Volume" disabled />);
    expect(screen.getByRole('slider')).toBeDisabled();
  });
});
