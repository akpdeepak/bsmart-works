import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PivotChart } from './pivot-chart';

// One-dimension, one-measure result reused by most single-series charts.
const oneDim = {
  dimensions: ['status'],
  measures: ['count'],
  rows: [
    { status: 'Open', count: 6 },
    { status: 'Done', count: 4 },
  ],
};

// Two-dimension result for matrix-shaped charts.
const twoDim = {
  dimensions: ['status', 'type'],
  measures: ['count'],
  rows: [
    { status: 'Open', type: 'Bug', count: 3 },
    { status: 'Open', type: 'Story', count: 2 },
    { status: 'Done', type: 'Bug', count: 1 },
  ],
};

describe('PivotChart state handling', () => {
  it('renders a loading skeleton', () => {
    const { container } = render(<PivotChart type="bar" loading />);
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });
  it('renders an error message as an alert', () => {
    render(<PivotChart type="bar" error="Boom" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Boom');
  });
  it('renders an actionable empty state for non-scalar charts', () => {
    render(<PivotChart type="bar" result={{ dimensions: ['status'], measures: ['count'], rows: [] }} />);
    expect(screen.getByText(/No matching data/)).toBeInTheDocument();
  });
});

describe('PivotChart dispatch per type', () => {
  it('bar → labelled bar chart image', () => {
    render(<PivotChart type="bar" result={oneDim} />);
    expect(screen.getByRole('img', { name: /Bar chart/ })).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
  });
  it('donut → donut chart image', () => {
    render(<PivotChart type="donut" result={oneDim} />);
    expect(screen.getByRole('img', { name: /Donut chart/ })).toBeInTheDocument();
  });
  it('line → line chart image', () => {
    render(<PivotChart type="line" result={oneDim} />);
    expect(screen.getByRole('img', { name: /Line chart/ })).toBeInTheDocument();
  });
  it('area → area chart image', () => {
    render(<PivotChart type="area" result={oneDim} />);
    expect(screen.getByRole('img', { name: /Area chart/ })).toBeInTheDocument();
  });
  it('funnel → funnel image', () => {
    render(<PivotChart type="funnel" result={oneDim} />);
    expect(screen.getByRole('img', { name: /Funnel/ })).toBeInTheDocument();
  });
  it('treemap → treemap image', () => {
    render(<PivotChart type="treemap" result={oneDim} />);
    expect(screen.getByRole('img', { name: /Treemap/ })).toBeInTheDocument();
  });
  it('sparkline → sparkline image', () => {
    render(<PivotChart type="sparkline" result={oneDim} />);
    expect(screen.getByRole('img', { name: /Sparkline/ })).toBeInTheDocument();
  });
  it('scorecard → single number', () => {
    render(<PivotChart type="scorecard" result={{ dimensions: [], measures: ['count'], rows: [{ count: 42 }] }} />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });
  it('gauge → gauge image', () => {
    render(<PivotChart type="gauge" result={{ dimensions: [], measures: ['count'], rows: [{ count: 7 }] }} />);
    expect(screen.getByRole('img', { name: /Gauge/ })).toBeInTheDocument();
  });
  it('stacked_bar → stacked bar image', () => {
    render(<PivotChart type="stacked_bar" result={twoDim} />);
    expect(screen.getByRole('img', { name: /Stacked bar/ })).toBeInTheDocument();
  });
  it('grouped_bar → grouped bar image', () => {
    render(<PivotChart type="grouped_bar" result={twoDim} />);
    expect(screen.getByRole('img', { name: /Grouped bar/ })).toBeInTheDocument();
  });
  it('heatmap → a table fallback (a11y)', () => {
    render(<PivotChart type="heatmap" result={twoDim} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
  });
  it('scatter → scatter image (needs two measures)', () => {
    render(<PivotChart type="scatter" result={{ dimensions: [], measures: ['x', 'y'], rows: [{ x: 1, y: 2 }, { x: 3, y: 4 }] }} />);
    expect(screen.getByRole('img', { name: /Scatter/ })).toBeInTheDocument();
  });
  it('bubble → bubble image (three measures)', () => {
    render(<PivotChart type="bubble" result={{ dimensions: [], measures: ['x', 'y', 'r'], rows: [{ x: 1, y: 2, r: 5 }] }} />);
    expect(screen.getByRole('img', { name: /Bubble/ })).toBeInTheDocument();
  });
  it('pivot_table → a table of dimensions + measures', () => {
    render(<PivotChart type="pivot_table" result={oneDim} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('status')).toBeInTheDocument();
  });
  it('unknown type degrades to the pivot table', () => {
    render(<PivotChart type="nonsense" result={oneDim} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
  });
});
