// useReportsState.js — custom reports domain state (EPIC-03 Phase 2 / W2, GH-537)
// Extracted from AppShell: the report list and templates, the open report and its section list
// (add / update / move / remove), and scheduled delivery (Cap J, S04). Follows the
// useKnowledgeState / usePmState / useComplianceState shape.
import { useState } from 'react';

const EMPTY_SCHEDULE_FORM = { cadence: 'WEEKLY', channel: 'IN_APP', recipients: '' };

// Starter section shapes for the report builder — one per section type.
const SECTION_DEFAULTS = {
  kpi:       { title: 'Open items', config: { metric: 'count', filter: { open: true } } },
  chart:     { title: 'By status', config: { chartType: 'bar', dimension: 'status' } },
  pivot:     { title: 'Custom chart', config: { spec: null } },
  table:     { title: 'Work items', config: { limit: 20 } },
  narrative: { title: 'Summary', config: { text: '' } },
};

/**
 * @param {Object}   api
 * @param {string}   activeWorkspaceId
 * @param {Function} showToast
 * @param {Function} reportError
 * @param {Function} prompt              in-app prompt dialog (lib/dialog.jsx), never window.prompt
 */
export function useReportsState(api, activeWorkspaceId, showToast, reportError, prompt) {
  const [reports, setReports] = useState([]);
  const [reportTemplates, setReportTemplates] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportSections, setReportSections] = useState([]);
  const [reportEditMode, setReportEditMode] = useState(false);
  const [scheduleManagerOpen, setScheduleManagerOpen] = useState(false);
  const [reportSchedules, setReportSchedules] = useState([]);
  const [scheduleForm, setScheduleForm] = useState(EMPTY_SCHEDULE_FORM);

  function fetchReports() {
    api.raw(`/reports`).then(r => r.json()).then(d => setReports(Array.isArray(d) ? d : (d?.items || []))).catch(reportError);
  }
  function fetchReportTemplates() {
    api.raw(`/reports/templates`).then(r => r.json()).then(d => setReportTemplates(Array.isArray(d) ? d : [])).catch(reportError);
  }
  function openReport(id) {
    api.raw(`/reports/${id}`).then(r => r.json()).then(d => {
      setSelectedReport(d);
      try { setReportSections(JSON.parse(d.sections || '[]')); } catch { setReportSections([]); }
      setReportEditMode(false);
    }).catch(reportError);
  }
  async function createBlankReport() {
    const name = await prompt({ title: 'New report', label: 'Report name', placeholder: 'e.g. Monthly delivery summary', confirmLabel: 'Create' });
    if (!name || !name.trim()) return;
    api.send(`/reports`, { method: 'POST', body: JSON.stringify({ name: name.trim(), sections: '[]', workspaceId: activeWorkspaceId }) })
      .then(d => { showToast('Report created'); fetchReports(); openReport(d.id); setReportEditMode(true); })
      .catch(() => showToast('Failed to create report', 'error'));
  }
  function createReportFromTemplate(tpl) {
    api.send(`/reports`, { method: 'POST', body: JSON.stringify({ name: tpl.name, description: tpl.description, sections: tpl.sections, workspaceId: activeWorkspaceId }) })
      .then(d => { showToast('Report created from template'); fetchReports(); openReport(d.id); setReportEditMode(true); })
      .catch(() => showToast('Failed to create report', 'error'));
  }
  function saveReport() {
    if (!selectedReport) return;
    api.send(`/reports/${selectedReport.id}`, { method: 'PUT', body: JSON.stringify({ ...selectedReport, sections: JSON.stringify(reportSections) }) })
      .then(d => { setSelectedReport(d); showToast('Report saved'); fetchReports(); })
      .catch(() => showToast('Failed to save report', 'error'));
  }
  function deleteReport(id) {
    api.send(`/reports/${id}`, { method: 'DELETE' })
      .then(() => { showToast('Report deleted'); setSelectedReport(null); fetchReports(); })
      .catch(() => showToast('Failed to delete report', 'error'));
  }

  // ── scheduled report delivery (Cap J, S04) ───────────────────────────────────
  function openScheduleManager(reportId) {
    setScheduleForm(EMPTY_SCHEDULE_FORM);
    setScheduleManagerOpen(true);
    fetchReportSchedules(reportId);
  }
  function fetchReportSchedules(reportId) {
    api.raw(`/report-schedules?reportId=${reportId}`).then(r => r.json())
      .then(d => setReportSchedules(Array.isArray(d) ? d : [])).catch(reportError);
  }
  function createReportSchedule() {
    if (!selectedReport) return;
    const payload = { reportId: selectedReport.id, cadence: scheduleForm.cadence,
      channel: scheduleForm.channel, recipients: scheduleForm.recipients.trim() };
    api.send(`/report-schedules`, { method: 'POST', body: JSON.stringify(payload) })
      .then(() => { showToast('Schedule created'); setScheduleForm(EMPTY_SCHEDULE_FORM); fetchReportSchedules(selectedReport.id); })
      .catch(e => showToast(e.message || 'Failed to create schedule', 'error'));
  }
  function toggleReportSchedule(s) {
    api.send(`/report-schedules/${s.id}`, { method: 'PUT', body: JSON.stringify({ ...s, active: !s.active }) })
      .then(() => fetchReportSchedules(selectedReport.id))
      .catch(e => showToast(e.message || 'Failed to update schedule', 'error'));
  }
  function deleteReportSchedule(id) {
    api.send(`/report-schedules/${id}`, { method: 'DELETE' })
      .then(() => { showToast('Schedule removed'); fetchReportSchedules(selectedReport.id); })
      .catch(e => showToast(e.message || 'Failed to remove schedule', 'error'));
  }

  // ── report sections (client-side until saveReport persists them) ─────────────
  function addReportSection(type) {
    const base = SECTION_DEFAULTS[type] || SECTION_DEFAULTS.kpi;
    setReportSections(s => [...s, { type, title: base.title, config: base.config }]);
  }
  function updateReportSection(index, section) {
    setReportSections(s => s.map((x, i) => (i === index ? section : x)));
  }
  function moveReportSection(index, delta) {
    setReportSections(s => {
      const j = index + delta;
      if (j < 0 || j >= s.length) return s;
      const next = [...s];
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  }
  function removeReportSection(index) {
    setReportSections(s => s.filter((_, i) => i !== index));
  }

  return {
    reports, setReports,
    reportTemplates, setReportTemplates,
    selectedReport, setSelectedReport,
    reportSections, setReportSections,
    reportEditMode, setReportEditMode,
    scheduleManagerOpen, setScheduleManagerOpen,
    reportSchedules, setReportSchedules,
    scheduleForm, setScheduleForm,
    fetchReports, fetchReportTemplates, openReport,
    createBlankReport, createReportFromTemplate, saveReport, deleteReport,
    openScheduleManager, fetchReportSchedules, createReportSchedule,
    toggleReportSchedule, deleteReportSchedule,
    addReportSection, updateReportSection, moveReportSection, removeReportSection,
  };
}
