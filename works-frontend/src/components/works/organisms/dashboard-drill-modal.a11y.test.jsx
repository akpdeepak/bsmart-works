import { describe, it } from 'vitest';
import { render } from '@testing-library/react';
import { DashboardDrillModal } from './dashboard-drill-modal';
import { expectNoA11yViolations } from '@/test/a11y';

const DRILL = {
  title: 'Status: Open',
  filterContext: { dimension: 'status', value: 'Open' },
  items: [
    { id: 'WI-1', title: 'Login bug', status: 'Open', priority: 'HIGH' },
    { id: 'WI-2', title: 'Payment crash', status: 'Open', priority: 'LOW' },
  ],
};

describe('DashboardDrillModal a11y', () => {
  it('populated drill has no serious/critical violations', async () => {
    const { container } = render(<DashboardDrillModal drill={DRILL} onClose={() => {}} onOpenItem={() => {}} />);
    await expectNoA11yViolations(container);
  });
  it('empty drill has no serious/critical violations', async () => {
    const { container } = render(<DashboardDrillModal drill={{ title: 'Empty', items: [] }} onClose={() => {}} onOpenItem={() => {}} />);
    await expectNoA11yViolations(container);
  });
});
