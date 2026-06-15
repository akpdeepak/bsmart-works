import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DashboardWidgetCard } from './dashboard-widget-card';

// Live work-item set the widget computes from client-side. The widget's own filter narrows it
// (here: only High-priority items), and a drill must list exactly the clicked slice of THAT set.
const WORK_ITEMS = [
  { id: 'WI-1', title: 'Login bug', status: 'Open', priority: 'HIGH', type: 'BUG' },
  { id: 'WI-2', title: 'Payment crash', status: 'Open', priority: 'HIGH', type: 'BUG' },
  { id: 'WI-3', title: 'Done thing', status: 'Done', priority: 'HIGH', type: 'STORY' },
  { id: 'WI-4', title: 'Low item', status: 'Open', priority: 'LOW', type: 'TASK' },
];

function renderCard(extra = {}) {
  const onDrill = vi.fn();
  const widget = {
    id: 'w-1',
    widgetType: 'STATUS_BAR',
    title: 'My work',
    gridW: 6,
    config: JSON.stringify({ filter: { highPriority: true }, dimension: 'status' }),
  };
  render(<DashboardWidgetCard widget={widget} workItems={WORK_ITEMS} onDrill={onDrill} {...extra} />);
  return { onDrill };
}

describe('DashboardWidgetCard drill context (§3.4)', () => {
  it('passes the widget filter/dimension context and only the clicked slice to the drill', () => {
    const { onDrill } = renderCard();
    // High-priority filter leaves WI-1/2 (Open) + WI-3 (Done). Drill the "Open" status slice.
    fireEvent.click(screen.getByRole('button', { name: /Open: 2 — show items/i }));
    expect(onDrill).toHaveBeenCalledTimes(1);
    const payload = onDrill.mock.calls[0][0];
    expect(payload.filterContext).toEqual({ baseFilter: { highPriority: true }, dimension: 'status', value: 'Open' });
    // Exactly the slice — the two Open high-priority items, not the whole dashboard.
    expect(payload.items.map(i => i.id)).toEqual(['WI-1', 'WI-2']);
    expect(payload.title).toMatch(/Status: Open/);
  });

  it('makes a server-aggregate scorecard drillable when client items are present', () => {
    const onDrill = vi.fn();
    const widget = {
      id: 'w-2', widgetType: 'SCORECARD', title: 'Total', gridW: 4,
      config: JSON.stringify({ filter: { highPriority: true } }),
    };
    // aggregate overrides the displayed total (server-scoped) but the client items still back the drill.
    render(<DashboardWidgetCard widget={widget} workItems={WORK_ITEMS} aggregate={{ total: 99 }} onDrill={onDrill} />);
    expect(screen.getByText('99')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '99' }));
    const payload = onDrill.mock.calls[0][0];
    expect(payload.filterContext.baseFilter).toEqual({ highPriority: true });
    expect(payload.items.map(i => i.id)).toEqual(['WI-1', 'WI-2', 'WI-3']);
  });

  it('does not drill in edit mode', () => {
    const { onDrill } = renderCard({ editMode: true, onResize: vi.fn(), onRemove: vi.fn(), onConfigChange: vi.fn() });
    const slice = screen.queryByRole('button', { name: /Open: 2 — show items/i });
    expect(slice).not.toBeInTheDocument();
    expect(onDrill).not.toHaveBeenCalled();
  });
});

describe('DashboardWidgetCard PIVOT — server-resolved (embed) path', () => {
  const PIVOT = {
    id: 'p-1', widgetType: 'PIVOT', title: 'Custom chart', gridW: 6,
    config: JSON.stringify({ spec: { chartType: 'bar', sourceKind: 'guided', measures: [{ field: '*', agg: 'COUNT' }], dimensions: ['status'] } }),
  };

  it('renders a pre-resolved pivot directly — no workspaceId needed, no client query', () => {
    const resolved = { dimensions: ['status'], measures: ['count_all'], rows: [{ status: 'Open', count_all: 4 }] };
    render(<DashboardWidgetCard widget={PIVOT} workItems={[]} resolvedPivot={resolved} />);
    // The bar chart renders the resolved row; never the "no workspace selected" embed error.
    // Text appears in both the sr-only data table and the visual bar (WCAG 1.4.1 SR fallback)
    expect(screen.getAllByText('Open').length).toBeGreaterThan(0);
    expect(screen.getAllByText('4').length).toBeGreaterThan(0);
    expect(screen.queryByText(/no workspace/i)).not.toBeInTheDocument();
  });

  it('surfaces a per-widget resolution error from the server', () => {
    render(<DashboardWidgetCard widget={PIVOT} workItems={[]} resolvedPivot={{ error: 'Could not parse query.' }} />);
    expect(screen.getByText(/could not parse query/i)).toBeInTheDocument();
  });
});
