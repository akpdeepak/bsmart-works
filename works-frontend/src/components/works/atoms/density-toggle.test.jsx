import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DensityToggle } from './density-toggle';

describe('DensityToggle', () => {
  it('renders all 3 density buttons', () => {
    render(<DensityToggle density="comfortable" setDensity={() => {}} />);
    expect(screen.getByRole('button', { name: 'Compact' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Comfortable' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Spacious' })).toBeInTheDocument();
  });

  it('active button has aria-pressed="true"; inactive buttons have aria-pressed="false"', () => {
    render(<DensityToggle density="comfortable" setDensity={() => {}} />);
    expect(screen.getByRole('button', { name: 'Comfortable' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Compact' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Spacious' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('active button changes when density prop changes', () => {
    const { rerender } = render(<DensityToggle density="compact" setDensity={() => {}} />);
    expect(screen.getByRole('button', { name: 'Compact' })).toHaveAttribute('aria-pressed', 'true');
    rerender(<DensityToggle density="spacious" setDensity={() => {}} />);
    expect(screen.getByRole('button', { name: 'Spacious' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Compact' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('clicking a button calls setDensity with the correct level', () => {
    const setDensity = vi.fn();
    render(<DensityToggle density="comfortable" setDensity={setDensity} />);
    fireEvent.click(screen.getByRole('button', { name: 'Compact' }));
    expect(setDensity).toHaveBeenCalledWith('compact');
  });

  it('clicking spacious calls setDensity with "spacious"', () => {
    const setDensity = vi.fn();
    render(<DensityToggle density="comfortable" setDensity={setDensity} />);
    fireEvent.click(screen.getByRole('button', { name: 'Spacious' }));
    expect(setDensity).toHaveBeenCalledWith('spacious');
  });

  it('container has role="group" and aria-label="Display density"', () => {
    render(<DensityToggle density="comfortable" setDensity={() => {}} />);
    expect(screen.getByRole('group', { name: 'Display density' })).toBeInTheDocument();
  });

  it('accepts an additional className on the container', () => {
    render(<DensityToggle density="comfortable" setDensity={() => {}} className="mt-2" />);
    const group = screen.getByRole('group', { name: 'Display density' });
    expect(group.className).toContain('mt-2');
  });
});
