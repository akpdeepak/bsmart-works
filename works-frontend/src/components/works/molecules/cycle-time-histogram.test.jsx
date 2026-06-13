import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CycleTimeHistogram } from './cycle-time-histogram';

const DIST = {
  median: 36,                 // 1d 12h
  p85: 200,                   // ~8d 8h → falls in the 1w–2w bucket
  buckets: [2, 5, 3, 1, 0],   // ≤1d, 1–3d, 3d–1w, 1w–2w, >2w
  outliers: ['WI-101', 'WI-102', 'WI-103'],
};

describe('CycleTimeHistogram', () => {
  it('renders a bar with a count for each duration bucket', () => {
    render(<CycleTimeHistogram distribution={DIST} />);
    expect(screen.getByText('≤ 1d')).toBeInTheDocument();
    expect(screen.getByText('1–3d')).toBeInTheDocument();
    expect(screen.getByText('3d–1w')).toBeInTheDocument();
    expect(screen.getByText('1w–2w')).toBeInTheDocument();
    expect(screen.getByText('> 2w')).toBeInTheDocument();
    // counts surfaced as text (meaning never colour-alone)
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('shows median and P85 markers with formatted duration labels', () => {
    render(<CycleTimeHistogram distribution={DIST} />);
    expect(screen.getByText(/Median 1d 12h/)).toBeInTheDocument();
    expect(screen.getByText(/P85 8d 8h/)).toBeInTheDocument();
  });

  it('exposes an accessible image summary of the distribution', () => {
    render(<CycleTimeHistogram distribution={DIST} />);
    const img = screen.getByRole('img', { name: /Cycle-time distribution/ });
    expect(img).toHaveAttribute('aria-label', expect.stringContaining('≤ 1d: 2'));
    expect(img.getAttribute('aria-label')).toContain('Median 1d 12h');
  });

  it('lists outliers and drills into the underlying item on click', async () => {
    const onSelectOutlier = vi.fn();
    render(<CycleTimeHistogram distribution={DIST} onSelectOutlier={onSelectOutlier} />);
    expect(screen.getByText(/Outliers — slower than P85 \(3\)/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Open outlier work item WI-101' }));
    expect(onSelectOutlier).toHaveBeenCalledWith('WI-101');
  });

  it('renders outliers as plain chips (no buttons) when no drill handler is given', () => {
    render(<CycleTimeHistogram distribution={DIST} />);
    expect(screen.getByText('WI-101')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Open outlier/ })).not.toBeInTheDocument();
  });

  it('shows an actionable empty state when there are no completed items', () => {
    render(<CycleTimeHistogram distribution={{ median: 0, p85: 0, buckets: [0, 0, 0, 0, 0], outliers: [] }} />);
    expect(screen.getByText(/No completed items yet/)).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('shows the empty state when distribution is missing entirely', () => {
    render(<CycleTimeHistogram distribution={null} />);
    expect(screen.getByText(/No completed items yet/)).toBeInTheDocument();
  });
});
