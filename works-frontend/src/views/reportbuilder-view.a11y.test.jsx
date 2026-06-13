import { describe, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { expectNoA11yViolations } from '@/test/a11y';

vi.mock('@/lib/pivot', async () => {
  const actual = await vi.importActual('@/lib/pivot');
  return {
    ...actual,
    resolvePivot: vi.fn(() => Promise.resolve({ dimensions: ['status'], measures: ['count'], rows: [{ status: 'Open', count: 2 }] })),
  };
});

import ReportBuilderView from './reportbuilder-view';

const noop = () => {};
const WORK_ITEMS = [{ id: 'WI-1', title: 'A', status: 'Open', priority: 'HIGH', type: 'BUG', assigneeId: 'u-1' }];
const TEMPLATES = [{ id: 'T-1', name: 'Weekly digest', description: 'A weekly summary' }];
const REPORTS = [{ id: 'R-1', name: 'My report', updatedAt: '2026-06-10T10:00:00Z' }];
const SECTIONS = [
  { type: 'narrative', title: 'Summary', body: 'All good.' },
  { type: 'kpi', title: 'KPIs', items: [{ label: 'Done', value: 6 }] },
];

const baseProps = {
  reports: REPORTS, selectedReport: null, reportEditMode: false, reportSections: [],
  reportTemplates: TEMPLATES, scheduleManagerOpen: false, reportSchedules: [],
  scheduleForm: { cadence: 'WEEKLY', channel: 'IN_APP', recipients: '' },
  workItems: WORK_ITEMS, activeWorkspaceId: 'ws-1',
  createBlankReport: noop, createReportFromTemplate: noop, openReport: noop, deleteReport: noop,
  saveReport: noop, addReportSection: noop, updateReportSection: noop, moveReportSection: noop,
  removeReportSection: noop, openScheduleManager: noop, toggleReportSchedule: noop,
  deleteReportSchedule: noop, createReportSchedule: noop, setSelectedReport: noop,
  setReportEditMode: noop, setScheduleManagerOpen: noop, setScheduleForm: noop, showToast: noop,
};

const OPEN = { ...baseProps, selectedReport: REPORTS[0], reportSections: SECTIONS };

describe('ReportBuilderView a11y', () => {
  it('the report list + template gallery has no serious/critical violations', async () => {
    const { container } = render(<ReportBuilderView {...baseProps} />);
    await screen.findByText('My report');
    await expectNoA11yViolations(container);
  });

  it('an open report with sections has no serious/critical violations', async () => {
    const { container } = render(<ReportBuilderView {...OPEN} />);
    await screen.findByText('Summary');
    await expectNoA11yViolations(container);
  });

  it('the scheduled-delivery modal has no serious/critical violations', async () => {
    const { container } = render(<ReportBuilderView {...OPEN} scheduleManagerOpen />);
    await screen.findByText(/delivered on a cadence/i);
    await expectNoA11yViolations(container);
  });
});
