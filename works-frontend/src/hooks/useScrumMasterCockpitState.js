// useScrumMasterCockpitState.js — Scrum Master Cockpit domain state (Cap V, GH-537)
// Extracted from AppShell as part of the EPIC-03 Phase 2 / W2 feature-state decomposition.
// Owns: impediments, standups, retrospectives, ceremonies, capacity/planning, risk, variance,
// review prep, pattern detection, coach tips, the executive digest and My Day. The AI-backed
// panels here route through the control plane and degrade to their deterministic result (RB-40 §2).
import { useState, useEffect } from 'react';

const EMPTY_IMPEDIMENT = { title: '', raiseType: 'IMPEDIMENT', severity: 'MEDIUM', category: '', description: '' };
const EMPTY_STANDUP_DRAFT = { yesterday: '', today: '', blockers: '' };
const EMPTY_RETRO = { title: '', template: 'START_STOP_CONTINUE', anonymous: false };
const EMPTY_CEREMONY = { ceremonyType: 'STANDUP', scheduledAt: '' };

/**
 * @param {Object}   api
 * @param {string}   activeWorkspaceId
 * @param {Function} showToast
 * @param {Function} reportError
 * @param {Object}   shell  { view, setView, projects, users, workspaceMembers, fetchSprints, i15ProjectId, setI15ProjectId }
 */
