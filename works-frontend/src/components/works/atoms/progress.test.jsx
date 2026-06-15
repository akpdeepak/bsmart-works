import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Progress } from './progress';

describe('Progress', () => {
  it('renders a progressbar role', () => {
    render(<Progress value={50} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('sets aria-valuenow for determinate', () => {
    render(<Progress value={42} label="Upload" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '42');
  });

  it('omits aria-valuenow for indeterminate', () => {
    render(<Progress />);
    expect(screen.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow');
  });

  it('clamps value below 0 to 0', () => {
    render(<Progress value={-10} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });

  it('clamps value above 100 to 100', () => {
    render(<Progress value={120} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });

  it('uses the label prop as aria-label', () => {
    render(<Progress value={30} label="Uploading file" />);
    expect(screen.getByRole('progressbar', { name: 'Uploading file' })).toBeInTheDocument();
  });
});
