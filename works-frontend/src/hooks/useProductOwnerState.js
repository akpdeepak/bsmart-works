// useProductOwnerState.js — Product Owner Workspace domain state (Cap W, GH-537)
// Extracted from AppShell as part of the EPIC-03 Phase 2 / W2 feature-state decomposition.
// Owns: roadmap themes, the idea funnel, customer feedback and its clustering, OKRs
// (objectives + key results), and AI-drafted release notes. The AI-backed surfaces route through
// the control plane and fall back to their deterministic result (RB-40 §2).
import { useState } from 'react';

const EMPTY_THEME = { name: '', status: 'PLANNED', quarter: '', description: '' };
const EMPTY_IDEA = { title: '', description: '' };
const EMPTY_FEEDBACK = { customer: '', source: 'PORTAL', content: '' };
const EMPTY_OBJECTIVE = { title: '', level: 'TEAM', quarter: '' };
const EMPTY_KR = { title: '', metricType: 'PERCENT', startValue: 0, targetValue: 100, currentValue: 0 };

/**
 * @param {Object}   api
 * @param {string}   activeWorkspaceId
 * @param {Function} showToast
 * @param {Function} reportError
 * @param {Object}   shell  { setView, projects, i15ProjectId, setI15ProjectId }
 */
export function useProductOwnerState(api, activeWorkspaceId, showToast, reportError, shell) {
  const { setView, projects, i15ProjectId, setI15ProjectId } = shell;

  const [poTab, setPoTab]                       = useState('roadmap');     // roadmap | ideas | feedback | okr | releasenotes | stakeholders
  const [roadmapThemes, setRoadmapThemes]       = useState([]);
  const [newTheme, setNewTheme]                 = useState(EMPTY_THEME);
  const [ideas, setIdeas]                       = useState([]);
  const [newIdea, setNewIdea]                   = useState(EMPTY_IDEA);
  const [feedbackItems, setFeedbackItems]       = useState([]);
  const [newFeedback, setNewFeedback]           = useState(EMPTY_FEEDBACK);
  const [feedbackClusters, setFeedbackClusters] = useState(null);
  const [objectives, setObjectives]             = useState([]);
  const [activeObjective, setActiveObjective]   = useState(null); // { objective, keyResults, progressPercent }
  const [newObjective, setNewObjective]         = useState(EMPTY_OBJECTIVE);
  const [newKr, setNewKr]                       = useState(EMPTY_KR);
  const [releaseNotesResult, setReleaseNotesResult] = useState(null);
  const [releaseNotesName, setReleaseNotesName] = useState('');
  function openPoWorkspace() {
    setView('poworkspace');
    const pid = i15ProjectId || (projects[0] && projects[0].id) || '';
    setI15ProjectId(pid);
    fetchRoadmapThemes(); fetchIdeas(); fetchFeedback(); fetchObjectives();
  }
  function fetchRoadmapThemes() {
    api.send(`/roadmap-themes?workspaceId=${activeWorkspaceId}`)
      .then(d => setRoadmapThemes(Array.isArray(d) ? d : [])).catch(() => setRoadmapThemes([]));
  }
  function createTheme() {
    if (!newTheme.name.trim()) { showToast('Name is required', 'error'); return; }
    api.send(`/roadmap-themes`, { method: 'POST', body: JSON.stringify({ ...newTheme, workspaceId: activeWorkspaceId, projectId: i15ProjectId || null }) })
      .then(() => { showToast('Theme added'); setNewTheme({ name: '', status: 'PLANNED', quarter: '', description: '' }); fetchRoadmapThemes(); })
      .catch(() => showToast('Failed to add theme', 'error'));
  }
  function updateThemeStatus(theme, status) {
    api.send(`/roadmap-themes/${theme.id}`, { method: 'PUT', body: JSON.stringify({ ...theme, status }) })
      .then(() => fetchRoadmapThemes()).catch(() => showToast('Failed to update', 'error'));
  }
  function deleteTheme(id) {
    api.send(`/roadmap-themes/${id}`, { method: 'DELETE' })
      .then(() => { showToast('Theme deleted'); fetchRoadmapThemes(); })
      .catch(() => showToast('Failed to delete theme', 'error'));
  }
  function fetchIdeas() {
    api.send(`/ideas?workspaceId=${activeWorkspaceId}`)
      .then(d => setIdeas(Array.isArray(d) ? d : [])).catch(() => setIdeas([]));
  }
  function createIdea() {
    if (!newIdea.title.trim()) { showToast('Title is required', 'error'); return; }
    api.send(`/ideas`, { method: 'POST', body: JSON.stringify({ ...newIdea, workspaceId: activeWorkspaceId, projectId: i15ProjectId || null }) })
      .then(() => { showToast('Idea captured'); setNewIdea({ title: '', description: '' }); fetchIdeas(); })
      .catch(() => showToast('Failed to capture idea', 'error'));
  }
  function voteIdea(id) {
    api.send(`/ideas/${id}/vote`, { method: 'POST' }).then(() => fetchIdeas()).catch(reportError);
  }
  function promoteIdea(id) {
    api.send(`/ideas/${id}/promote`, { method: 'POST', body: JSON.stringify({}) })
      .then(() => { showToast('Promoted to story'); fetchIdeas(); }).catch(() => showToast('Failed', 'error'));
  }
  function fetchFeedback() {
    api.send(`/customer-feedback?workspaceId=${activeWorkspaceId}`)
      .then(d => setFeedbackItems(Array.isArray(d) ? d : [])).catch(() => setFeedbackItems([]));
  }
  function createFeedback() {
    if (!newFeedback.content.trim()) { showToast('Content is required', 'error'); return; }
    api.send(`/customer-feedback`, { method: 'POST', body: JSON.stringify({ ...newFeedback, workspaceId: activeWorkspaceId }) })
      .then(() => { showToast('Feedback logged'); setNewFeedback({ customer: '', source: 'PORTAL', content: '' }); fetchFeedback(); })
      .catch(() => showToast('Failed to log feedback', 'error'));
  }
  function clusterFeedback() {
    api.send(`/po/feedback-cluster?workspaceId=${activeWorkspaceId}`, { method: 'POST', body: JSON.stringify({}) })
      .then(d => setFeedbackClusters(d)).catch(() => showToast('Clustering failed', 'error'));
  }
  function fetchObjectives() {
    api.send(`/objectives?workspaceId=${activeWorkspaceId}`)
      .then(d => setObjectives(Array.isArray(d) ? d : [])).catch(() => setObjectives([]));
  }
  function createObjective() {
    if (!newObjective.title.trim()) { showToast('Title is required', 'error'); return; }
    api.send(`/objectives`, { method: 'POST', body: JSON.stringify({ ...newObjective, workspaceId: activeWorkspaceId, projectId: i15ProjectId || null }) })
      .then(() => { showToast('Objective created'); setNewObjective({ title: '', level: 'TEAM', quarter: '' }); fetchObjectives(); })
      .catch(() => showToast('Failed to create objective', 'error'));
  }
  function openObjective(id) {
    api.send(`/objectives/${id}`).then(d => setActiveObjective(d)).catch(reportError);
  }
  function addKeyResult() {
    if (!newKr.title.trim() || !activeObjective) { showToast('Key result title required', 'error'); return; }
    api.send(`/objectives/${activeObjective.objective.id}/key-results`, { method: 'POST', body: JSON.stringify(newKr) })
      .then(() => { setNewKr({ title: '', metricType: 'PERCENT', startValue: 0, targetValue: 100, currentValue: 0 }); openObjective(activeObjective.objective.id); })
      .catch(() => showToast('Failed to add key result', 'error'));
  }
  function updateKrProgress(kr, currentValue) {
    api.send(`/objectives/key-results/${kr.id}`, { method: 'PUT', body: JSON.stringify({ ...kr, currentValue: Number(currentValue) }) })
      .then(() => openObjective(activeObjective.objective.id)).catch(reportError);
  }
  function runReleaseNotes() {
    api.send(`/po/release-notes?workspaceId=${activeWorkspaceId}`, { method: 'POST', body: JSON.stringify({ projectId: i15ProjectId, releaseName: releaseNotesName || 'Release notes' }) })
      .then(d => setReleaseNotesResult(d)).catch(() => showToast('Draft failed', 'error'));
  }

  return {
    poTab, setPoTab,
    roadmapThemes, newTheme, setNewTheme,
    ideas, newIdea, setNewIdea,
    feedbackItems, newFeedback, setNewFeedback, feedbackClusters,
    objectives, activeObjective, setActiveObjective, newObjective, setNewObjective, newKr, setNewKr,
    releaseNotesResult, releaseNotesName, setReleaseNotesName,
    openPoWorkspace,
    fetchRoadmapThemes, createTheme, updateThemeStatus, deleteTheme,
    fetchIdeas, createIdea, voteIdea, promoteIdea,
    fetchFeedback, createFeedback, clusterFeedback,
    fetchObjectives, createObjective, openObjective, addKeyResult, updateKrProgress,
    runReleaseNotes,
  };
}
