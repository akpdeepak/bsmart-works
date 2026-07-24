// useDashboardsState.js — custom dashboards domain state (EPIC-03 Phase 2 / W2, GH-537)
// Extracted from AppShell: the dashboard list, the open dashboard and its widgets, scope
// (PROJECT/TEAM/ORG) with its server-side aggregate, drill-down modal, drag-reorder, and public
// share tokens. Follows the useKnowledgeState / usePmState / useComplianceState shape.
import { useState } from 'react';

/**
 * @param {Object}   api
 * @param {string}   activeWorkspaceId
 * @param {Function} showToast
 * @param {Function} reportError
 * @param {Function} prompt              in-app prompt dialog (lib/dialog.jsx), never window.prompt
 */
export function useDashboardsState(api, activeWorkspaceId, showToast, reportError, prompt) {
  const [customDashboards, setCustomDashboards] = useState([]);
  const [selectedDashboard, setSelectedDashboard] = useState(null); // { ...dashboard, widgets: [] }
  const [dashboardEditMode, setDashboardEditMode] = useState(false);
  const [dragWidgetId, setDragWidgetId] = useState(null);
  const [dashboardDrill, setDashboardDrill] = useState(null); // { title, items } — drill-down modal
  const [dashboardScope, setDashboardScope] = useState('PROJECT'); // PROJECT (loaded set) | TEAM | ORG
  const [dashboardTeamId, setDashboardTeamId] = useState(null);
  const [dashboardAggregate, setDashboardAggregate] = useState(null); // server scope aggregate, or null for PROJECT
  const [teams, setTeams] = useState([]);
  const [shareInfo, setShareInfo] = useState(null); // { id, token } when the share panel is open

  function fetchCustomDashboards() {
    api.raw(`/dashboards`)
      .then(r => r.json()).then(d => setCustomDashboards(Array.isArray(d) ? d : (d?.items || []))).catch(reportError);
  }

  function openDashboard(id) {
    api.raw(`/dashboards/${id}`)
      .then(r => r.json()).then(d => {
        setSelectedDashboard(d); setDashboardEditMode(false); setShareInfo(null);
        setDashboardScope('PROJECT'); setDashboardTeamId(null); setDashboardAggregate(null);
      }).catch(reportError);
  }

  // Teams power the TEAM scope selector on dashboards.
  function fetchTeams() {
    api.raw(`/teams?workspaceId=${activeWorkspaceId}`)
      .then(r => r.json()).then(d => setTeams(Array.isArray(d) ? d : [])).catch(reportError);
  }

  // Fetch the server-side scope aggregate for a dashboard. PROJECT uses the client-loaded
  // work items (aggregate = null); TEAM/ORG aggregate across many projects (iteration 6).
  function fetchDashboardAggregate(scope, teamId) {
    if (scope === 'PROJECT') { setDashboardAggregate(null); return; }
    const qs = scope === 'TEAM'
      ? `scope=TEAM&teamId=${encodeURIComponent(teamId || '')}`
      : `scope=ORG&workspaceId=${activeWorkspaceId}`;
    api.raw(`/insights/work-items?${qs}`)
      .then(r => r.json()).then(d => setDashboardAggregate(d))
      .catch(() => { setDashboardAggregate(null); showToast('Could not load scoped data', 'error'); });
  }

  // Mint (idempotent) / revoke a dashboard's public share token for read-only embedding.
  function mintShare(id) {
    api.send(`/dashboards/${id}/share`, { method: 'POST' })
      .then(d => setShareInfo({ id, token: d.shareToken }))
      .catch(() => showToast('Could not create share link', 'error'));
  }
  function stopShare(id) {
    api.send(`/dashboards/${id}/share`, { method: 'DELETE' })
      .then(() => { setShareInfo(null); showToast('Sharing stopped'); })
      .catch(() => showToast('Could not stop sharing', 'error'));
  }

  async function createDashboard() {
    const name = await prompt({ title: 'New dashboard', label: 'Dashboard name', placeholder: 'e.g. Sprint health', confirmLabel: 'Create' });
    if (!name || !name.trim()) return;
    api.send(`/dashboards`, { method: 'POST', body: JSON.stringify({ name: name.trim(), scope: 'PERSONAL', workspaceId: activeWorkspaceId }) })
      .then(d => { showToast('Dashboard created'); fetchCustomDashboards(); openDashboard(d.id); setDashboardEditMode(true); })
      .catch(() => showToast('Failed to create dashboard', 'error'));
  }

  // Cap J — accept an AI-suggested starter dashboard: create the dashboard, then add its proposed
  // widgets via the existing widget endpoints (INSIGHTS-AI-ALIGNMENT-REVIEW §2.2). The widget set is
  // the deterministic role-based starter set the panel previewed; returns a promise the panel awaits.
  function acceptDashboardSuggestion(suggestion) {
    const widgets = (suggestion && suggestion.widgets) || [];
    return api.send(`/dashboards`, { method: 'POST', body: JSON.stringify({ name: (suggestion && suggestion.name) || 'Suggested dashboard', scope: 'PERSONAL', workspaceId: activeWorkspaceId }) })
      .then(async (d) => {
        for (const w of widgets) {
          const body = { widgetType: w.widgetType, title: w.title, config: JSON.stringify(w.config || {}), gridW: w.gridW || 4, gridH: 2 };
          await api.send(`/dashboards/${d.id}/widgets`, { method: 'POST', body: JSON.stringify(body) });
        }
        fetchCustomDashboards();
        openDashboard(d.id);
        return d;
      });
  }

  function deleteDashboard(id) {
    api.send(`/dashboards/${id}`, { method: 'DELETE' })
      .then(() => { showToast('Dashboard deleted'); setSelectedDashboard(null); fetchCustomDashboards(); })
      .catch(() => showToast('Failed to delete dashboard', 'error'));
  }

  function addDashboardWidget(widgetType, config, title, gridW = 4) {
    if (!selectedDashboard) return;
    const body = { widgetType, title, config: JSON.stringify(config || {}), gridW, gridH: 2 };
    api.send(`/dashboards/${selectedDashboard.id}/widgets`, { method: 'POST', body: JSON.stringify(body) })
      .then(() => openDashboard(selectedDashboard.id))
      .catch(() => showToast('Failed to add widget', 'error'));
  }

  function removeDashboardWidget(widgetId) {
    api.send(`/dashboards/${selectedDashboard.id}/widgets/${widgetId}`, { method: 'DELETE' })
      .then(() => openDashboard(selectedDashboard.id))
      .catch(() => showToast('Failed to remove widget', 'error'));
  }

  function resizeDashboardWidget(widget, gridW) {
    api.send(`/dashboards/${selectedDashboard.id}/widgets/${widget.id}`, {
      method: 'PUT',
      body: JSON.stringify({ ...widget, gridW }),
    })
      .then(() => openDashboard(selectedDashboard.id))
      .catch(() => showToast('Failed to resize widget', 'error'));
  }

  // Persist a widget's config (e.g. a chart's group-by dimension) via the same PUT as resize.
  function updateDashboardWidgetConfig(widget, config) {
    api.send(`/dashboards/${selectedDashboard.id}/widgets/${widget.id}`, {
      method: 'PUT',
      body: JSON.stringify({ ...widget, config: JSON.stringify(config) }),
    })
      .then(() => openDashboard(selectedDashboard.id))
      .catch(() => showToast('Failed to update widget', 'error'));
  }

  // Reorder widgets by dropping one onto another, then persist the new order.
  function reorderDashboardWidgets(targetId) {
    if (!selectedDashboard || dragWidgetId == null || dragWidgetId === targetId) return;
    const ws = [...selectedDashboard.widgets];
    const from = ws.findIndex(w => w.id === dragWidgetId);
    const to = ws.findIndex(w => w.id === targetId);
    if (from < 0 || to < 0) return;
    const [moved] = ws.splice(from, 1);
    ws.splice(to, 0, moved);
    const payload = ws.map((w, i) => ({ id: w.id, gridX: w.gridX, gridY: w.gridY, gridW: w.gridW, gridH: w.gridH, position: i }));
    setSelectedDashboard(d => ({ ...d, widgets: ws })); // optimistic
    setDragWidgetId(null);
    api.send(`/dashboards/${selectedDashboard.id}/layout`, { method: 'PUT', body: JSON.stringify(payload) })
      .then(() => openDashboard(selectedDashboard.id))
      .catch(() => showToast('Failed to save layout', 'error'));
  }

  return {
    customDashboards, setCustomDashboards,
    selectedDashboard, setSelectedDashboard,
    dashboardEditMode, setDashboardEditMode,
    dragWidgetId, setDragWidgetId,
    dashboardDrill, setDashboardDrill,
    dashboardScope, setDashboardScope,
    dashboardTeamId, setDashboardTeamId,
    dashboardAggregate, setDashboardAggregate,
    teams, setTeams,
    shareInfo, setShareInfo,
    fetchCustomDashboards, openDashboard, fetchTeams, fetchDashboardAggregate,
    mintShare, stopShare, createDashboard, acceptDashboardSuggestion, deleteDashboard,
    addDashboardWidget, removeDashboardWidget, resizeDashboardWidget,
    updateDashboardWidgetConfig, reorderDashboardWidgets,
  };
}
