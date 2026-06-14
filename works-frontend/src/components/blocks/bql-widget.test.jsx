import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BqlWidget } from '@/components/blocks/bql-widget';
import { resolvePivot } from '@/lib/pivot';

vi.mock('@/lib/pivot', async () => {
  const actual = await vi.importActual('@/lib/pivot');
  return { ...actual, resolvePivot: vi.fn() };
});

const widgetBlock = (metadata = {}) => ({
  id: 'w1',
  type: 'bqlwidget',
  content: "status != 'Done'",
  metadata: { title: 'Open by status', chartType: 'bar', dimension: 'status', measureField: '*', measureAgg: 'COUNT', ...metadata },
});

describe('BqlWidget', () => {
  beforeEach(() => vi.clearAllMocks());

  it('read mode auto-runs the pivot and renders a chart from aggregated rows', async () => {
    resolvePivot.mockResolvedValue({
      dimensions: ['status'], measures: ['count_all'],
      rows: [{ status: 'Open', count_all: 5 }, { status: 'In Progress', count_all: 2 }],
    });
    render(<BqlWidget block={widgetBlock()} workspaceId="ws-1" readOnly />);

    await waitFor(() => expect(resolvePivot).toHaveBeenCalled());
    const spec = resolvePivot.mock.calls[0][1];
    expect(spec.source).toEqual({ kind: 'bql', query: "status != 'Done'", mode: 'group' });
    expect(spec.dimensions).toEqual(['status']);
    expect(spec.measures).toEqual([{ field: '*', agg: 'COUNT' }]);
    await waitFor(() => expect(screen.getByRole('img', { name: /Bar chart/ })).toBeInTheDocument());
  });

  it('scorecard sums the measure into a single number', async () => {
    resolvePivot.mockResolvedValue({ dimensions: [], measures: ['count_all'], rows: [{ count_all: 12 }] });
    render(<BqlWidget block={widgetBlock({ chartType: 'scorecard' })} workspaceId="ws-1" readOnly />);
    await waitFor(() => expect(screen.getByText('12')).toBeInTheDocument());
  });

  it('edit mode shows config inputs and runs on demand', async () => {
    resolvePivot.mockResolvedValue({ dimensions: ['status'], measures: ['count_all'], rows: [{ status: 'Open', count_all: 1 }] });
    const user = userEvent.setup();
    render(<BqlWidget block={widgetBlock()} onChange={() => {}} workspaceId="ws-1" />);
    expect(screen.getByLabelText('BQL query')).toBeInTheDocument();
    expect(screen.getByLabelText('Chart type')).toBeInTheDocument();
    expect(resolvePivot).not.toHaveBeenCalled(); // edit mode does not auto-run
    await user.click(screen.getByRole('button', { name: 'Run widget query' }));
    await waitFor(() => expect(resolvePivot).toHaveBeenCalled());
  });

  it('shows an error when the query cannot run', async () => {
    resolvePivot.mockRejectedValue(new Error('Unknown field: foo'));
    render(<BqlWidget block={widgetBlock()} workspaceId="ws-1" readOnly />);
    await waitFor(() => expect(screen.getByText('Unknown field: foo')).toBeInTheDocument());
  });
});
