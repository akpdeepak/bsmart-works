import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// One mock of the pivot client shared by all three surfaces — proves they render pivot widgets
// through the same client. resolvePivot / resolvePivotBatch return a small status breakdown.
const resolvePivot = vi.fn(() => Promise.resolve({ dimensions: ['status'], measures: ['count'], rows: [{ status: 'Open', count: 5 }] }));
const resolvePivotBatch = vi.fn((_ws, items) => Promise.resolve(
  Object.keys(items).map((id) => ({ id, data: { dimensions: ['status'], measures: ['count'], rows: [{ status: 'Open', count: 5 }] }, error: null })),
));

vi.mock('@/lib/pivot', async () => {
  const actual = await vi.importActual('@/lib/pivot');
  return {
    ...actual,
    fetchChartTypes: vi.fn(() => Promise.resolve([
      { id: 'bar', label: 'Bar', minDimensions: 1, maxDimensions: 1, minMeasures: 1, maxMeasures: null },
      { id: 'pivot_table', label: 'Pivot table', minDimensions: 0, maxDimensions: null, minMeasures: 1, maxMeasures: null },
    ])),
    fetchFieldSchema: vi.fn(() => Promise.resolve({ fields: [{ alias: 'status' }] })),
    resolvePivot: (...a) => resolvePivot(...a),
    resolvePivotBatch: (...a) => resolvePivotBatch(...a),
  };
});

import { DashboardWidgetCard } from '@/components/works/organisms/dashboard-widget-card';
import { ReportSectionCard } from '@/components/works/organisms/report-section-card';
import ReportsView from './reports-view';

const pivotSpec = {
  chartType: 'bar', sourceKind: 'guided', mode: 'group',
  measures: [{ field: '*', agg: 'COUNT' }], dimensions: ['status'], filters: null,
};

beforeEach(() => { resolvePivot.mockClear(); resolvePivotBatch.mockClear(); });

describe('Dashboards surface', () => {
  it('renders a PIVOT widget through the shared pivot client + PivotChart', async () => {
    const widget = { id: 'w1', widgetType: 'PIVOT', title: 'Custom chart', gridW: 6, config: JSON.stringify({ spec: pivotSpec }) };
    render(<DashboardWidgetCard widget={widget} workItems={[]} workspaceId="ws-1" editMode={false} onRemove={() => {}} onResize={() => {}} />);
    await waitFor(() => expect(resolvePivot).toHaveBeenCalledWith('ws-1', expect.objectContaining({ dimensions: ['status'] })));
    expect(await screen.findByRole('img', { name: /Bar chart/ })).toBeInTheDocument();
  });
});

describe('Report Builder surface', () => {
  it('renders a pivot section through the shared pivot client + PivotChart', async () => {
    const section = { type: 'pivot', title: 'Custom chart', config: { spec: pivotSpec } };
    render(<ReportSectionCard section={section} index={0} total={1} workItems={[]} editMode={false} workspaceId="ws-1" onChange={() => {}} onMove={() => {}} onRemove={() => {}} />);
    await waitFor(() => expect(resolvePivot).toHaveBeenCalledWith('ws-1', expect.objectContaining({ dimensions: ['status'] })));
    expect(await screen.findByRole('img', { name: /Bar chart/ })).toBeInTheDocument();
  });
});

describe('Reports surface', () => {
  it('renders pivot-backed insight tiles via the batch client', async () => {
    render(<ReportsView velocityData={[]} sprints={[]} selectedSprintId={null} sprintReport={null}
      scopeChanges={[]} activeWorkspaceId="ws-1" setSelectedSprintId={() => {}} fetchSprintReport={() => {}} />);
    await waitFor(() => expect(resolvePivotBatch).toHaveBeenCalled());
    expect(await screen.findByText('Items by status')).toBeInTheDocument();
    // The bar tile renders the shared chart image once data resolves.
    expect(await screen.findByRole('img', { name: /Bar chart/ })).toBeInTheDocument();
  });
});
