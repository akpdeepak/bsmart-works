// usePmState.js — PM Artifacts domain state (TD-003 Phase 4)
// Extracted from AppShell: RAID dashboard, risks, assumptions, issues,
// dependencies, decisions, meetings, action items, stakeholders, lessons.
import { useState } from 'react';

/**
 * @param {Object}   api
 * @param {string}   activeWorkspaceId
 * @param {Function} showToast
 * @param {Function} reportError
 */
export function usePmState(api, activeWorkspaceId, showToast, reportError) {
  const [pmProjectId, setPmProjectId]       = useState('');
  const [pmTab, setPmTab]                   = useState('raid');
  const [risks, setRisks]                   = useState([]);
  const [assumptions, setAssumptions]       = useState([]);
  const [pmIssues, setPmIssues]             = useState([]);
  const [dependencies, setDependencies]     = useState([]);
  const [decisions, setDecisions]           = useState([]);
  const [meetings, setMeetings]             = useState([]);
  const [actionItems, setActionItems]       = useState([]);
  const [stakeholders, setStakeholders]     = useState([]);
  const [lessonsLearned, setLessonsLearned] = useState([]);
  const [raidDashboard, setRaidDashboard]   = useState(null);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [meetingNotes, setMeetingNotes]     = useState({});
  const [pmForm, setPmForm]                 = useState({});
  const [pmFormOpen, setPmFormOpen]         = useState(null);

  function fetchRaidDashboard(pid) {
    if (!pid) return;
    api.send(`/raid-dashboard?projectId=${pid}`).then(setRaidDashboard).catch(reportError);
  }
  function fetchRisks(pid)        { api.send(`/risks?projectId=${pid}`).then(d => setRisks(Array.isArray(d) ? d : [])).catch(reportError); }
  function fetchAssumptions(pid)  { api.send(`/assumptions?projectId=${pid}`).then(d => setAssumptions(Array.isArray(d) ? d : [])).catch(reportError); }
  function fetchPmIssues(pid)     { api.send(`/pm-issues?projectId=${pid}`).then(d => setPmIssues(Array.isArray(d) ? d : [])).catch(reportError); }
  function fetchDependencies(pid) { api.send(`/dependencies?projectId=${pid}`).then(d => setDependencies(Array.isArray(d) ? d : [])).catch(reportError); }
  function fetchDecisions(pid)    { api.send(`/decisions?projectId=${pid}`).then(d => setDecisions(Array.isArray(d) ? d : [])).catch(reportError); }
  function fetchMeetings(pid)     { api.send(`/meetings?projectId=${pid}`).then(d => setMeetings(Array.isArray(d) ? d : [])).catch(reportError); }
  function fetchActionItems(pid)  { api.send(`/action-items?projectId=${pid}`).then(d => setActionItems(Array.isArray(d) ? d : [])).catch(reportError); }
  function fetchStakeholders(pid) { api.send(`/stakeholders?projectId=${pid}`).then(d => setStakeholders(Array.isArray(d) ? d : [])).catch(reportError); }
  function fetchLessons(pid)      { api.send(`/lessons-learned?projectId=${pid}`).then(d => setLessonsLearned(Array.isArray(d) ? d : [])).catch(reportError); }

  function pmCreate(type, payload) {
    const endpoints = {
      risk: 'risks', assumption: 'assumptions', issue: 'pm-issues', dependency: 'dependencies',
      decision: 'decisions', meeting: 'meetings', action: 'action-items', stakeholder: 'stakeholders', lesson: 'lessons-learned'
    };
    const ep = endpoints[type];
    if (!ep) return;
    if (!pmProjectId) { showToast('Select a team before adding an artifact', 'error'); return; }
    if (!payload.title || !payload.title.trim()) { showToast('Title is required', 'error'); return; }
    const body = type === 'stakeholder'
      ? { ...payload, name: payload.name || payload.title, notes: payload.notes || payload.description }
      : payload;
    api.send(`/${ep}`, { method: 'POST', body: JSON.stringify({ ...body, projectId: pmProjectId, workspaceId: activeWorkspaceId }) })
      .then(() => {
        setPmFormOpen(null); setPmForm({});
        if (type === 'risk')        { fetchRisks(pmProjectId); fetchRaidDashboard(pmProjectId); }
        if (type === 'assumption')  { fetchAssumptions(pmProjectId); fetchRaidDashboard(pmProjectId); }
        if (type === 'issue')       { fetchPmIssues(pmProjectId); fetchRaidDashboard(pmProjectId); }
        if (type === 'dependency')  { fetchDependencies(pmProjectId); fetchRaidDashboard(pmProjectId); }
        if (type === 'decision')    fetchDecisions(pmProjectId);
        if (type === 'meeting')     fetchMeetings(pmProjectId);
        if (type === 'action')      fetchActionItems(pmProjectId);
        if (type === 'stakeholder') fetchStakeholders(pmProjectId);
        if (type === 'lesson')      fetchLessons(pmProjectId);
        showToast('Created successfully');
      }).catch(err => showToast(err.message, 'error'));
  }

  function pmDelete(type, id) {
    const endpoints = {
      risk: 'risks', assumption: 'assumptions', issue: 'pm-issues', dependency: 'dependencies',
      decision: 'decisions', meeting: 'meetings', action: 'action-items', stakeholder: 'stakeholders', lesson: 'lessons-learned'
    };
    const ep = endpoints[type];
    if (!ep) return;
    api.send(`/${ep}/${id}`, { method: 'DELETE' }).then(() => {
      if (type === 'risk')        { fetchRisks(pmProjectId); fetchRaidDashboard(pmProjectId); }
      if (type === 'assumption')  { fetchAssumptions(pmProjectId); fetchRaidDashboard(pmProjectId); }
      if (type === 'issue')       { fetchPmIssues(pmProjectId); fetchRaidDashboard(pmProjectId); }
      if (type === 'dependency')  { fetchDependencies(pmProjectId); fetchRaidDashboard(pmProjectId); }
      if (type === 'decision')    fetchDecisions(pmProjectId);
      if (type === 'meeting')     fetchMeetings(pmProjectId);
      if (type === 'action')      fetchActionItems(pmProjectId);
      if (type === 'stakeholder') fetchStakeholders(pmProjectId);
      if (type === 'lesson')      fetchLessons(pmProjectId);
      showToast('Deleted');
    }).catch(() => showToast('Delete failed', 'error'));
  }

  function fetchAllPmData(pid) {
    setPmProjectId(pid);
    fetchRaidDashboard(pid);
    fetchRisks(pid);
    fetchAssumptions(pid);
    fetchPmIssues(pid);
    fetchDependencies(pid);
    fetchDecisions(pid);
    fetchMeetings(pid);
    fetchActionItems(pid);
    fetchStakeholders(pid);
    fetchLessons(pid);
  }

  return {
    pmProjectId, setPmProjectId,
    pmTab, setPmTab,
    risks, assumptions, pmIssues, dependencies, decisions, meetings, actionItems, stakeholders, lessonsLearned,
    raidDashboard,
    selectedMeeting, setSelectedMeeting,
    meetingNotes, setMeetingNotes,
    pmForm, setPmForm,
    pmFormOpen, setPmFormOpen,
    fetchRaidDashboard, fetchRisks, fetchAssumptions, fetchPmIssues,
    fetchDependencies, fetchDecisions, fetchMeetings, fetchActionItems,
    fetchStakeholders, fetchLessons,
    pmCreate, pmDelete,
    fetchAllPmData,
  };
}
