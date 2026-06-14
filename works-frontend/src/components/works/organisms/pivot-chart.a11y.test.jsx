import { describe, it } from 'vitest';
import { render } from '@testing-library/react';
import { PivotChart } from './pivot-chart';
import { expectNoA11yViolations } from '@/test/a11y';

// The shared chart dispatcher backs every Insights surface. Each chart type emits its own a11y
// affordance (labelled img, data-table fallback, sr-only loading text), so we sweep the type
// matrix + the five states for serious/critical axe violations.
const oneDim = {
  dimensions: ['status'], measures: ['count'],
  rows: [{ status: 'Open', count: 6 }, { status: 'Done', count: 4 }],
};
const twoDim = {
  dimensions: ['status', 'type'], measures: ['count'],
  rows: [{ status: 'Open', type: 'Bug', count: 3 }, { status: 'Done', type: 'Story', count: 1 }],
};
const scalar = { dimensions: [], measures: ['count'], rows: [{ count: 42 }] };

describe('PivotChart a11y', () => {
  it('loading state has no serious/critical violations', async () => {
    const { container } = render(<PivotChart type="bar" loading />);
    await expectNoA11yViolations(container);
  });
  it('error state has no serious/critical violations', async () => {
    const { container } = render(<PivotChart type="bar" error="Boom" />);
    await expectNoA11yViolations(container);
  });
  it('empty state has no serious/critical violations', async () => {
    const { container } = render(<PivotChart type="bar" result={{ dimensions: ['status'], measures: ['count'], rows: [] }} />);
    await expectNoA11yViolations(container);
  });

  it.each([
    'bar', 'column', 'donut', 'pie', 'line', 'area', 'funnel', 'treemap', 'sparkline',
  ])('single-series type "%s" has no serious/critical violations', async (type) => {
    const { container } = render(<PivotChart type={type} result={oneDim} />);
    await expectNoA11yViolations(container);
  });

  it.each(['stacked_bar', 'grouped_bar', 'heatmap', 'matrix', 'pivot_table'])(
    'matrix/table type "%s" has no serious/critical violations',
    async (type) => {
      const { container } = render(<PivotChart type={type} result={twoDim} />);
      await expectNoA11yViolations(container);
    },
  );

  it.each(['scorecard', 'gauge'])('scalar type "%s" has no serious/critical violations', async (type) => {
    const { container } = render(<PivotChart type={type} result={scalar} />);
    await expectNoA11yViolations(container);
  });
});