export function useScrumMasterCockpitState(api, activeWorkspaceId, showToast, reportError, shell) {
  const { view, setView, projects, users, workspaceMembers, fetchSprints, i15ProjectId, setI15ProjectId } = shell;

  const [smTab, setSmTab]                       = useState('impediments'); // impediments | standup | risk | planning | retro | review | patterns
  const [impediments, setImpediments]           = useState([]);
  const [newImpediment, setNewImpediment]       = useState(EMPTY_IMPEDIMENT);
  const [standups, setStandups]                 = useState([]);
  const [activeStandup, setActiveStandup]       = useState(null); // { session, entries }
  const [standupDraft, setStandupDraft]         = useState(EMPTY_STANDUP_DRAFT);
  const [retros, setRetros]                     = useState([]);
  const [activeRetro, setActiveRetro]           = useState(null); // { session, notes }
  const [newRetro, setNewRetro]                 = useState(EMPTY_RETRO);
  const [retroNoteDraft, setRetroNoteDraft]     = useState({});   // columnKey -> text
  const [riskPanel, setRiskPanel]               = useState(null);
  const [planningResult, setPlanningResult]     = useState(null);
  const [planningTimeOff, setPlanningTimeOff]   = useState(0);
  const [capacityBoard, setCapacityBoard]       = useState(null); // { members, teamCapacityPoints, ... } Capacity tab
  const [reviewSprintId, setReviewSprintId]     = useState('');
  const [reviewResult, setReviewResult]         = useState(null);
  const [patternsResult, setPatternsResult]     = useState(null);
  const [riskSprintId, setRiskSprintId]         = useState('');
  const [varianceSprintId, setVarianceSprintId] = useState('');
  const [varianceResult, setVarianceResult]     = useState(null);
  const [cockpitContext, setCockpitContext]     = useState(null); // { roleKey, tier, canManageSprints, canCreateItems, activeSprint, liveCeremony }
  const [cockpitLoading, setCockpitLoading]     = useState({});   // tab key -> bool, drives loading skeletons
  const [coachTips, setCoachTips]               = useState(null); // { roleKey, tips, narrative, meta }
  const [digest, setDigest]                     = useState(null); // { sprint, rag, deliveryRate, ... } executive Health lens
  const [retroClusters, setRetroClusters]       = useState(null); // { retroId, themes, narrative, meta }
  const [ceremonies, setCeremonies]             = useState([]);   // [{ session, counts }]
  const [activeCeremony, setActiveCeremony]     = useState(null); // { session, attendance, counts }
  const [newCeremony, setNewCeremony]           = useState(EMPTY_CEREMONY);
  const [myDay, setMyDay]                       = useState(null); // { myItems, myImpediments, myActions, todayStandup, myStandupEntry }
  // Clear per-sprint analysis so the active-sprint auto-load re-fires for the new project
  // (stale results would otherwise suppress the reload).
  function resetCockpitAnalysis() {
    setRiskPanel(null); setVarianceResult(null); setReviewResult(null);
    setPatternsResult(null); setPlanningResult(null); setCapacityBoard(null);
    setRiskSprintId(''); setVarianceSprintId(''); setReviewSprintId('');
  }
  function openCockpit() {
    setView('smcockpit');
    const pid = i15ProjectId || (projects[0] && projects[0].id) || '';
    setI15ProjectId(pid);
    resetCockpitAnalysis();
    if (pid) { fetchCockpitContext(pid); fetchCoachTips(pid); fetchDigest(pid); fetchCeremonies(pid); fetchMyDay(pid); fetchImpediments(pid); fetchStandups(pid); fetchRetros(pid); fetchSprints(pid); }
  }
  function fetchCoachTips(pid) {
    setCoachTips(null);
    api.send(`/cockpit/pro-tips?workspaceId=${activeWorkspaceId}`, { method: 'POST', body: JSON.stringify({ projectId: pid }) })
      .then(d => setCoachTips(d && Array.isArray(d.tips) ? d : null)).catch(() => setCoachTips(null));
  }
  function fetchDigest(pid) {
    setDigest(null);
    api.send(`/cockpit/digest?workspaceId=${activeWorkspaceId}&projectId=${pid}`)
      .then(d => setDigest(d && d.rag ? d : null)).catch(() => setDigest(null));
  }

  useEffect(() => {
    if (view !== 'smcockpit' || projects.length === 0) return;
    const projectIds = new Set(projects.map(p => p.id));
    const pid = projectIds.has(i15ProjectId) ? i15ProjectId : projects[0].id;
    if (pid !== i15ProjectId) {
      queueMicrotask(() => setI15ProjectId(pid));
    }
    if (!pid) return;
    fetchCockpitContext(pid);
    fetchCoachTips(pid);
    fetchDigest(pid);
    fetchCeremonies(pid);
    fetchMyDay(pid);
    fetchImpediments(pid);
    fetchStandups(pid);
    fetchRetros(pid);
    fetchSprints(pid);
  }, [view, projects, i15ProjectId, activeWorkspaceId]);

  function clusterRetro() {
    if (!activeRetro?.session?.id) return;
    api.send(`/cockpit/retro-cluster?workspaceId=${activeWorkspaceId}`, { method: 'POST', body: JSON.stringify({ retroId: activeRetro.session.id }) })
      .then(d => { setRetroClusters(d && Array.isArray(d.themes) ? d : null); if (d?.meta?.fallback) showToast('Retro clustering used fallback (keyword themes).', 'info'); })
      .catch(() => showToast('Retro clustering failed', 'error'));
  }
  function fetchMyDay(pid) {
    api.send(`/cockpit/my-day?projectId=${pid}`)
      .then(d => setMyDay(d && typeof d === 'object' ? d : null)).catch(() => setMyDay(null));
  }
  function submitMyStandup() {
    const sid = myDay?.todayStandup?.id;
    const eid = myDay?.myStandupEntry?.id;
    if (!sid || !eid) return;
    api.send(`/standups/${sid}/entries/${eid}/record`, { method: 'POST', body: JSON.stringify(standupDraft) })
      .then(() => { setStandupDraft({ yesterday: '', today: '', blockers: '' }); fetchMyDay(i15ProjectId); showToast('Standup update recorded'); })
      .catch(() => showToast('Failed to record your update', 'error'));
  }
  function fetchCockpitContext(pid) {
    api.send(`/cockpit/context?projectId=${pid}`)
      .then(d => setCockpitContext(d && d.roleKey ? d : null)).catch(() => setCockpitContext(null));
  }
  function fetchCeremonies(pid) {
    api.send(`/ceremonies?projectId=${pid}`)
      .then(d => setCeremonies(Array.isArray(d) ? d : [])).catch(() => setCeremonies([]));
  }
  function scheduleCeremony() {
    const memberIds = (workspaceMembers.length ? workspaceMembers : users).map(m => m.id).filter(Boolean);
    const scheduledAt = newCeremony.scheduledAt ? new Date(newCeremony.scheduledAt).toISOString() : null;
    api.send(`/ceremonies`, { method: 'POST', body: JSON.stringify({ projectId: i15ProjectId, ceremonyType: newCeremony.ceremonyType, scheduledAt, sprintId: cockpitContext?.activeSprint?.id || null, memberIds }) })
      .then(d => { setActiveCeremony(d); setNewCeremony({ ceremonyType: 'STANDUP', scheduledAt: '' }); fetchCeremonies(i15ProjectId); showToast('Ceremony scheduled'); })
      .catch(() => showToast('Failed to schedule ceremony', 'error'));
  }
  function openCeremony(id) {
    api.send(`/ceremonies/${id}`).then(d => setActiveCeremony(d)).catch(reportError);
  }
  function startCeremony(id) {
    api.send(`/ceremonies/${id}/start`, { method: 'POST' })
      .then(d => { setActiveCeremony(d); fetchCeremonies(i15ProjectId); fetchCockpitContext(i15ProjectId); showToast('Ceremony is live'); })
      .catch(() => showToast('Failed to start ceremony', 'error'));
  }
  function joinCeremony(id) {
    api.send(`/ceremonies/${id}/join`, { method: 'POST' })
      .then(d => { setActiveCeremony(d); fetchCeremonies(i15ProjectId); showToast('You joined the ceremony'); })
      .catch(() => showToast('Failed to join — is the ceremony live?', 'error'));
  }
  function excuseCeremony(id, userId) {
    api.send(`/ceremonies/${id}/excuse`, { method: 'POST', body: JSON.stringify({ userId }) })
      .then(d => setActiveCeremony(d)).catch(() => showToast('Failed to excuse member', 'error'));
  }
  function completeCeremony(id) {
    api.send(`/ceremonies/${id}/complete`, { method: 'POST' })
      .then(d => { setActiveCeremony(d); fetchCeremonies(i15ProjectId); fetchCockpitContext(i15ProjectId); showToast('Ceremony complete — absentees recorded'); })
      .catch(() => showToast('Failed to complete ceremony', 'error'));
  }
  function fetchImpediments(pid) {
    api.send(`/impediments?projectId=${pid}`)
      .then(d => setImpediments(Array.isArray(d) ? d : [])).catch(() => setImpediments([]));
  }
  function createImpediment() {
    if (!newImpediment.title.trim()) { showToast('Title is required', 'error'); return; }
    api.send(`/impediments`, { method: 'POST', body: JSON.stringify({ ...newImpediment, projectId: i15ProjectId }) })
      .then(() => { showToast('Raised'); setNewImpediment({ title: '', raiseType: 'IMPEDIMENT', severity: 'MEDIUM', category: '', description: '' }); fetchImpediments(i15ProjectId); })
      .catch(() => showToast('Failed to raise impediment', 'error'));
  }
  function updateImpediment(imp, patch) {
    api.send(`/impediments/${imp.id}`, { method: 'PUT', body: JSON.stringify({ ...imp, ...patch }) })
      .then(() => fetchImpediments(i15ProjectId)).catch(() => showToast('Failed to update', 'error'));
  }
  function fetchStandups(pid) {
    api.send(`/standups?projectId=${pid}`)
      .then(d => setStandups(Array.isArray(d) ? d : [])).catch(() => setStandups([]));
  }
  function startStandup() {
    const memberIds = (workspaceMembers.length ? workspaceMembers : users).map(m => m.id).filter(Boolean);
    api.send(`/standups?`, { method: 'POST', body: JSON.stringify({ projectId: i15ProjectId, memberIds }) })
      .then(d => { setActiveStandup(d); fetchStandups(i15ProjectId); showToast('Standup started'); })
      .catch(() => showToast('Failed to start standup', 'error'));
  }
  function openStandup(id) {
    api.send(`/standups/${id}`).then(d => setActiveStandup(d)).catch(reportError);
  }
  function recordStandup(entryId) {
    api.send(`/standups/${activeStandup.session.id}/entries/${entryId}/record`, { method: 'POST', body: JSON.stringify(standupDraft) })
      .then(() => { setStandupDraft({ yesterday: '', today: '', blockers: '' }); openStandup(activeStandup.session.id); })
      .catch(() => showToast('Failed to record', 'error'));
  }
  function advanceStandup() {
    api.send(`/standups/${activeStandup.session.id}/advance`, { method: 'POST' })
      .then(() => openStandup(activeStandup.session.id)).catch(reportError);
  }
  function completeStandup() {
    api.send(`/standups/${activeStandup.session.id}/complete`, { method: 'POST' })
      .then(d => { setActiveStandup(d); fetchStandups(i15ProjectId); showToast('Standup complete'); }).catch(reportError);
  }
  function fetchRetros(pid) {
    api.send(`/retros?projectId=${pid}`)
      .then(d => setRetros(Array.isArray(d) ? d : [])).catch(() => setRetros([]));
  }
  function createRetro() {
    if (!newRetro.title.trim()) { showToast('Title is required', 'error'); return; }
    api.send(`/retros`, { method: 'POST', body: JSON.stringify({ ...newRetro, projectId: i15ProjectId }) })
      .then(() => { showToast('Retro created'); setNewRetro({ title: '', template: 'START_STOP_CONTINUE', anonymous: false }); fetchRetros(i15ProjectId); })
      .catch(() => showToast('Failed to create retro', 'error'));
  }
  function openRetro(id) {
    setRetroClusters(null);
    api.send(`/retros/${id}`).then(d => setActiveRetro(d)).catch(reportError);
  }
  function addRetroNote(columnKey) {
    const content = (retroNoteDraft[columnKey] || '').trim();
    if (!content) return;
    api.send(`/retros/${activeRetro.session.id}/notes`, { method: 'POST', body: JSON.stringify({ columnKey, content }) })
      .then(() => { setRetroNoteDraft({ ...retroNoteDraft, [columnKey]: '' }); openRetro(activeRetro.session.id); })
      .catch(() => showToast('Failed to add note', 'error'));
  }
  function voteRetroNote(noteId) {
    api.send(`/retros/notes/${noteId}/vote`, { method: 'POST' }).then(() => openRetro(activeRetro.session.id)).catch(reportError);
  }
  function convertRetroNote(noteId) {
    api.send(`/retros/notes/${noteId}/convert`, { method: 'POST', body: JSON.stringify({}) })
      .then(() => { showToast('Action item created'); openRetro(activeRetro.session.id); }).catch(() => showToast('Failed', 'error'));
  }
  function setTabLoading(tab, on) { setCockpitLoading(l => ({ ...l, [tab]: on })); }
  function runSprintPlanning() {
    setTabLoading('planning', true);
    api.send(`/cockpit/sprint-planning?workspaceId=${activeWorkspaceId}`, { method: 'POST', body: JSON.stringify({ projectId: i15ProjectId, timeOffPoints: Number(planningTimeOff) || 0 }) })
      .then(d => setPlanningResult(d)).catch(() => showToast('Planning helper failed', 'error'))
      .finally(() => setTabLoading('planning', false));
  }
  function fetchCapacity(sprintId) {
    if (!sprintId) return;
    setTabLoading('capacity', true);
    api.send(`/cockpit/capacity?workspaceId=${activeWorkspaceId}&sprintId=${sprintId}`)
      .then(d => setCapacityBoard(d && Array.isArray(d.members) ? d : null)).catch(() => showToast('Capacity board failed', 'error'))
      .finally(() => setTabLoading('capacity', false));
  }
  function saveMemberCapacity(sprintId, userId, { workingDays, timeOffDays, focusFactor }) {
    if (!sprintId) return;
    setTabLoading('capacity', true);
    api.send(`/cockpit/capacity?workspaceId=${activeWorkspaceId}`, { method: 'PUT', body: JSON.stringify({ sprintId, userId, workingDays, timeOffDays, focusFactor }) })
      .then(d => setCapacityBoard(d && Array.isArray(d.members) ? d : null)).catch(() => showToast('Capacity update failed', 'error'))
      .finally(() => setTabLoading('capacity', false));
  }
  function runRiskPanel(sprintId = riskSprintId) {
    if (!sprintId) { showToast('Select a sprint', 'error'); return; }
    setRiskSprintId(sprintId);
    setTabLoading('risk', true);
    api.send(`/cockpit/risk-panel?workspaceId=${activeWorkspaceId}&sprintId=${sprintId}`)
      .then(d => setRiskPanel(d)).catch(() => showToast('Risk panel failed', 'error'))
      .finally(() => setTabLoading('risk', false));
  }
  function runVariance(sprintId = varianceSprintId) {
    if (!sprintId) { showToast('Select a sprint', 'error'); return; }
    setVarianceSprintId(sprintId);
    setTabLoading('variance', true);
    api.send(`/cockpit/variance?workspaceId=${activeWorkspaceId}&sprintId=${sprintId}`)
      .then(d => setVarianceResult(d)).catch(() => showToast('Variance analysis failed', 'error'))
      .finally(() => setTabLoading('variance', false));
  }
  function runReviewPrep(sprintId = reviewSprintId) {
    if (!sprintId) { showToast('Select a sprint', 'error'); return; }
    setReviewSprintId(sprintId);
    setTabLoading('review', true);
    api.send(`/cockpit/review-prep?workspaceId=${activeWorkspaceId}`, { method: 'POST', body: JSON.stringify({ sprintId }) })
      .then(d => setReviewResult(d)).catch(() => showToast('Review prep failed', 'error'))
      .finally(() => setTabLoading('review', false));
  }
  function runPatterns() {
    setTabLoading('patterns', true);
    api.send(`/cockpit/patterns?workspaceId=${activeWorkspaceId}`, { method: 'POST', body: JSON.stringify({ projectId: i15ProjectId }) })
      .then(d => setPatternsResult(d)).catch(() => showToast('Pattern detection failed', 'error'))
      .finally(() => setTabLoading('patterns', false));
  }

  return {
    smTab, setSmTab,
    impediments, newImpediment, setNewImpediment,
    standups, activeStandup, setActiveStandup, standupDraft, setStandupDraft,
    retros, activeRetro, setActiveRetro, newRetro, setNewRetro,
    retroNoteDraft, setRetroNoteDraft, retroClusters,
    riskPanel, riskSprintId, setRiskSprintId,
    planningResult, planningTimeOff, setPlanningTimeOff, capacityBoard,
    reviewSprintId, setReviewSprintId, reviewResult,
    patternsResult, varianceSprintId, setVarianceSprintId, varianceResult,
    cockpitContext, cockpitLoading, coachTips, digest,
    ceremonies, activeCeremony, setActiveCeremony, newCeremony, setNewCeremony,
    myDay,
    resetCockpitAnalysis, openCockpit, fetchCoachTips, fetchDigest, clusterRetro,
    fetchMyDay, submitMyStandup, fetchCockpitContext,
    fetchCeremonies, scheduleCeremony, openCeremony, startCeremony, joinCeremony,
    excuseCeremony, completeCeremony,
    fetchImpediments, createImpediment, updateImpediment,
    fetchStandups, startStandup, openStandup, recordStandup, advanceStandup, completeStandup,
    fetchRetros, createRetro, openRetro, addRetroNote, voteRetroNote, convertRetroNote,
    runSprintPlanning, fetchCapacity, saveMemberCapacity,
    runRiskPanel, runVariance, runReviewPrep, runPatterns,
  };
}
