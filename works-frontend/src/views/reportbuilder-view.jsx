import { FileText, File as FileIcon, ArrowLeft, Puzzle } from 'lucide-react';
import { Button } from '@/components/works/button';
import { EmptyState } from '@/components/works/atoms/empty-state';
import { ExportButtons } from '@/components/works/export-buttons';
import { Modal } from '@/components/works/molecules/modal';
import { ReportSectionCard } from '@/components/works/organisms/report-section-card';

/**
 * ReportBuilderView — report composition surface (list + editor + schedule manager).
 *
 * Extracted from App.jsx (TD-003). All state lives in App; this component is a
 * pure rendering shell that accepts handlers as props.
 */
export default function ReportBuilderView({
  reports,
  selectedReport,
  reportEditMode,
  reportSections,
  reportTemplates,
  scheduleManagerOpen,
  reportSchedules,
  scheduleForm,
  workItems,
  activeWorkspaceId,
  createBlankReport,
  createReportFromTemplate,
  openReport,
  deleteReport,
  saveReport,
  addReportSection,
  updateReportSection,
  moveReportSection,
  removeReportSection,
  openScheduleManager,
  toggleReportSchedule,
  deleteReportSchedule,
  createReportSchedule,
  setSelectedReport,
  setReportEditMode,
  setScheduleManagerOpen,
  setScheduleForm,
  showToast,
}) {
  const onPressKey = (e) => { if (e.key === 'Enter' || e.key === ' ') e.currentTarget.click(); };

  return (
    <>
      <div className="p-6 overflow-y-auto h-full">
        {!selectedReport ? (
          <>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">Report builder</h1>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">Compose full-page reports from sections — KPIs, charts, tables and narrative.</p>
              </div>
              <Button variant="action" onClick={createBlankReport}>New report</Button>
            </div>

            {reportTemplates.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wide mb-3">Start from a template</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {reportTemplates.map(t => (
                    <div key={t.id} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 flex flex-col">
                      <p className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">{t.name}</p>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5 mb-3 flex-1">{t.description || '—'}</p>
                      <div><Button variant="secondary" onClick={() => createReportFromTemplate(t)}>Use template</Button></div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wide mb-3">Your reports</h2>
            {reports.length === 0 ? (
              <EmptyState icon={FileIcon} title="No reports yet"
                subtitle="Create a report from scratch or start from a template above."
                action={<Button variant="action" onClick={createBlankReport}>New report</Button>} />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {reports.map(r => (
                  <div key={r.id} onClick={() => openReport(r.id)} role="button" tabIndex={0} onKeyDown={onPressKey}
                    className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 cursor-pointer hover:border-brand-navy/40 hover:shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-navy-tint/40">
                    <FileText className="h-6 w-6 text-neutral-600 dark:text-neutral-400" aria-hidden="true" />
                    <p className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 mt-2 truncate">{r.name}</p>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">{r.updatedAt ? `Updated ${new Date(r.updatedAt).toLocaleDateString()}` : '—'}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3 min-w-0">
                <button onClick={() => setSelectedReport(null)} className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-brand-navy transition-colors flex-shrink-0">
                  <ArrowLeft className="inline-block h-3.5 w-3.5 mr-1 align-text-bottom" aria-hidden="true" />Reports
                </button>
                {reportEditMode ? (
                  <input value={selectedReport.name || ''} onChange={e => setSelectedReport(r => ({ ...r, name: e.target.value }))}
                    aria-label="Report name"
                    className="text-xl font-semibold text-neutral-900 dark:text-white bg-transparent border-b border-neutral-200 dark:border-neutral-700 focus-visible:outline-none focus-visible:border-brand-navy" />
                ) : (
                  <h1 className="text-xl font-semibold text-neutral-900 dark:text-white truncate">{selectedReport.name}</h1>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {!reportEditMode && <ExportButtons targetId="report-export-area"
                  rows={workItems.map(i => ({ ID: i.id, Title: i.title, Type: i.type, Status: i.status, Priority: i.priority, Assignee: i.assigneeId }))}
                  filename={selectedReport.name || 'report'} onError={() => showToast('Export failed — try again', 'error')} />}
                {!reportEditMode && <Button variant="secondary" onClick={() => openScheduleManager(selectedReport.id)}>Schedule</Button>}
                {reportEditMode && <Button variant="action" onClick={() => { saveReport(); setReportEditMode(false); }}>Save</Button>}
                <Button variant={reportEditMode ? 'secondary' : 'action'}
                  onClick={() => { if (reportEditMode) { openReport(selectedReport.id); } else { setReportEditMode(true); } }}>
                  {reportEditMode ? 'Cancel' : 'Edit'}
                </Button>
                <button onClick={() => deleteReport(selectedReport.id)} className="text-xs text-semantic-danger hover:underline">Delete</button>
              </div>
            </div>

            {reportEditMode && (
              <div className="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-md bg-neutral-100 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700">
                <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wide mr-1">Add section</span>
                <button onClick={() => addReportSection('kpi')} className="text-xs px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-brand-navy transition-colors">+ KPI</button>
                <button onClick={() => addReportSection('chart')} className="text-xs px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-brand-navy transition-colors">+ Chart</button>
                <button onClick={() => addReportSection('pivot')} className="text-xs px-2.5 py-1.5 rounded-lg border border-brand-navy/40 text-brand-navy dark:text-brand-amber hover:border-brand-navy transition-colors">+ Pivot chart</button>
                <button onClick={() => addReportSection('table')} className="text-xs px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-brand-navy transition-colors">+ Table</button>
                <button onClick={() => addReportSection('narrative')} className="text-xs px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-brand-navy transition-colors">+ Narrative</button>
              </div>
            )}

            {reportSections.length === 0 ? (
              <EmptyState icon={Puzzle} title="Empty report"
                subtitle="Turn on Edit and add sections — KPIs, charts, tables, narrative."
                action={<Button variant="action" onClick={() => setReportEditMode(true)}>Edit report</Button>} />
            ) : (
              <div id="report-export-area" className="space-y-4 max-w-4xl">
                {reportSections.map((sec, i) => (
                  <ReportSectionCard key={i} section={sec} index={i} total={reportSections.length}
                    workItems={workItems} editMode={reportEditMode} workspaceId={activeWorkspaceId}
                    onChange={s => updateReportSection(i, s)}
                    onMove={delta => moveReportSection(i, delta)}
                    onRemove={() => removeReportSection(i)} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Scheduled delivery modal */}
      {scheduleManagerOpen && selectedReport && (
        <Modal title="Scheduled delivery" onClose={() => setScheduleManagerOpen(false)} size="lg" className="max-h-[90vh] overflow-y-auto">
          <p className="text-xs text-neutral-500 mb-4 truncate">"{selectedReport.name}" — delivered on a cadence to recipients (in-app / email).</p>

          <div className="space-y-2 mb-5">
            {reportSchedules.length === 0
              ? <p className="text-sm text-neutral-600 text-center py-3">No schedules yet.</p>
              : reportSchedules.map(s => (
                <div key={s.id} className="flex items-center gap-2 border border-neutral-200 dark:border-neutral-700 rounded-lg p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-neutral-900 dark:text-neutral-100">{s.cadence?.toLowerCase()} · {s.channel?.replace('_', '-').toLowerCase()}</p>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 truncate">{s.recipients ? `to ${s.recipients}` : 'owner only'}{s.nextRunAt ? ` · next ${new Date(s.nextRunAt).toLocaleDateString()}` : ''}</p>
                  </div>
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${s.active ? 'bg-semantic-success text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500'}`}>{s.active ? 'ACTIVE' : 'PAUSED'}</span>
                  <button onClick={() => toggleReportSchedule(s)} className="text-xs text-brand-navy hover:underline">{s.active ? 'Pause' : 'Resume'}</button>
                  <button onClick={() => deleteReportSchedule(s.id)} className="text-xs text-semantic-danger hover:underline">Remove</button>
                </div>
              ))}
          </div>

          <div className="border-t border-neutral-200 dark:border-neutral-700 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2">Add a schedule</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label htmlFor="sched-cadence" className="block text-xs text-neutral-500 mb-1">Cadence</label>
                <select id="sched-cadence" className="input w-full" value={scheduleForm.cadence} onChange={e => setScheduleForm({ ...scheduleForm, cadence: e.target.value })}>
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
              </div>
              <div>
                <label htmlFor="sched-channel" className="block text-xs text-neutral-500 mb-1">Channel</label>
                <select id="sched-channel" className="input w-full" value={scheduleForm.channel} onChange={e => setScheduleForm({ ...scheduleForm, channel: e.target.value })}>
                  <option value="IN_APP">In-app</option>
                  <option value="EMAIL">Email</option>
                  <option value="BOTH">Both</option>
                </select>
              </div>
            </div>
            <div className="mb-3">
              <label htmlFor="sched-recipients" className="block text-xs text-neutral-500 mb-1">Recipients (comma-separated user ids — optional; owner always included)</label>
              <input id="sched-recipients" className="input w-full" value={scheduleForm.recipients} onChange={e => setScheduleForm({ ...scheduleForm, recipients: e.target.value })} placeholder="USR-123, USR-456" />
            </div>
            <div className="flex justify-end">
              <Button variant="action" onClick={createReportSchedule}>Add schedule</Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
