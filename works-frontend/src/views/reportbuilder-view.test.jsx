import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ReportBuilderView from './reportbuilder-view';

const noop = () => {};

const baseProps = {
  reports: [],
  selectedReport: null,
  reportEditMode: false,
  reportSections: [],
  reportTemplates: [],
  scheduleManagerOpen: false,
  reportSchedules: [],
  scheduleForm: { cadence: 'WEEKLY', channel: 'IN_APP', recipients: '' },
  workItems: [],
  createBlankReport: noop,
  createReportFromTemplate: noop,
  openReport: noop,
  deleteReport: noop,
  saveReport: noop,
  addReportSection: noop,
  updateReportSection: noop,
  moveReportSection: noop,
  removeReportSection: noop,
  openScheduleManager: noop,
  toggleReportSchedule: noop,
  deleteReportSchedule: noop,
  createReportSchedule: noop,
  setSelectedReport: noop,
  setReportEditMode: noop,
  setScheduleManagerOpen: noop,
  setScheduleForm: noop,
  showToast: noop,
};

describe('ReportBuilderView', () => {
  it('renders the heading and empty state with no reports', () => {
    render(<ReportBuilderView {...baseProps} />);
    expect(screen.getByRole('heading', { name: /report builder/i })).toBeInTheDocument();
    expect(screen.getByText(/no reports yet/i)).toBeInTheDocument();
  });

  it('renders report cards when reports exist', () => {
    const reports = [{ id: 'r1', name: 'Sprint retrospective', updatedAt: null }];
    render(<ReportBuilderView {...baseProps} reports={reports} />);
    expect(screen.getByText('Sprint retrospective')).toBeInTheDocument();
  });

  it('renders New report button', () => {
    render(<ReportBuilderView {...baseProps} />);
    expect(screen.getAllByRole('button', { name: /new report/i })[0]).toBeInTheDocument();
  });
});
