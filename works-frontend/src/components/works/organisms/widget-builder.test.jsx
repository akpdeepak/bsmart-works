import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the pivot client — no real HTTP. fetchChartTypes returns a small registry;
// fetchFieldSchema returns the allow-list; resolvePivot records the spec it was given.
const chartTypes = [
  { id: 'scorecard', label: 'Scorecard', minDimensions: 0, maxDimensions: 0, minMeasures: 1, maxMeasures: 1 },
  { id: 'bar', label: 'Bar', minDimensions: 1, maxDimensions: 1, minMeasures: 1, maxMeasures: null },
  { id: 'donut', label: 'Donut', minDimensions: 1, maxDimensions: 1, minMeasures: 1, maxMeasures: 1 },
  { id: 'pivot_table', label: 'Pivot table', minDimensions: 0, maxDimensions: null, minMeasures: 1, maxMeasures: null },
];
const resolvePivot = vi.fn(() => Promise.resolve({ dimensions: ['status'], measures: ['count'], rows: [{ status: 'Open', count: 3 }] }));

vi.mock('@/lib/pivot', async () => {
  const actual = await vi.importActual('@/lib/pivot');
  return {
    ...actual,
    fetchChartTypes: vi.fn(() => Promise.resolve(chartTypes)),
    fetchFieldSchema: vi.fn(() => Promise.resolve({ fields: [{ alias: 'status' }, { alias: 'type' }, { alias: 'priority' }] })),
    resolvePivot: (...args) => resolvePivot(...args),
  };
});

import { WidgetBuilder } from './widget-builder';
import { buildPivotSpec } from '@/lib/pivot';

beforeEach(() => { resolvePivot.mockClear(); });

describe('buildPivotSpec', () => {
  it('builds a valid PivotSpec from builder state', () => {
    const spec = buildPivotSpec({
      sourceKind: 'guided', mode: 'group',
      measures: [{ field: '*', agg: 'COUNT' }],
      dimensions: ['status'], filters: 'open = true',
    });
    expect(spec.source.kind).toBe('guided');
    expect(spec.measures).toEqual([{ field: '*', agg: 'COUNT' }]);
    expect(spec.dimensions).toEqual(['status']);
    expect(spec.filters).toBe('open = true');
  });
  it('routes bql / metric source kinds', () => {
    expect(buildPivotSpec({ sourceKind: 'bql', query: "status = 'Open'" }).source.query).toBe("status = 'Open'");
    expect(buildPivotSpec({ sourceKind: 'metric', metricKey: 'open_items' }).source.key).toBe('open_items');
  });
});

describe('WidgetBuilder', () => {
  it('runs a live preview through the pivot client with a valid spec', async () => {
    render(<WidgetBuilder workspaceId="ws-1" onSave={() => {}} />);
    await waitFor(() => expect(resolvePivot).toHaveBeenCalled());
    const [ws, spec] = resolvePivot.mock.calls[0];
    expect(ws).toBe('ws-1');
    expect(spec.measures[0]).toEqual({ field: '*', agg: 'COUNT' });
    // Default chart (bar) needs a dimension; with none chosen it should flag + suggest.
    expect(spec.dimensions).toEqual([]);
  });

  it('offers every chart type and flags incompatible ones', async () => {
    render(<WidgetBuilder workspaceId="ws-1" onSave={() => {}} />);
    await screen.findByRole('button', { name: 'Donut' });
    // All four registry types are offered as buttons (none hidden). Match exact labels so the
    // "Use X instead" suggestion button doesn't collide with the chart-type buttons.
    chartTypes.forEach((c) => expect(screen.getByRole('button', { name: c.label })).toBeInTheDocument());
  });

  it('suggests a compatible alternative when the chosen chart does not fit, and applies it', async () => {
    const user = userEvent.setup();
    render(<WidgetBuilder workspaceId="ws-1" value={{ chartType: 'bar' }} onSave={() => {}} />);
    await screen.findByRole('button', { name: /Bar/ });
    // bar needs 1 dimension; with 0 dims it's incompatible → a suggestion appears.
    const suggestion = await screen.findByRole('button', { name: /Use .* instead/ });
    expect(suggestion).toBeInTheDocument();
    await user.click(suggestion);
    // After applying, the warning clears (scorecard fits 0 dims / 1 measure).
    await waitFor(() => expect(screen.queryByRole('button', { name: /Use .* instead/ })).not.toBeInTheDocument());
  });

  it('saves a config; an incompatible chosen type degrades to the suggested/fallback type', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(<WidgetBuilder workspaceId="ws-1" value={{ chartType: 'bar' }} onSave={onSave} />);
    await screen.findByRole('button', { name: /Save widget/ });
    await user.click(screen.getByRole('button', { name: /Save widget/ }));
    expect(onSave).toHaveBeenCalledTimes(1);
    const cfg = onSave.mock.calls[0][0];
    // bar (incompatible with 0 dims) must not be saved as-is — a compatible type is chosen.
    expect(cfg.chartType).not.toBe('bar');
    expect(cfg.measures).toEqual([{ field: '*', agg: 'COUNT' }]);
  });

  it('caps dimensions at the engine maximum (4)', async () => {
    const user = userEvent.setup();
    render(<WidgetBuilder workspaceId="ws-1" value={{ dimensions: ['status', 'type', 'priority'] }} onSave={() => {}} />);
    const addDim = await screen.findByRole('button', { name: /Add dimension/ });
    // Only 3 schema fields exist and 3 are used → add is disabled (no available dims left),
    // and the count label reflects the cap of 4.
    expect(screen.getByText(/3 of 4/)).toBeInTheDocument();
    expect(addDim).toBeDisabled();
    await user.click(addDim); // no-op
    expect(screen.getByText(/3 of 4/)).toBeInTheDocument();
  });
});
