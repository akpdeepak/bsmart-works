import { describe, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { DashboardWidgetCard } from './dashboard-widget-card';
import { expectNoA11yViolations } from '@/test/a11y';

const WORK_ITEMS = [
  { id: 'WI-1', title: 'Login bug', status: 'Open', priority: 'HIGH', type: 'BUG' },
  { id: 'WI-2', title: 'Done thing', status: 'Done', priority: 'LOW', type: 'STORY' },
];

describe('DashboardWidgetCard a11y', () => {
  it('a status-bar widget (drillable slices) has no serious/critical violations', async () => {
    const widget = {
      id: 'w-1', widgetType: 'STATUS_BAR', title: 'My work', gridW: 6,
      config: JSON.stringify({ dimension: 'status' }),
    };
    const { container } = render(<DashboardWidgetCard widget={widget} workItems={WORK_ITEMS} onDrill={vi.fn()} />);
    await expectNoA11yViolations(container);
  });

  it('an item-list widget has no serious/critical violations', async () => {
    const widget = {
      id: 'w-2', widgetType: 'ITEM_LIST', title: 'Open items', gridW: 6,
      config: JSON.stringify({ limit: 6 }),
    };
    const { container } = render(<DashboardWidgetCard widget={widget} workItems={WORK_ITEMS} onDrill={vi.fn()} />);
    await expectNoA11yViolations(container);
  });

  it('a scorecard widget in edit mode (resize/remove controls) has no serious/critical violations', async () => {
    const widget = {
      id: 'w-3', widgetType: 'SCORECARD', title: 'Total', gridW: 4,
      config: JSON.stringify({ filter: { open: true } }),
    };
    const { container } = render(
      <DashboardWidgetCard widget={widget} workItems={WORK_ITEMS} editMode
        onResize={vi.fn()} onRemove={vi.fn()} onConfigChange={vi.fn()} onDrill={vi.fn()} />,
    );
    await expectNoA11yViolations(container);
  });
});
