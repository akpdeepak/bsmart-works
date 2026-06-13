import { describe, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { expectNoA11yViolations } from '@/test/a11y';

const chartTypes = [
  { id: 'scorecard', label: 'Scorecard', minDimensions: 0, maxDimensions: 0, minMeasures: 1, maxMeasures: 1 },
  { id: 'bar', label: 'Bar', minDimensions: 1, maxDimensions: 1, minMeasures: 1, maxMeasures: null },
  { id: 'donut', label: 'Donut', minDimensions: 1, maxDimensions: 1, minMeasures: 1, maxMeasures: 1 },
  { id: 'pivot_table', label: 'Pivot table', minDimensions: 0, maxDimensions: null, minMeasures: 1, maxMeasures: null },
];

vi.mock('@/lib/pivot', async () => {
  const actual = await vi.importActual('@/lib/pivot');
  return {
    ...actual,
    fetchChartTypes: vi.fn(() => Promise.resolve(chartTypes)),
    fetchFieldSchema: vi.fn(() => Promise.resolve({ fields: [{ alias: 'status' }, { alias: 'type' }, { alias: 'priority' }] })),
    resolvePivot: vi.fn(() => Promise.resolve({ dimensions: ['status'], measures: ['count'], rows: [{ status: 'Open', count: 3 }] })),
  };
});

import { WidgetBuilder } from './widget-builder';

describe('WidgetBuilder a11y', () => {
  it('the chart builder (live preview, field pickers) has no serious/critical violations', async () => {
    const { container } = render(<WidgetBuilder workspaceId="ws-1" onSave={() => {}} />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Donut' })).toBeInTheDocument());
    await expectNoA11yViolations(container);
  });
});
