import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Activity, Bell, BellRing, Check, ChevronDown, Code, Eye, Keyboard,
  ListTodo, PanelLeft, Search, Settings, User, X,
} from 'lucide-react';
import { Button } from '@/components/works/button';
import { UserMenu } from '@/components/works/organisms/user-menu';
import { ModeRail } from '@/components/works/organisms/mode-rail';
import { SubRail } from '@/components/works/organisms/sub-rail';
import { MoreMenu } from '@/components/works/organisms/more-menu';
import { ShellBreadcrumbs } from '@/components/works/organisms/shell-breadcrumbs';
import { LENSES, TIER, modeForView, getMode, labelForView, allowed, navDestinations, primarySurfacesFor, roleLandingForMode } from '@/lib/nav-model';
import { AiCommandBar } from '@/components/works/organisms/ai-command-bar';
import { WorkItemDetailPanel } from '@/components/works/organisms/work-item-detail-panel';
import { Modal } from '@/components/works/molecules/modal';
import { Toast } from '@/components/works/atoms/toast';
import { ToastStack } from '@/components/works/atoms/toast-stack';
import { CommandPalette } from '@/components/works/organisms/command-palette';
import { OfflineBanner } from '@/components/works/organisms/offline-banner';
import { PresenceBar } from '@/components/works/organisms/presence-bar';
import { ShortcutsHelp } from '@/components/works/organisms/shortcuts-help';
import { ConflictResolver } from '@/components/works/organisms/conflict-resolver';
import { StatusPage } from '@/components/works/organisms/status-page';
import { PushSettingsPanel } from '@/components/works/organisms/push-settings-panel';
import { queueDraft, removeDraft, pendingDrafts, syncDrafts } from '@/lib/offline';
import { viewToPath, pathToView, parseEntityRoute } from '@/lib/routes';
import { Logo } from '@/components/works/logo';
import { api } from '@/lib/apiClient';
import { useDialog } from '@/lib/dialog';
import { reportError, setToastEmitter } from '@/lib/report-error';
import { layoutToWidgets } from '@/lib/today-layouts';
import { useCardPrefs } from '@/hooks/useCardPrefs';
import { useDensity } from '@/hooks/use-density';
import { buildStatusResolver } from '@/lib/status-config';
import { EMPTY_FILTERS, DEFAULT_SORT, filterItems, sortItems } from '@/lib/work-item-filter';
import { buildFieldPrefsResolver, saveTypeFieldPrefs } from '@/lib/type-field-prefs';
import { aiClient, anyCapabilityEnabled } from '@/lib/ai';
import { CreateWorkItemDialog } from '@/components/works/organisms/create-work-item-dialog';
import { BRAND_NAVY, BRAND_ORANGE, NEUTRAL_600 } from '@/lib/brand-tokens';
import { Field } from '@/components/works/field';
// Route-level code-split — each view loads on demand (WI-21). Vite emits one chunk per
// import(); the Suspense below shows a skeleton until the chunk is ready.
// PortalFormDesigner moved to service-view.jsx (TD-003).
// KR-066: public article share link — loaded on /p/:token with no auth.
// KR-069: minimal-chrome article embed — loaded on /embed/article/:token with no auth.
import { readStoredSession } from '@/app/session/session-storage';
import { useGlobalShortcuts } from '@/app/shortcuts/useGlobalShortcuts';
import { useShellNavigation } from '@/app/navigation/useShellNavigation';
import { useShellOverlays } from '@/app/overlays/useShellOverlays';
import { useRealtimePresence } from '@/app/realtime/useRealtimePresence';
import { useWorkspaceContext } from '@/app/workspaces/useWorkspaceContext';
import { PublicRoutes } from '@/app/routes/PublicRoutes';
import { RouteOutlet } from '@/app/routes/RouteOutlet';
import { AuthScreens } from '@/app/AuthScreens';
import { useServiceState } from '@/hooks/useServiceState';
import { usePmState } from '@/hooks/usePmState';
import { useKnowledgeState } from '@/hooks/useKnowledgeState';
import { useComplianceState } from '@/hooks/useComplianceState';
import { FlagDevtools } from '@/components/works/organisms/flag-devtools';
import { useI18n } from '@/lib/i18n';
// DashboardDrillModal extracted to src/components/works/organisms/dashboard-drill-modal.jsx (TD-003).
// ExportButtons extracted to src/components/works/export-buttons.jsx (TD-003).
// ReportSectionCard extracted to src/components/works/organisms/report-section-card.jsx (TD-003).
// Dashboard widget metrics moved to dashboard-widget-card.jsx (TD-003).
// EXTRA_WIDGET_PRESETS / EXTRA_WIDGET_CATEGORIES moved to dashboards-view.jsx (TD-003).

// One error-presentation contract (findings F1/F2 in docs/UX-CODEBASE-ANALYSIS.md): failures are
// never swallowed silently. `reportError` (now in lib/report-error.js) is wired to the live toast
// emitter from inside App() via setToastEmitter(); because there is a single toast slot, a burst of
// failures collapses to one message rather than spamming. Transient/data errors surface here;
// form-field errors stay inline.

export default function AppShell() {
  const { t } = useI18n();
  const initialSession                  = readStoredSession();
  const [currentUser, setCurrentUser]   = useState(() => initialSession?.user || null);
  const [token, setToken]               = useState(() => initialSession?.token || null);
  const [mfaSetup, setMfaSetup]         = useState(null); // { otpAuthUri, secret } — enroll flow
  const [mfaSetupCode, setMfaSetupCode] = useState('');
  const [mfaSetupMsg, setMfaSetupMsg]   = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const { view, setView, didInitRoute, navigateRef } = useShellNavigation({ selectedItem, setSelectedItem });
  const [toast, setToast]               = useState(null); // { message, type }
  const { confirm, prompt } = useDialog(); // in-app dialogs (lib/dialog.jsx), not window.* natives
  const [workItems, setWorkItems]       = useState([]);
  const [projects, setProjects]         = useState([]);
  const [users, setUsers]               = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [inboxItems, setInboxItems]       = useState([]);
  const [unreadCount, setUnreadCount]   = useState(0);
  const [loading, setLoading]           = useState(true);
  // X-Total-Count from the /work-items list response — actual server count, which may exceed the
  // loaded array when size < total (Audit Finding #7). Used by board-view to surface a warning.
  const [totalWorkItemCount, setTotalWorkItemCount] = useState(null);
  // My Works — dedicated fetch from /work-items/my (server-side assignee scope) instead of
  // client-filtering the paginated workItems array (Audit Finding #7).
  const [myItems, setMyItems]           = useState([]);

  const [detailTab, setDetailTab]       = useState('details'); // details | activity | links | attachments
  const [comments, setComments]         = useState([]);
  const [newComment, setNewComment]     = useState('');
  const [commentInternal, setCommentInternal] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionOpen, setMentionOpen]   = useState(false);
  const [activity, setActivity]         = useState([]);
  const [links, setLinks]               = useState([]);
  const [attachments, setAttachments]   = useState([]);
  const [newLink, setNewLink]           = useState({ targetId: '', linkType: 'RELATES_TO' });
  const [tagInput, setTagInput]         = useState(''); // separate state for tag text field
  const fileInputRef                    = useRef(null);
  const updateTimerRef                  = useRef(null);

  const {
    isCreateOpen, setIsCreateOpen, isProjectOpen, setIsProjectOpen,
    paletteOpen, setPaletteOpen, overlay, setOverlay,
    shortcutsHelpOpen, setShortcutsHelpOpen,
  } = useShellOverlays();
  const [, setNewItem]                  = useState({ title: '', type: 'Task', description: '', assigneeId: '', dueDate: '', tags: '', priority: 'MEDIUM', parentId: '', projectId: '' });
  const [newProject, setNewProject]     = useState({ name: '', keyPrefix: '', description: '', framework: 'SCRUM' });
  const [createError, setCreateError]   = useState('');
  const goToRef                         = useRef(false); // 'g' then a key — quick go-to (brand §5.2)

  // Iteration 18 (Cap S): real-time presence roster, lightweight overlays (status / push / shortcuts
  // help) opened from the command palette or shortcuts, and the offline-sync conflict queue.
  const [conflicts, setConflicts]       = useState([]);

  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [inviteEmail, setInviteEmail]   = useState('');
  const [inviteMsg, setInviteMsg]       = useState('');

  // Kanban density: compact | comfortable | spacious — persisted via useDensity (WI-23)
  const { density, setDensity }         = useDensity();

  // Card field customisation — preferences persisted per-user in localStorage
  const cardPrefs = useCardPrefs();
  const [customFieldDefs, setCustomFieldDefs] = useState([]);
  // Per-type status configuration (names, categories, colors, lapse thresholds) — resolves the
  // status a work item stores (a string) to its category/color/clock across every surface.
  const [statusConfig, setStatusConfig] = useState([]);
  const statusResolver = useMemo(() => buildStatusResolver(statusConfig), [statusConfig]);
  // Per-type field preferences — which fields show on the detail surface, per work-item type.
  const [typeFieldPrefs, setTypeFieldPrefs] = useState([]);
  const fieldPrefs = useMemo(() => buildFieldPrefsResolver(typeFieldPrefs), [typeFieldPrefs]);
  // Toggle a field's visibility for a type (bulk-replaces that type's prefs server-side).
  const handleToggleFieldPref = (typeKey, fieldKey, visible) => {
    const forType = typeFieldPrefs
      .filter(p => p.typeKey === typeKey && p.fieldKey !== fieldKey)
      .map(p => ({ fieldKey: p.fieldKey, visible: p.visible, sortOrder: p.sortOrder }));
    const next = [...forType, { fieldKey, visible }];
    saveTypeFieldPrefs(api, activeWorkspaceId, typeKey, next)
      .then(updated => setTypeFieldPrefs(Array.isArray(updated) ? updated : []))
      .catch(reportError);
  };
  // Bulk-replace a type's field prefs (visibility + order) — used by the Settings field editor.
  const handleSaveFieldPrefs = (typeKey, prefList) =>
    saveTypeFieldPrefs(api, activeWorkspaceId, typeKey, prefList)
      .then(updated => setTypeFieldPrefs(Array.isArray(updated) ? updated : []))
      .catch(reportError);

  const [mobileNavOpen, setMobileNavOpen] = useState(false); // off-canvas drawer under md (G1)
  const [subRailCollapsed, setSubRailCollapsed] = useState(false);

  // Dark mode
  const [darkMode, setDarkMode]         = useState(() => localStorage.getItem('bSmartTheme') === 'dark');

  // RBAC
  const [userRole, setUserRole]         = useState({ role: 'MEMBER', tier: 2, permissions: [], surfaces: null });
  const [roleLoaded, setRoleLoaded]     = useState(false);
  const [lens, setLens]                 = useState(null); // active role-preview lens id (Admin/Owner only)
  const [lensOpen, setLensOpen]         = useState(false);
  const can = (perm) => userRole.permissions.includes(perm) || userRole.tier >= 4;

  // My Works sub-tab
  const [myWorksTab, setMyWorksTab]     = useState('assigned'); // assigned | activity | mentions

  // Notification prefs
  const [notifPrefs, setNotifPrefs]     = useState({ notifyAssign: true, notifyComment: true, notifyMention: true, emailDigest: false });
  // eslint-disable-next-line no-unused-vars
  const [userPrefs, setUserPrefs]       = useState({ theme: 'system', notificationsEnabled: true, locale: 'en', timezone: 'UTC' });

  // Iteration 2 — Sprints & Backlog
  const [sprints, setSprints]           = useState([]);
  const [activeSprint, setActiveSprint] = useState(null);
  const [backlogItems, setBacklogItems] = useState([]);
  const [sprintItems, setSprintItems]   = useState([]);
  const [sprintReport, setSprintReport] = useState(null);
  const [savedFilters, setSavedFilters] = useState([]);
  // Sprint board filter/sort — the shared Deliver filter model (same bar as Board/Backlog).
  const [sprintFilters, setSprintFilters] = useState(EMPTY_FILTERS);
  const [sprintSort, setSprintSort] = useState(DEFAULT_SORT);
  const [swimlaneBy, setSwimlaneBy]     = useState('none');
  const [isSprintOpen, setIsSprintOpen] = useState(false);
  const [newSprint, setNewSprint]       = useState({ name: '', goal: '', startDate: '', endDate: '', capacity: 40 });
  const [selectedSprintId, setSelectedSprintId] = useState(null);
  const [refinementMode, setRefinementMode] = useState(false);
  const [dragOverId, setDragOverId]     = useState(null);
  const [saveFilterName, setSaveFilterName] = useState('');
  const [showSaveFilter, setShowSaveFilter] = useState(false);
  const [scopeChanges, setScopeChanges] = useState([]);

  // Workspace switcher dropdown + multi-workspace tenant context (I01-S02).
  // The active workspace is client-held and server-validated on every request (membership is the
  // isolation guarantee — JWT stays identity-only). Persisted so a reload keeps the same tenant.
  const [wsOpen, setWsOpen]              = useState(false);
  const wsRef                           = useRef(null);
  const lensRef                         = useRef(null);
  const {
    workspaces,
    activeWorkspaceId,
    loading: wsLoading,
    error: wsError,
    ready: workspaceReady,
    refresh: fetchMyWorkspaces,
    selectWorkspace,
  } = useWorkspaceContext(api, currentUser);
  const presence = useRealtimePresence({
    currentUser,
    workspaceId: activeWorkspaceId,
    view,
    enabled: workspaceReady,
  });

  // Board columns derived from the active workflow — one column per workflow status.
  // Falls back to the three fixed category columns when no workflow is loaded.
  const [boardColumns, setBoardColumns] = useState(null); // null = loading not yet triggered

  // Iteration 3 — Workflows, Custom Fields, Permissions, BQL
  const [workflows, setWorkflows]           = useState([]);
  const [fieldDefs, setFieldDefs]           = useState([]);
  const [roles, setRoles]                   = useState([]);
  const [bqlQuery, setBqlQuery]           = useState('');
  const [bqlResults, setBqlResults]       = useState([]);
  const [bqlError, setBqlError]           = useState('');
  const [bqlLoading, setBqlLoading]       = useState(false);
  const [workItemTypes, setWorkItemTypes]   = useState({ builtIn: [], custom: [] });
  const [permMatrix, setPermMatrix]         = useState(null);
  const [settings3Tab, setSettings3Tab]     = useState('workflows'); // workflows | fields | permissions | types

  // Iter 3 — settings UI state
  const [expandedWorkflowId, setExpandedWorkflowId] = useState(null);
  const [workflowDetail, setWorkflowDetail]         = useState(null); // { statuses, transitions }
  const [newStatusForm, setNewStatusForm]           = useState({ name: '', color: BRAND_NAVY, category: 'IN_PROGRESS' });
  const [newTransitionForm, setNewTransitionForm]   = useState({ name: '', fromStatus: '', toStatus: '' });
  const [showFieldForm, setShowFieldForm]           = useState(false);
  const [newFieldForm, setNewFieldForm]             = useState({ name: '', fieldType: 'TEXT', required: false, description: '' });
  const [showTypeForm, setShowTypeForm]             = useState(false);
  const [newTypeForm, setNewTypeForm]               = useState({ label: '', typeKey: '', icon: 'package' });
  const [showRoleForm, setShowRoleForm]             = useState(false);
  const [newRoleForm, setNewRoleForm]               = useState({ name: '', tier: 2 });

  // Iteration 6 — Role-tuned Dashboards
  const [dashboardRole, setDashboardRole]       = useState('developer');
  const [developerDash, setDeveloperDash]       = useState(null);
  const [smDash, setSmDash]                     = useState(null);
  const [poDash, setPoDash]                     = useState(null);
  const [supportDash, setSupportDash]           = useState(null);
  const [execDash, setExecDash]                 = useState(null);
  const [adminDash, setAdminDash]               = useState(null);
  const [dashLoading, setDashLoading]           = useState(false);
  // Configurable Today — the effective layout ({ role, source, widgets }) for the active role.
  const [todayLayout, setTodayLayout]           = useState(null);
  const [widgetMetrics, setWidgetMetrics]       = useState([]); // curated metric catalogue (slice 5)

  // Iteration 6 — Releases
  const [releases, setReleases]                 = useState([]);
  const [selectedRelease, setSelectedRelease]   = useState(null);
  const [releaseItems, setReleaseItems]         = useState([]);
  const [isReleaseOpen, setIsReleaseOpen]       = useState(false);
  const [newRelease, setNewRelease]             = useState({ name: '', version: '', description: '', releaseDate: '', projectId: '', status: 'PLANNED' });
  const [releaseSearch, setReleaseSearch]       = useState('');

  // Iteration 15 — Scrum Master Cockpit (Cap V) + Product Owner Workspace (Cap W)
  const [i15ProjectId, setI15ProjectId]         = useState('');
  const [smTab, setSmTab]                       = useState('impediments'); // impediments | standup | risk | planning | retro | review | patterns
  const [poTab, setPoTab]                       = useState('roadmap');     // roadmap | ideas | feedback | okr | releasenotes | stakeholders
  const [impediments, setImpediments]           = useState([]);
  const [newImpediment, setNewImpediment]       = useState({ title: '', raiseType: 'IMPEDIMENT', severity: 'MEDIUM', category: '', description: '' });
  const [standups, setStandups]                 = useState([]);
  const [activeStandup, setActiveStandup]       = useState(null); // { session, entries }
  const [standupDraft, setStandupDraft]         = useState({ yesterday: '', today: '', blockers: '' });
  const [retros, setRetros]                     = useState([]);
  const [activeRetro, setActiveRetro]           = useState(null); // { session, notes }
  const [newRetro, setNewRetro]                 = useState({ title: '', template: 'START_STOP_CONTINUE', anonymous: false });
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
  const [newCeremony, setNewCeremony]           = useState({ ceremonyType: 'STANDUP', scheduledAt: '' });
  const [myDay, setMyDay]                       = useState(null); // { myItems, myImpediments, myActions, todayStandup, myStandupEntry }
  const [roadmapThemes, setRoadmapThemes]       = useState([]);
  const [newTheme, setNewTheme]                 = useState({ name: '', status: 'PLANNED', quarter: '', description: '' });
  const [ideas, setIdeas]                       = useState([]);
  const [newIdea, setNewIdea]                   = useState({ title: '', description: '' });
  const [feedbackItems, setFeedbackItems]       = useState([]);
  const [newFeedback, setNewFeedback]           = useState({ customer: '', source: 'PORTAL', content: '' });
  const [feedbackClusters, setFeedbackClusters] = useState(null);
  const [objectives, setObjectives]             = useState([]);
  const [activeObjective, setActiveObjective]   = useState(null); // { objective, keyResults, progressPercent }
  const [newObjective, setNewObjective]         = useState({ title: '', level: 'TEAM', quarter: '' });
  const [newKr, setNewKr]                       = useState({ title: '', metricType: 'PERCENT', startValue: 0, targetValue: 100, currentValue: 0 });
  const [releaseNotesResult, setReleaseNotesResult] = useState(null);
  const [releaseNotesName, setReleaseNotesName] = useState('');

  // Iteration 6 — Worklogs
  // eslint-disable-next-line no-unused-vars
  const [, setMyWorklogs]                        = useState([]);
  const [worklogForm, setWorklogForm]           = useState({ timeSpentMinutes: 30, description: '', workDate: '' });
  const [isWorklogOpen, setIsWorklogOpen]       = useState(false);

  // Iteration 3 completions
  const [fieldValues, setFieldValues] = useState({});
  const [fieldLayouts, setFieldLayouts] = useState([]);
  const [fieldVisibility, setFieldVisibility] = useState([]);
  const [newFieldVisForm, setNewFieldVisForm] = useState({ fieldDefId: '', roleId: '', visibility: 'EDITABLE' });

  // Iteration 4 completions
  const [crossProjectDeps, setCrossProjectDeps] = useState([]);
  const [isCrossProjOpen, setIsCrossProjOpen] = useState(false);
  const [crossProjForm, setCrossProjForm] = useState({ title: '', description: '', targetProjectId: '', deadline: '', isBlocker: false });

  // Iter 1 & 2 completion features
  const [, setRecentlyViewed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('bSmartRecentItems') || '[]'); } catch { return []; }
  });
  const [activityEventFilter, setActivityEventFilter] = useState('');
  const [velocityData, setVelocityData] = useState([]);
  // Iteration 6 — custom dashboards
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
  const [reports, setReports] = useState([]);
  const [reportTemplates, setReportTemplates] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportSections, setReportSections] = useState([]);
  const [reportEditMode, setReportEditMode] = useState(false);
  // Iteration 6 — scheduled report delivery (Cap J, S04)
  const [scheduleManagerOpen, setScheduleManagerOpen] = useState(false);
  const [reportSchedules, setReportSchedules] = useState([]);
  const [scheduleForm, setScheduleForm] = useState({ cadence: 'WEEKLY', channel: 'IN_APP', recipients: '' });
  const EMPTY_STATUS_METRICS = { durations: [], leadSeconds: null, cycleSeconds: null, leadRunning: false, cycleRunning: false };
  const [statusMetrics, setStatusMetrics] = useState(EMPTY_STATUS_METRICS);
  const [deleteUndoItem, setDeleteUndoItem] = useState(null);
  const deleteUndoTimer = useRef(null);
  const [itemChildren, setItemChildren] = useState([]);

  // Iter 1 complete — new states
  const [replyingTo, setReplyingTo]     = useState(null);   // comment being replied to
  const [replyBody, setReplyBody]       = useState('');
  const [trashItems, setTrashItems]     = useState([]);
  const [branding, setBranding]                 = useState({ primaryColor: BRAND_ORANGE, logoUrl: '', description: '' });
  const [projectMembers, setProjectMembers] = useState([]);
  const [projectMemberEmail, setProjectMemberEmail] = useState('');
  const [projectMemberMsg, setProjectMemberMsg] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [brandingColor, setBrandingColor] = useState(BRAND_ORANGE);
  const [brandingDesc, setBrandingDesc]  = useState('');

  // AI Control Plane — capabilities loaded once per workspace; drives hide/show of AI buttons (RB-40 §2).
  const [aiCapabilities, setAiCapabilities] = useState([]);
  const [aiLoading, setAiLoading] = useState({}); // { [key]: true } while an AI call is in flight

  // B20 — inline metrics strips (sprint + project views)
  const [sprintMetrics, setSprintMetrics] = useState(null);      // { velocity, completionPct, cycleTimeDays }
  const [sprintMetricsLoading, setSprintMetricsLoading] = useState(false);
  const [projectMetrics, setProjectMetrics] = useState({});      // keyed by projectId
  const [projectMetricsLoading, setProjectMetricsLoading] = useState(false);

  // Derived from the membership list + the active selection (see fetchMyWorkspaces).
  const workspace = workspaces.find(w => w.id === activeWorkspaceId)
    || { id: '', name: 'Workspace' };
  // Board WIP limits for the active workspace ({ todoLimit, inProgressLimit, doneLimit }); empty = none.
  const [wipLimits, setWipLimits] = useState({});

  const headers = (extra = {}) => ({
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...extra
  });

  // Shared request wrapper (throws on error, returns JSON) — delegates to the single apiClient.
  // eslint-disable-next-line no-unused-vars
  const apiFetch = (url, options = {}) => api.send(url, options);

  useEffect(() => {
    if (currentUser && workspaceReady && activeWorkspaceId) {
      fetchAll();
      fetchDashboard('developer');
      fetchReleases();
      const iv = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(iv);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, workspaceReady, activeWorkspaceId]);

  // Deep-link load: when signed in on a non-default URL, run that view's data fetch once (the
  // same side-effects a nav click would trigger), so a refreshed/shared link arrives populated.
  // Also handles entity deep-links: /items/:id opens the detail panel for that work item.
  useEffect(() => {
    if (!currentUser || !workspaceReady || !activeWorkspaceId || didInitRoute.current) return;
    didInitRoute.current = true;
    const pathname = window.location.pathname;
    const v = pathToView(pathname);
    if (v && v !== 'dashboard' && navigateRef.current) { navigateRef.current(v); return; }
    const entity = parseEntityRoute(pathname);
    if (entity?.kind === 'work-item') {
      // workItems may not be loaded yet; set a stub so the detail panel fetches the full item.
      // queueMicrotask defers the setState out of the synchronous effect body (react-hooks/set-state-in-effect).
      const entityId = entity.id;
      queueMicrotask(() => setSelectedItem(prev => prev?.id === entityId ? prev : { id: entityId }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, workspaceReady, activeWorkspaceId]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('bSmartTheme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    if (!selectedItem) {
      // When the panel is closed, restore the view's canonical URL if we were on an entity URL.
      if (parseEntityRoute(window.location.pathname)) {
        const path = viewToPath(view) || '/';
        window.history.pushState({ view }, '', path);
      }
      return;
    }
    const id = selectedItem.id;
    // Push the entity deep-link URL so the panel is shareable / refresh-stable (audit #28).
    const entityPath = `/items/${id}`;
    if (window.location.pathname !== entityPath) {
      window.history.pushState({ entity: id }, '', entityPath);
    }
    // Keep detail drawer controls aligned with the selected work item.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTagInput((selectedItem.tags || []).join(', '));
    setActivityEventFilter('');
    const h = headers();
    api.raw(`/work-items/${id}/comments`, { headers: h }).then(r => r.json()).then(d => setComments(Array.isArray(d) ? d : [])).catch(reportError);
    api.raw(`/work-items/${id}/activity`, { headers: h }).then(r => r.json()).then(d => setActivity(Array.isArray(d) ? d : [])).catch(reportError);
    api.raw(`/work-items/${id}/links`, { headers: h }).then(r => r.json()).then(d => setLinks(Array.isArray(d) ? d : [])).catch(reportError);
    api.raw(`/work-items/${id}/attachments`, { headers: h }).then(r => r.json()).then(d => setAttachments(Array.isArray(d) ? d : [])).catch(reportError);
    fetchStatusDurations(id); // Iteration 7 (Cap B) — auto time-in-status, projected from the event log
    setDetailTab('details');
    if (fieldDefs.length > 0) fetchFieldValues(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItem?.id]);

  // Close workspace + lens dropdowns on outside click
  useEffect(() => {
    function handler(e) {
      if (wsRef.current && !wsRef.current.contains(e.target)) setWsOpen(false);
      if (lensRef.current && !lensRef.current.contains(e.target)) setLensOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useGlobalShortcuts({
    navigateRef,
    goToRef,
    setPaletteOpen,
    setView,
    setIsCreateOpen,
    setShortcutsHelpOpen,
  });

  // Track recently viewed items
  useEffect(() => {
    if (!selectedItem) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecentlyViewed(prev => {
      const filtered = prev.filter(i => i.id !== selectedItem.id);
      const updated = [{ id: selectedItem.id, title: selectedItem.title, type: selectedItem.type }, ...filtered].slice(0, 8);
      localStorage.setItem('bSmartRecentItems', JSON.stringify(updated));
      return updated;
    });
    // Load children
    api.raw(`/work-items?parentId=${selectedItem.id}`)
      .then(r => r.json())
      .then(d => setItemChildren((Array.isArray(d) ? d : []).filter(i => i.parentId === selectedItem.id)))
      .catch(() => setItemChildren([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItem?.id]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };
  setToastEmitter(showToast); // register the live emitter for reportError (lib/report-error.js)

  const {
    pmProjectId, setPmProjectId, pmTab, setPmTab,
    risks, assumptions, pmIssues, dependencies, decisions, meetings, actionItems,
    stakeholders, lessonsLearned, raidDashboard,
    selectedMeeting, setSelectedMeeting, meetingNotes, setMeetingNotes,
    pmForm, setPmForm, pmFormOpen, setPmFormOpen,
    fetchRaidDashboard, fetchRisks, fetchAssumptions, fetchPmIssues,
    fetchDependencies, fetchDecisions, fetchMeetings, fetchActionItems,
    fetchStakeholders, fetchLessons, pmCreate, pmDelete,
  } = usePmState(api, activeWorkspaceId, showToast, reportError);

  const {
    knowledgeSpaces, knowledgeArticles, knowledgeSpacesLoading, knowledgeArticlesLoading,
    selectedSpace, setSelectedSpace, selectedArticle, setSelectedArticle,
    articleVersions, knowledgeSearch, setKnowledgeSearch,
    knowledgeSearchResults, knowledgeTab, setKnowledgeTab,
    spaceForm, setSpaceForm, articleForm, setArticleForm,
    isSpaceFormOpen, setIsSpaceFormOpen, isArticleFormOpen, setIsArticleFormOpen,
    editingArticle, setEditingArticle, articlePanel, setArticlePanel,
    articleComments, articleChildren,
    newArticleComment, setNewArticleComment, articleAnalytics,
    fetchKnowledgeSpaces, fetchKnowledgeArticles, fetchArticleDetail,
    createKnowledgeSpace, deleteKnowledgeSpace, createArticle, updateArticle, deleteArticle,
    submitArticleForReview, publishArticle, rejectArticle, archiveArticle, restoreArticle,
    addArticleComment, toggleArticleComment, deleteArticleComment,
    fetchArticleChildren, openArticlePanel, searchKnowledge,
  } = useKnowledgeState(api, activeWorkspaceId, showToast, reportError);

  const {
    complianceTab, setComplianceTab, complianceRules, complianceTemplates,
    complianceViolations, complianceDashboard, complianceAudit,
    violationFilter, setViolationFilter, selectedViolations,
    ruleBuilder, setRuleBuilder, ruleTestResult,
    fetchComplianceRules, fetchComplianceTemplates, fetchComplianceViolations,
    fetchComplianceDashboard, fetchComplianceAudit,
    newRuleBuilder, editRuleBuilder, saveRule, testRule, setRuleActive, evaluateRule,
    cloneTemplate, deleteRule, actOnViolation, bulkAcknowledge,
    toggleViolationSelect, selectAllViolations, exportComplianceAudit,
  } = useComplianceState(api, activeWorkspaceId, showToast, reportError);

  // Access guard — once the real role is known, bounce out of any surface this user can't see
  // (e.g. a deep link or stale URL into an admin area). Server RBAC already 403s the data; this
  // only avoids rendering an empty, forbidden surface. Preview mode is cosmetic and never triggers
  // this (it checks the user's real visibility, not the previewed tier).
  useEffect(() => {
    if (!roleLoaded) return;
    if (!allowed(view, { tier: userRole.tier, surfaces: userRole.surfaces })) {
      queueMicrotask(() => {
        setView('dashboard');
        showToast('You don’t have access to that area.', 'error');
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleLoaded, view, userRole.tier, userRole.surfaces]);

  // Switching tenant persists the choice and reloads so every workspace-scoped query refetches
  // cleanly under the new workspace — no stale cross-tenant data in this large single-file app.
  const switchWorkspace = (id) => {
    if (id === activeWorkspaceId) { setWsOpen(false); return; }
    if (!selectWorkspace(id)) return;
    setWsOpen(false);
    window.location.reload();
  };

  function fetchUserRole() {
    api.raw(`/rbac/me?workspaceId=${encodeURIComponent(activeWorkspaceId)}`)
      .then(r => r.json()).then(d => setUserRole({
        role: d.role || 'MEMBER',
        tier: d.tier || 2,
        permissions: Array.isArray(d.permissions) ? d.permissions : [],
        // Server-authoritative nav surface list (RbacController). Absent on older servers — the
        // nav then falls back to the client tier map (lib/nav-model SURFACE_TIER).
        surfaces: Array.isArray(d.surfaces) ? d.surfaces : null,
      })).catch(reportError).finally(() => setRoleLoaded(true));
  }

  function fetchWipLimits() {
    if (!activeWorkspaceId) return;
    api.send(`/board/wip-limits?workspaceId=${encodeURIComponent(activeWorkspaceId)}`)
      .then(d => setWipLimits(d || {}))
      .catch(() => setWipLimits({}));
  }

  // Managers set/clear a column's WIP limit. The PUT carries all three lanes so passing one null
  // cleanly clears a single column without disturbing the others (RB-40 §1: workspace-scoped).
  const setWipLimit = (key, next) => {
    const body = {
      todoLimit: wipLimits.todoLimit ?? null,
      inProgressLimit: wipLimits.inProgressLimit ?? null,
      doneLimit: wipLimits.doneLimit ?? null,
      [key]: next,
    };
    api.send(`/board/wip-limits?workspaceId=${encodeURIComponent(activeWorkspaceId)}`, { method: 'PUT', body })
      .then(d => { setWipLimits(d || {}); showToast('WIP limits updated'); })
      .catch(err => showToast(err.message, 'error'));
  };

  function fetchAll() {
    setLoading(true);
    Promise.all([
      api.raw(`/work-items`).then(r => {
        // Read X-Total-Count before consuming the body — headers are only available on the
        // Response object, not after .json() resolves (Audit Finding #7).
        const total = r.headers.get('X-Total-Count');
        if (total !== null) setTotalWorkItemCount(Number(total));
        return r.json();
      }),
      api.raw(`/projects`).then(r => r.json()),
      api.raw(`/users?workspaceId=${encodeURIComponent(activeWorkspaceId)}`).then(r => r.json()),
    ]).then(([items, projs, usrs]) => {
      setWorkItems(Array.isArray(items) ? items : []);
      setProjects(Array.isArray(projs) ? projs : []);
      setUsers(Array.isArray(usrs) ? usrs : []);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
      showToast('Failed to load data. Check your connection.', 'error');
    });
    // Fetch items assigned to the current user via the dedicated /my endpoint (server-side
    // assignee scope) — more accurate than filtering the paginated workItems array, which may
    // miss items beyond the loaded page (Audit Finding #7).
    api.send(`/work-items/my`)
      .then(items => setMyItems(Array.isArray(items) ? items : []))
      .catch(() => setMyItems([]));
    fetchUnreadCount();
    fetchUserRole();
    fetchBranding();
    fetchWipLimits();
    fetchUserPrefs();
    // Load custom field definitions for card rendering and the field picker. Unified onto field_def
    // (Option B): cards and the detail panel share one definition store; values arrive on each work
    // item as `fieldValues` (batch-attached by the backend), keyed by field_def id.
    api.send(`/field-defs?workspaceId=${encodeURIComponent(activeWorkspaceId)}`)
      .then(defs => setCustomFieldDefs(Array.isArray(defs) ? defs : []))
      .catch(() => setCustomFieldDefs([]));
    // Load per-type status configuration (seeds workspace defaults server-side on first read).
    api.send(`/status-config?workspaceId=${encodeURIComponent(activeWorkspaceId)}`)
      .then(cfg => setStatusConfig(Array.isArray(cfg) ? cfg : []))
      .catch(() => setStatusConfig([]));
    // Load per-type field preferences (which detail-surface fields show per type).
    api.send(`/type-field-prefs?workspaceId=${encodeURIComponent(activeWorkspaceId)}`)
      .then(p => setTypeFieldPrefs(Array.isArray(p) ? p : []))
      .catch(() => setTypeFieldPrefs([]));
    // Load AI capabilities for this workspace — drives hide/show of AI action buttons (RB-40 §2).
    aiClient.capabilities(activeWorkspaceId).then(caps => {
      setAiCapabilities(Array.isArray(caps) ? caps : []);
    }).catch(() => { setAiCapabilities([]); });
  }

  // B20 — load per-project metrics for the projects list view.
  function fetchProjectMetrics(projectList) {
    if (!projectList || projectList.length === 0) return;
    setProjectMetricsLoading(true);
    Promise.all(
      projectList.map(p =>
        api.send(`/kpi/project?workspaceId=${encodeURIComponent(activeWorkspaceId)}&projectId=${encodeURIComponent(p.id)}`)
          .then(data => ({ id: p.id, metrics: { velocity: data.velocity ?? data.avgVelocity ?? null, completionPct: data.completionPct ?? data.completionPercent ?? null, cycleTimeDays: data.cycleTimeDays ?? data.avgCycleTime ?? null } }))
          .catch(() => ({ id: p.id, metrics: null }))
      )
    ).then(results => {
      const map = {};
      results.forEach(r => { map[r.id] = r.metrics; });
      setProjectMetrics(map);
      setProjectMetricsLoading(false);
    });
  }

  // B20 — load sprint-level metrics (velocity, completion%, cycle time) for the active sprint.
  function fetchSprintMetrics(sprint, projectId) {
    if (!sprint || !projectId) return;
    setSprintMetricsLoading(true);
    api.send(`/kpi/project?workspaceId=${encodeURIComponent(activeWorkspaceId)}&projectId=${encodeURIComponent(projectId)}&sprintId=${encodeURIComponent(sprint.id)}`)
      .then(data => {
        setSprintMetrics({
          velocity: data.velocity ?? data.avgVelocity ?? null,
          completionPct: data.completionPct ?? data.completionPercent ?? null,
          cycleTimeDays: data.cycleTimeDays ?? data.avgCycleTime ?? null,
        });
        setSprintMetricsLoading(false);
      })
      .catch(() => { setSprintMetrics(null); setSprintMetricsLoading(false); });
  }

  // AI helper — checks capability, fires an AI call, shows the result in a toast or state setter.
  // key: unique string for aiLoading tracking; fallbackMsg: shown if AI is off/over budget.
  function aiAction(key, call, onResult, fallbackMsg) {
    if (!anyCapabilityEnabled(aiCapabilities)) {
      showToast(fallbackMsg || 'AI is not enabled for this workspace.', 'info');
      return;
    }
    setAiLoading(l => ({ ...l, [key]: true }));
    call()
      .then(res => { setAiLoading(l => ({ ...l, [key]: false })); onResult(res); })
      .catch(() => { setAiLoading(l => ({ ...l, [key]: false })); showToast('AI request failed. Please try again.', 'error'); });
  }

  function fetchUnreadCount() {
    if (!currentUser || !activeWorkspaceId) return;
    api.send(`/inbox/count?workspaceId=${encodeURIComponent(activeWorkspaceId)}`)
      .then(data => setUnreadCount(Number(data?.count) || 0))
      .catch(reportError);
  }

  function fetchNotifications() {
    if (!currentUser || !activeWorkspaceId) return Promise.resolve();
    const workspace = encodeURIComponent(activeWorkspaceId);
    return Promise.all([
      api.send(`/notifications?workspaceId=${workspace}&page=0&size=100`),
      api.send(`/inbox?workspaceId=${workspace}`),
    ]).then(([activity, actions]) => {
      const activityRows = Array.isArray(activity) ? activity : [];
      const actionRows = Array.isArray(actions) ? actions : [];
      setNotifications(activityRows);
      setInboxItems(actionRows);
      setUnreadCount(actionRows.length);
    }).catch(reportError);
  }

  // Session hand-off from the isolated authentication surface.
  const handleLogin = (user, sessionToken) => {
    setCurrentUser(user);
    setToken(sessionToken);
    localStorage.setItem('bSmartSession', JSON.stringify({ user, token: sessionToken }));
  };

  // MFA enroll/confirm act on the logged-in user; apiClient attaches the JWT, and the server
  // derives identity from it (no client-supplied X-User-Id — that header is no longer trusted).
  const handleMfaEnroll = () => {
    api.raw(`/auth/mfa/enroll`, { method: 'POST' })
      .then(r => r.json()).then(d => { setMfaSetup(d); setMfaSetupCode(''); setMfaSetupMsg(''); })
      .catch(() => showToast('MFA enroll failed', 'error'));
  };

  const handleMfaConfirm = () => {
    api.raw(`/auth/mfa/confirm`, {
      method: 'POST',
      body: JSON.stringify({ totp: mfaSetupCode })
    }).then(r => r.json()).then(d => {
      if (d.message) { setMfaSetup(null); setMfaSetupMsg(''); showToast('MFA enabled!'); }
      else setMfaSetupMsg(d.message || d.error || 'Failed');
    }).catch(() => setMfaSetupMsg('Confirmation failed'));
  };

  const handleLogout = () => {
    setCurrentUser(null); setToken(null);
    localStorage.removeItem('bSmartSession');
    localStorage.removeItem('bSmartActiveWorkspace');
  };

  // WORK ITEMS
  const handleCreate = (formData) => {
    if (!formData.title || formData.title.length < 3) { showToast('Title must be at least 3 characters', 'error'); return; }
    const projectId = formData.projectId || (projects.length > 0 ? projects[0].id : 'PROJ-WORKS');
    api.send(`/work-items`, {
      method: 'POST',
      body: JSON.stringify({
        ...formData,
        dueDate: formData.dueDate || null,
        startDate: formData.startDate || null,
        assigneeId: formData.assigneeId || null,
        parentId: formData.parentId || null,
        projectId,
        priority: formData.priority || 'MEDIUM',
      })
    }).then(saved => {
      setWorkItems(prev => [...prev, saved]);
      setIsCreateOpen(false);
      showToast(`${saved.autoId ? saved.autoId + ' — ' : ''}${saved.title} created`);
    }).catch(err => showToast(err.message, 'error'));
  };

  // Inline quick-add (WI-13): promise-returning variant for the backlog quick-add row; resolves with
  // the saved item so the row can reset itself. Project defaults to the first available project.
  const handleInlineCreate = ({ title, type, priority = 'MEDIUM' }) => {
    const projectId = projects.length > 0 ? projects[0].id : 'PROJ-WORKS';
    return api.send('/work-items', {
      method: 'POST',
      body: JSON.stringify({ title, type, priority, projectId }),
    }).then((saved) => {
      setWorkItems((prev) => [...prev, saved]);
      showToast(`${saved.autoId ? saved.autoId + ' — ' : ''}${saved.title} created`);
      return saved;
    });
  };

  // Bulk-edit selected items (assignee/priority/add|removeLabel). The server re-checks edit rights
  // per item (RB-40 §1) and returns { requested, updated, skipped }; we refetch so every surface
  // reflects the change and surface a summary toast. Returns a promise so the caller can clear state.
  const handleBulkEdit = (action, value, ids) =>
    api.send('/work-items/bulk', { method: 'POST', body: JSON.stringify({ ids, action, value }) })
      .then(res => api.raw('/work-items').then(r => r.json()).then(items => {
        setWorkItems(Array.isArray(items) ? items : []);
        const updated = res?.updated?.length ?? 0;
        const skipped = res?.skipped?.length ?? 0;
        showToast(skipped > 0
          ? `Updated ${updated} · skipped ${skipped} (no edit rights)`
          : `Updated ${updated} item${updated === 1 ? '' : 's'}`);
      }))
      .catch(err => { showToast(err.message || 'Bulk edit failed', 'error'); throw err; });

  const handleDelete = (id) => {
    const item = workItems.find(i => i.id === id);
    if (!item) return;
    // Optimistic remove
    setWorkItems(prev => prev.filter(i => i.id !== id));
    if (selectedItem?.id === id) setSelectedItem(null);
    setDeleteUndoItem(item);
    clearTimeout(deleteUndoTimer.current);
    // Toast with undo — commit delete after 8 seconds
    setToast({ message: `"${item.title.slice(0, 35)}${item.title.length > 35 ? '…' : ''}" deleted`, type: 'undo' });
    deleteUndoTimer.current = setTimeout(() => {
      api.send(`/work-items/${id}`, { method: 'DELETE' }).catch(() => {
        setWorkItems(prev => [...prev, item]);
        showToast('Failed to delete item', 'error');
      });
      setDeleteUndoItem(null);
      setToast(null);
    }, 8000);
  };

  const handleUndoDelete = () => {
    if (!deleteUndoItem) return;
    clearTimeout(deleteUndoTimer.current);
    setWorkItems(prev => {
      const exists = prev.find(i => i.id === deleteUndoItem.id);
      return exists ? prev : [...prev, deleteUndoItem];
    });
    setDeleteUndoItem(null);
    setToast(null);
  };

  const handleDragStart = (e, id) => e.dataTransfer.setData('itemId', id);
  const handleDragOver  = (e) => e.preventDefault();
  const handleDrop = (e, dropTarget) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('itemId');
    const item = workItems.find(i => i.id === itemId);
    if (!item) return;
    // dropTarget is a board category ('todo'|'in_progress'|'done') — resolve it to a concrete
    // status from the item's own type workflow. (A literal status string is honored as-is too.)
    let newStatus = dropTarget;
    if (dropTarget === 'todo' || dropTarget === 'in_progress' || dropTarget === 'done') {
      if (statusResolver.categoryOf(item.type, item.status) === dropTarget) return; // already there
      newStatus = statusResolver.firstStatusOfCategory(item.type, dropTarget) || item.status;
    }
    if (item.status === newStatus) return;
    // Optimistic update
    setWorkItems(prev => prev.map(i => i.id === itemId ? { ...i, status: newStatus } : i));
    api.send(`/work-items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify({ ...item, status: newStatus })
    }).then(saved => {
      // Adopt the saved item so derived fields (e.g. statusChangedAt for the lapse badge) reflect
      // the server rather than the optimistic guess.
      setWorkItems(prev => prev.map(i => i.id === itemId ? saved : i));
    }).catch(err => {
      if (err?.status === 409) {
        // Concurrent edit: pull the authoritative item instead of leaving the stale optimistic move.
        api.raw(`/work-items/${itemId}`).then(r => (r.ok ? r.json() : null)).then(fresh => {
          setWorkItems(prev => prev.map(i => i.id === itemId ? (fresh || { ...i, status: item.status }) : i));
        }).catch(() => setWorkItems(prev => prev.map(i => i.id === itemId ? { ...i, status: item.status } : i)));
        showToast('This item changed elsewhere — refreshed to the latest', 'error');
      } else {
        // Revert the optimistic move.
        setWorkItems(prev => prev.map(i => i.id === itemId ? { ...i, status: item.status } : i));
        // Surface workflow-transition rejections as specific messages (WorkflowRuleEngine returns
        // VALIDATOR_FAILED or TRANSITION_CONDITION_FAILED with a descriptive message).
        const code = err?.code || err?.body?.code;
        if (code === 'VALIDATOR_FAILED' || code === 'TRANSITION_CONDITION_FAILED') {
          showToast(`Status change blocked: ${err.message || 'transition not allowed'}`, 'error');
        } else {
          showToast('Failed to update status', 'error');
        }
      }
    });
  };

  // Debounced update — wait 600ms after last change before saving
  const handleUpdateItem = (updated) => {
    clearTimeout(updateTimerRef.current);
    updateTimerRef.current = setTimeout(() => {
      api.send(`/work-items/${updated.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...updated, tags: updated.tags || [] })
      }).then(saved => {
        setWorkItems(prev => prev.map(i => i.id === saved.id ? saved : i));
        setSelectedItem(saved);
      }).catch(err => showToast(err.message, 'error'));
    }, 600);
  };

  // COMMENTS with @mention + internal flag
  const handleAddComment = () => {
    if (!newComment.trim()) return;
    api.raw(`/work-items/${selectedItem.id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body: newComment, isInternal: commentInternal })
    }).then(r => r.json()).then(c => {
      setComments(prev => [...prev, c]);
      setNewComment(''); setCommentInternal(false); setMentionOpen(false);
    });
  };

  const handleCommentInput = (e) => {
    const val = e.target.value;
    setNewComment(val);
    const lastAt = val.lastIndexOf('@');
    if (lastAt !== -1 && lastAt === val.length - 1) { setMentionOpen(true); setMentionQuery(''); }
    else if (lastAt !== -1 && val.slice(lastAt + 1).match(/^\w+$/)) {
      setMentionOpen(true); setMentionQuery(val.slice(lastAt + 1).toLowerCase());
    } else { setMentionOpen(false); }
  };

  const insertMention = (user) => {
    const lastAt = newComment.lastIndexOf('@');
    setNewComment(newComment.slice(0, lastAt) + '@' + user.fullName + ' ');
    setMentionOpen(false);
  };

  // PROJECTS
  const handleCreateProject = () => {
    if (!newProject.name || !newProject.keyPrefix) { setCreateError('Name and key prefix required.'); return; }
    setCreateError('');
    api.send(`/projects`, { method: 'POST', body: JSON.stringify(newProject) })
      .then(p => {
        setProjects(prev => [...prev, p]);
        setNewProject({ name: '', keyPrefix: '', description: '', framework: 'SCRUM' });
        setIsProjectOpen(false);
        showToast('Team created');
      }).catch(err => setCreateError(err.message));
  };

  // WORKSPACE
  const fetchMembers = () => {
    api.raw(`/workspaces/${activeWorkspaceId}/members`)
      .then(r => r.json()).then(d => setWorkspaceMembers(Array.isArray(d) ? d : [])).catch(reportError);
  };

  const handleInvite = () => {
    api.send(`/workspaces/${activeWorkspaceId}/members`, {
      method: 'POST', body: JSON.stringify({ email: inviteEmail, role: 'MEMBER' })
    }).then(d => { setInviteMsg(d.message || 'Added!'); setInviteEmail(''); fetchMembers(); })
      .catch(err => setInviteMsg(err.message || 'Error — user may not exist.'));
  };

  const handleRemoveMember = (userId) => {
    api.raw(`/workspaces/${activeWorkspaceId}/members/${userId}`, { method: 'DELETE', headers: headers() })
      .then(() => fetchMembers());
  };

  // NOTIFICATION PREFS
  function fetchNotifPrefs() {
    api.raw(`/notification-preferences`)
      .then(r => r.json()).then(d => setNotifPrefs({
        notifyAssign:  d.notify_assign  ?? true,
        notifyComment: d.notify_comment ?? true,
        notifyMention: d.notify_mention ?? true,
        emailDigest:   d.email_digest   ?? false,
      })).catch(reportError);
  }
  function saveNotifPrefs(prefs) {
    api.raw(`/notification-preferences`, { method: 'PUT', body: JSON.stringify(prefs) })
      .then(() => setNotifPrefs(prefs));
  }

  function fetchUserPrefs() {
    api.raw(`/users/me/preferences`)
      .then(r => r.json())
      .then(d => {
        setUserPrefs(d);
        if (d && d.theme === 'dark') setDarkMode(true);
        else if (d && d.theme === 'light') setDarkMode(false);
      })
      .catch(() => {});
  }

  function saveUserPrefs(prefs) {
    api.raw(`/users/me/preferences`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(prefs) })
      .then(r => r.json())
      .then(d => {
        setUserPrefs(d);
        if (d && d.theme === 'dark') setDarkMode(true);
        else if (d && d.theme === 'light') setDarkMode(false);
      })
      .catch(() => {});
  }

  // SPRINT FUNCTIONS
  function fetchSprints(projectId = 'PROJ-WORKS') {
    api.raw(`/sprints?projectId=${projectId}`)
      .then(r => r.json()).then(d => {
        const list = Array.isArray(d) ? d : [];
        setSprints(list);
        const active = list.find(s => s.status === 'ACTIVE') || list[0];
        if (active) { setActiveSprint(active); fetchSprintItems(active.id); fetchSprintMetrics(active, 'PROJ-WORKS'); }
      }).catch(reportError);
  }
  function fetchSprintItems(sprintId) {
    api.raw(`/sprints/${sprintId}/items`)
      .then(r => r.json()).then(d => setSprintItems(Array.isArray(d) ? d : [])).catch(reportError);
  }
  function fetchBacklog() {
    api.raw(`/work-items/backlog`)
      .then(r => r.json()).then(d => setBacklogItems(Array.isArray(d) ? d : [])).catch(reportError);
  }
  function fetchSprintReport(sprintId) {
    api.raw(`/sprints/${sprintId}/report`)
      .then(r => r.json()).then(setSprintReport).catch(reportError);
    api.raw(`/sprints/${sprintId}/scope-changes`)
      .then(r => r.json()).then(d => setScopeChanges(Array.isArray(d) ? d : [])).catch(reportError);
  }
  function fetchSavedFilters() {
    api.raw(`/saved-filters?workspaceId=${encodeURIComponent(activeWorkspaceId)}`)
      .then(r => r.json()).then(d => setSavedFilters(Array.isArray(d) ? d : [])).catch(reportError);
  }

  function fetchVelocityData() {
    api.raw(`/sprints/velocity`)
      .then(r => r.json()).then(d => setVelocityData(Array.isArray(d) ? d : [])).catch(reportError);
  }

  // ── Iteration 6 — custom dashboards ──────────────────────────────────────────
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

  // ── Iteration 6 — custom reports ─────────────────────────────────────────────
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

  // ── Iteration 6 — scheduled report delivery (Cap J, S04) ─────────────────────
  function openScheduleManager(reportId) {
    setScheduleForm({ cadence: 'WEEKLY', channel: 'IN_APP', recipients: '' });
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
      .then(() => { showToast('Schedule created'); setScheduleForm({ cadence: 'WEEKLY', channel: 'IN_APP', recipients: '' }); fetchReportSchedules(selectedReport.id); })
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

  // Service Desk domain state and commands.
  const {
    serviceTab, setServiceTab, serviceQueue, setServiceQueue,
    serviceRequests, serviceCustomers, serviceTypes, serviceTiers, serviceCsat,
    newCustomer, setNewCustomer, formDesignerTypeId, setFormDesignerTypeId,
    fetchServiceRequests, fetchServiceCustomers, fetchServiceTypes, fetchServiceTiers,
    fetchServiceCsat, assignServiceRequest, transitionServiceRequest, createServiceCustomer,
  } = useServiceState(api, activeWorkspaceId, showToast, reportError);

  function fetchStatusDurations(itemId) {
    setStatusMetrics(EMPTY_STATUS_METRICS);
    api.raw(`/work-items/${itemId}/status-durations`).then(r => r.json())
      .then(d => setStatusMetrics(d && typeof d === 'object' && !Array.isArray(d)
        ? d
        : { ...EMPTY_STATUS_METRICS, durations: Array.isArray(d) ? d : [] }))
      .catch(reportError);
  }
  function addReportSection(type) {
    const defaults = {
      kpi:       { title: 'Open items', config: { metric: 'count', filter: { open: true } } },
      chart:     { title: 'By status', config: { chartType: 'bar', dimension: 'status' } },
      pivot:     { title: 'Custom chart', config: { spec: null } },
      table:     { title: 'Work items', config: { limit: 20 } },
      narrative: { title: 'Summary', config: { text: '' } },
    };
    const base = defaults[type] || defaults.kpi;
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

  function fetchBranding() {
    api.raw(`/workspaces/${activeWorkspaceId}/branding`)
      .then(r => r.json()).then(d => {
        setBranding(d);
        setBrandingColor(d.primaryColor || BRAND_ORANGE);
        setBrandingDesc(d.description || '');
        // Apply brand color as CSS variable
        document.documentElement.style.setProperty('--brand-action', d.primaryColor || BRAND_ORANGE);
      }).catch(reportError);
  }

  function saveBranding() {
    api.raw(`/workspaces/${activeWorkspaceId}/branding`, {
      method: 'PUT',
      body: JSON.stringify({ primaryColor: brandingColor, description: brandingDesc })
    }).then(r => r.json()).then(d => { setBranding(d); showToast('Branding saved'); }).catch(reportError);
  }

  // ---- Iteration 3 fetches ----
  function fetchWorkflows(projectId) {
    const q = projectId ? `?projectId=${projectId}` : '';
    api.raw(`/workflows${q}`)
      .then(r => r.json()).then(d => setWorkflows(Array.isArray(d) ? d : [])).catch(reportError);
  }
  /**
   * Fetch the active workflow for the board and derive one column per workflow status, ordered
   * by position. Falls back to null (which board-view renders as the three fixed category columns)
   * when no workflow is found or the fetch fails.
   */
  function fetchActiveWorkflow(projectId) {
    const q = projectId ? `?projectId=${projectId}` : '';
    api.raw(`/workflows${q}`)
      .then(r => r.json())
      .then(list => {
        const all = Array.isArray(list) ? list : [];
        // Prefer the first default workflow; fall back to the first available one.
        const wf = all.find(w => w.isDefault) || all[0] || null;
        if (!wf) { setBoardColumns(null); return; }
        // Load the full workflow detail to get the ordered statuses list.
        return api.raw(`/workflows/${wf.id}`)
          .then(r => r.json())
          .then(detail => {
            const statuses = Array.isArray(detail?.statuses)
              ? [...detail.statuses].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
              : [];
            if (!statuses.length) { setBoardColumns(null); return; }
            setBoardColumns(statuses.map(s => ({
              name:     s.name,
              category: s.category, // 'TO_DO' | 'IN_PROGRESS' | 'DONE'
              color:    s.color || null,
            })));
          });
      })
      .catch(() => setBoardColumns(null));
  }
  function fetchFieldDefs(projectId) {
    const q = projectId ? `?projectId=${projectId}` : '';
    api.raw(`/field-defs${q}`)
      .then(r => r.json()).then(d => setFieldDefs(Array.isArray(d) ? d : [])).catch(reportError);
  }
  function fetchRoles() {
    api.raw(`/permission-schemes/roles`)
      .then(r => r.json()).then(d => setRoles(Array.isArray(d) ? d : [])).catch(reportError);
  }
  function fetchWorkItemTypes() {
    api.raw(`/work-item-types`)
      .then(r => r.json()).then(d => setWorkItemTypes(d || { builtIn: [], custom: [] })).catch(reportError);
  }
  function fetchPermMatrix() {
    api.raw(`/permission-schemes/matrix?workspaceId=${activeWorkspaceId}`)
      .then(r => r.json()).then(d => setPermMatrix(d)).catch(reportError);
  }
  function loadWorkflowDetail(wfId) {
    api.raw(`/workflows/${wfId}`)
      .then(r => r.json()).then(d => setWorkflowDetail(d)).catch(reportError);
  }
  function expandWorkflow(wfId) {
    if (expandedWorkflowId === wfId) { setExpandedWorkflowId(null); setWorkflowDetail(null); return; }
    setExpandedWorkflowId(wfId);
    setWorkflowDetail(null);
    loadWorkflowDetail(wfId);
  }
  function addStatus(wfId) {
    if (!newStatusForm.name.trim()) return;
    api.raw(`/workflows/${wfId}/statuses`, { method: 'POST', body: JSON.stringify(newStatusForm) })
      .then(r => r.json()).then(() => { loadWorkflowDetail(wfId); setNewStatusForm({ name: '', color: BRAND_NAVY, category: 'IN_PROGRESS' }); }).catch(reportError);
  }
  function deleteStatus(wfId, statusId) {
    api.raw(`/workflows/${wfId}/statuses/${statusId}`, { method: 'DELETE' })
      .then(() => loadWorkflowDetail(wfId)).catch(reportError);
  }
  function addTransition(wfId) {
    if (!newTransitionForm.name.trim() || !newTransitionForm.fromStatus || !newTransitionForm.toStatus) return;
    api.raw(`/workflows/${wfId}/transitions`, { method: 'POST', body: JSON.stringify(newTransitionForm) })
      .then(r => r.json()).then(() => { loadWorkflowDetail(wfId); setNewTransitionForm({ name: '', fromStatus: '', toStatus: '' }); }).catch(reportError);
  }
  function deleteTransition(wfId, transId) {
    api.raw(`/workflows/${wfId}/transitions/${transId}`, { method: 'DELETE' })
      .then(() => loadWorkflowDetail(wfId)).catch(reportError);
  }
  function createFieldDef() {
    if (!newFieldForm.name.trim()) return;
    api.raw(`/field-defs`, { method: 'POST', body: JSON.stringify({ ...newFieldForm, fieldKey: newFieldForm.name.toLowerCase().replace(/\s+/g,'_'), workspaceId: activeWorkspaceId }) })
      .then(r => r.json()).then(() => { fetchFieldDefs(); setShowFieldForm(false); setNewFieldForm({ name: '', fieldType: 'TEXT', required: false, description: '' }); }).catch(reportError);
  }
  function createWorkItemType() {
    if (!newTypeForm.label.trim()) return;
    const typeKey = newTypeForm.typeKey || newTypeForm.label.toUpperCase().replace(/\s+/g,'_');
    api.raw(`/work-item-types`, { method: 'POST', body: JSON.stringify({ ...newTypeForm, typeKey, color: NEUTRAL_600, workspaceId: activeWorkspaceId }) })
      .then(r => r.json()).then(() => { fetchWorkItemTypes(); setShowTypeForm(false); setNewTypeForm({ label: '', typeKey: '', icon: 'package' }); }).catch(reportError);
  }
  function createRole() {
    if (!newRoleForm.name.trim()) return;
    api.raw(`/permission-schemes/roles`, { method: 'POST', body: JSON.stringify({ ...newRoleForm, workspaceId: activeWorkspaceId }) })
      .then(r => r.json()).then(() => { fetchRoles(); fetchPermMatrix(); setShowRoleForm(false); setNewRoleForm({ name: '', tier: 2 }); }).catch(reportError);
  }
  function runBql(opts) {
    setBqlError('');
    setBqlLoading(true);
    const o = opts && typeof opts === 'object' ? opts : {};
    // An explicit query (saved-view / history / shared-link run) avoids the stale-closure read of
    // bqlQuery when the editor was just set in the same tick.
    const query = typeof o.query === 'string' ? o.query : bqlQuery;
    // Running a saved view goes through its audited run endpoint (RB-20 §5) instead of the ad-hoc
    // /bql/execute path, so the named run is recorded; results flow into the same table.
    if (o.savedViewId) {
      const size = Number.isFinite(o.size) ? o.size : 100;
      api.raw(`/saved-views/${encodeURIComponent(o.savedViewId)}/run`
        + `?workspaceId=${encodeURIComponent(activeWorkspaceId)}&size=${size}`, { method: 'POST' })
        .then(r => r.json()).then(d => {
          if (d.error || d.message) { setBqlError(d.message || d.error); setBqlResults([]); }
          else setBqlResults(Array.isArray(d) ? d : []);
        }).catch(err => setBqlError(err.message))
        .finally(() => setBqlLoading(false));
      return;
    }
    const body = { query, workspaceId: activeWorkspaceId };
    if (typeof o.sort === 'string' && o.sort) body.sort = o.sort;
    if (Number.isFinite(o.size)) body.size = String(o.size);
    api.raw(`/bql/execute`, { method: 'POST', body: JSON.stringify(body) })
      .then(r => r.json()).then(d => {
        if (d.error) { setBqlError(d.error); setBqlResults([]); }
        else setBqlResults(Array.isArray(d) ? d : []);
      }).catch(err => setBqlError(err.message))
      .finally(() => setBqlLoading(false));
  }

  // ── Iteration 3 completions ──────────────────────────────────────────────────

  function fetchFieldValues(workItemId) {
    api.raw(`/field-defs/values/${workItemId}`)
      .then(r => r.json()).then(d => {
        const map = {};
        (Array.isArray(d) ? d : []).forEach(fv => { map[fv.fieldDefId] = fv.valueText ?? fv.valueNumber ?? fv.valueJson ?? ''; });
        setFieldValues(map);
      }).catch(reportError);
  }

  function saveFieldValue(workItemId, fieldDefId, value) {
    api.send(`/field-defs/values/${workItemId}/${fieldDefId}`, {
      method: 'PUT', body: JSON.stringify({ valueText: value })
    }).catch(reportError);
  }

  function fetchFieldLayouts() {
    api.raw(`/field-layouts`).then(r => r.json()).then(d => setFieldLayouts(Array.isArray(d) ? d : [])).catch(reportError);
  }

  function fetchFieldVisibility() {
    Promise.all((fieldDefs || []).map(fd =>
      api.raw(`/permission-schemes/field-visibility/${fd.id}`)
        .then(r => r.json())
        .then(rows => (Array.isArray(rows) ? rows : []).map(row => ({ ...row, roleId: row.roleId || row.roleDefId })))
    ))
      .then(groups => setFieldVisibility(groups.flat()))
      .catch(reportError);
  }

  function saveFieldVisibility() {
    if (!newFieldVisForm.fieldDefId || !newFieldVisForm.roleId) { showToast('Select field and role', 'error'); return; }
    api.send(`/permission-schemes/field-visibility/${newFieldVisForm.fieldDefId}/${newFieldVisForm.roleId}`, {
      method: 'PUT', body: JSON.stringify({ visibility: newFieldVisForm.visibility })
    })
      .then(() => { showToast('Visibility saved'); fetchFieldVisibility(); setNewFieldVisForm({ fieldDefId: '', roleId: '', visibility: 'EDITABLE' }); })
      .catch(() => showToast('Failed to save visibility', 'error'));
  }

  function togglePermission(roleId, permission, currentlyGranted) {
    api.send(`/permission-schemes/permissions`, {
      method: 'POST', body: JSON.stringify({ roleId, permission, granted: !currentlyGranted })
    }).then(() => { showToast('Permission updated'); fetchPermMatrix(); })
      .catch(() => showToast('Failed to update permission', 'error'));
  }

  // ── Iteration 4 completions ──────────────────────────────────────────────────

  function fetchCrossProjectDeps() {
    api.raw(`/cross-project-dependencies`)
      .then(r => r.json()).then(d => setCrossProjectDeps(Array.isArray(d) ? d : [])).catch(reportError);
  }

  function createCrossProjectDep() {
    if (!crossProjForm.title) { showToast('Title is required', 'error'); return; }
    api.send(`/cross-project-dependencies`, {
      method: 'POST', body: JSON.stringify({ ...crossProjForm, workspaceId: activeWorkspaceId })
    }).then(() => {
      showToast('Cross-project dependency created');
      setIsCrossProjOpen(false);
      setCrossProjForm({ title: '', description: '', targetProjectId: '', deadline: '', isBlocker: false });
      fetchCrossProjectDeps();
    }).catch(() => showToast('Failed to create dependency', 'error'));
  }

  // ── Iteration 6 — Dashboards ─────────────────────────────────────────────────

  // ── Configurable Today — per-role layouts (slice 4) ──────────────────────────
  // Effective layout resolves personal → workspace template → built-in server-side; a null/empty
  // dashboard means "use the built-in default" (the frontend owns those constants).
  function fetchTodayLayout(role) {
    const wsId = activeWorkspaceId;
    if (!wsId || !role) return;
    api.raw(`/today-layouts/effective?workspaceId=${encodeURIComponent(wsId)}&role=${encodeURIComponent(role)}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        const widgets = d?.dashboard?.widgets?.length ? d.dashboard.widgets : null;
        setTodayLayout({ role, source: d?.source || 'builtin', widgets });
      })
      .catch(() => setTodayLayout({ role, source: 'builtin', widgets: null }));
  }

  function saveTodayLayout(role, layout) {
    api.send(`/today-layouts/personal`, {
      method: 'PUT',
      body: JSON.stringify({ workspaceId: activeWorkspaceId, role, widgets: layoutToWidgets(layout) }),
    })
      .then(() => { showToast('Today layout saved'); fetchTodayLayout(role); })
      .catch(() => showToast('Failed to save layout', 'error'));
  }

  function resetTodayLayout(role) {
    api.raw(`/today-layouts/personal?workspaceId=${encodeURIComponent(activeWorkspaceId)}&role=${encodeURIComponent(role)}`, { method: 'DELETE' })
      .then(() => { showToast('Reset to default'); fetchTodayLayout(role); })
      .catch(() => showToast('Failed to reset layout', 'error'));
  }

  // Save the workspace-wide default for a role (ADMIN+; enforced server-side). Applies to every
  // member who hasn't personalized their own Today for that role.
  function saveTodayTemplate(role, layout) {
    api.send(`/today-layouts/workspace-template`, {
      method: 'PUT',
      body: JSON.stringify({ workspaceId: activeWorkspaceId, role, widgets: layoutToWidgets(layout) }),
    })
      .then(() => { showToast(`Saved as the team default for ${role}`); fetchTodayLayout(role); })
      .catch((e) => showToast(e?.status === 403 ? 'Only admins can set the team default' : 'Failed to save team default', 'error'));
  }

  // ── Data-widget executor (slice 5) — metric / guided / BQL, one workspace-scoped path ───────
  function fetchWidgetMetrics() {
    if (!activeWorkspaceId) return;
    api.raw(`/widget-data/metrics?workspaceId=${encodeURIComponent(activeWorkspaceId)}`)
      .then(r => (r.ok ? r.json() : []))
      .then(d => setWidgetMetrics(Array.isArray(d) ? d : []))
      .catch(() => setWidgetMetrics([]));
  }

  // Batch-resolve a map of { widgetId → WidgetSource } → [{ id, data, error }] (one round trip).
  function fetchWidgetData(items) {
    return api.send(`/widget-data/batch`, {
      method: 'POST', body: JSON.stringify({ workspaceId: activeWorkspaceId, items }),
    });
  }

  // Resolve a single source for the picker's live preview → { shape, value|series|rows }.
  function previewWidgetData(source) {
    return api.send(`/widget-data/preview`, {
      method: 'POST', body: JSON.stringify({ workspaceId: activeWorkspaceId, source }),
    });
  }

  function fetchDashboard(role) {
    setDashLoading(true);
    fetchTodayLayout(role); // load the role's effective Today layout alongside its data
    if (!widgetMetrics.length) fetchWidgetMetrics(); // metric catalogue (once)
    const wsId = activeWorkspaceId;
    let url;
    if (role === 'developer') url = `/dashboards/developer?workspaceId=${encodeURIComponent(wsId)}`;
    else if (role === 'scrum-master') url = `/dashboards/scrum-master?workspaceId=${wsId}`;
    else if (role === 'product-owner') url = `/dashboards/product-owner?workspaceId=${wsId}`;
    else if (role === 'support-agent') url = `/dashboards/support-agent?workspaceId=${wsId}`;
    else if (role === 'executive') url = `/dashboards/executive?workspaceId=${wsId}`;
    else if (role === 'admin') url = `/dashboards/admin?workspaceId=${wsId}`;
    else { setDashLoading(false); return; }
    api.raw(url).then(r => r.json()).then(d => {
      if (role === 'developer') setDeveloperDash(d);
      else if (role === 'scrum-master') setSmDash(d);
      else if (role === 'product-owner') setPoDash(d);
      else if (role === 'support-agent') setSupportDash(d);
      else if (role === 'executive') setExecDash(d);
      else if (role === 'admin') setAdminDash(d);
      setDashLoading(false);
    }).catch(() => setDashLoading(false));
  }

  // ── Iteration 6 — Releases ────────────────────────────────────────────────────

  function fetchReleases(projectId) {
    const url = projectId ? `/releases?projectId=${projectId}` : `/releases`;
    api.raw(url).then(r => r.json()).then(d => setReleases(Array.isArray(d) ? d : [])).catch(reportError);
  }

  function fetchReleaseItems(releaseId) {
    api.raw(`/releases/${releaseId}/items`).then(r => r.json()).then(d => setReleaseItems(Array.isArray(d) ? d : [])).catch(reportError);
  }

  function createRelease() {
    if (!newRelease.name || !newRelease.version) { showToast('Name and version are required', 'error'); return; }
    api.send(`/releases`, { method: 'POST', body: JSON.stringify({ ...newRelease, workspaceId: activeWorkspaceId }) })
      .then(() => { showToast('Release created'); setIsReleaseOpen(false); setNewRelease({ name: '', version: '', description: '', releaseDate: '', projectId: '', status: 'PLANNED' }); fetchReleases(); })
      .catch(() => showToast('Failed to create release', 'error'));
  }

  function updateRelease(id, patch) {
    api.send(`/releases/${id}`, { method: 'PUT', body: JSON.stringify(patch) })
      .then(d => { setSelectedRelease(d); showToast('Release updated'); fetchReleases(); })
      .catch(() => showToast('Failed to update release', 'error'));
  }

  function deleteRelease(id) {
    api.send(`/releases/${id}`, { method: 'DELETE' })
      .then(() => { showToast('Release deleted'); setSelectedRelease(null); setReleaseItems([]); fetchReleases(); })
      .catch(() => showToast('Failed to delete release', 'error'));
  }

  function addItemToRelease(releaseId, workItemId) {
    api.send(`/releases/${releaseId}/items/${workItemId}`, { method: 'POST' })
      .then(() => { showToast('Item added to release'); fetchReleaseItems(releaseId); })
      .catch(() => showToast('Failed to add item', 'error'));
  }

  function removeItemFromRelease(releaseId, workItemId) {
    api.send(`/releases/${releaseId}/items/${workItemId}`, { method: 'DELETE' })
      .then(() => { showToast('Item removed'); fetchReleaseItems(releaseId); })
      .catch(() => showToast('Failed to remove item', 'error'));
  }

  // ── Iteration 15 — Scrum Master Cockpit (Cap V) ──────────────────────────────
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
    api.raw(`/cockpit/digest?workspaceId=${activeWorkspaceId}&projectId=${pid}`).then(r => r.json())
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, projects, i15ProjectId, activeWorkspaceId]);

  function clusterRetro() {
    if (!activeRetro?.session?.id) return;
    api.send(`/cockpit/retro-cluster?workspaceId=${activeWorkspaceId}`, { method: 'POST', body: JSON.stringify({ retroId: activeRetro.session.id }) })
      .then(d => { setRetroClusters(d && Array.isArray(d.themes) ? d : null); if (d?.meta?.fallback) showToast('Retro clustering used fallback (keyword themes).', 'info'); })
      .catch(() => showToast('Retro clustering failed', 'error'));
  }
  function fetchMyDay(pid) {
    api.raw(`/cockpit/my-day?projectId=${pid}`).then(r => r.json())
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
    api.raw(`/cockpit/context?projectId=${pid}`).then(r => r.json())
      .then(d => setCockpitContext(d && d.roleKey ? d : null)).catch(() => setCockpitContext(null));
  }
  function fetchCeremonies(pid) {
    api.raw(`/ceremonies?projectId=${pid}`).then(r => r.json())
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
    api.raw(`/ceremonies/${id}`).then(r => r.json()).then(d => setActiveCeremony(d)).catch(reportError);
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
    api.raw(`/impediments?projectId=${pid}`).then(r => r.json())
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
    api.raw(`/standups?projectId=${pid}`).then(r => r.json())
      .then(d => setStandups(Array.isArray(d) ? d : [])).catch(() => setStandups([]));
  }
  function startStandup() {
    const memberIds = (workspaceMembers.length ? workspaceMembers : users).map(m => m.id).filter(Boolean);
    api.send(`/standups?`, { method: 'POST', body: JSON.stringify({ projectId: i15ProjectId, memberIds }) })
      .then(d => { setActiveStandup(d); fetchStandups(i15ProjectId); showToast('Standup started'); })
      .catch(() => showToast('Failed to start standup', 'error'));
  }
  function openStandup(id) {
    api.raw(`/standups/${id}`).then(r => r.json()).then(d => setActiveStandup(d)).catch(reportError);
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
    api.raw(`/retros?projectId=${pid}`).then(r => r.json())
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
    api.raw(`/retros/${id}`).then(r => r.json()).then(d => setActiveRetro(d)).catch(reportError);
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
    api.raw(`/cockpit/capacity?workspaceId=${activeWorkspaceId}&sprintId=${sprintId}`).then(r => r.json())
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
    api.raw(`/cockpit/risk-panel?workspaceId=${activeWorkspaceId}&sprintId=${sprintId}`).then(r => r.json())
      .then(d => setRiskPanel(d)).catch(() => showToast('Risk panel failed', 'error'))
      .finally(() => setTabLoading('risk', false));
  }
  function runVariance(sprintId = varianceSprintId) {
    if (!sprintId) { showToast('Select a sprint', 'error'); return; }
    setVarianceSprintId(sprintId);
    setTabLoading('variance', true);
    api.raw(`/cockpit/variance?workspaceId=${activeWorkspaceId}&sprintId=${sprintId}`).then(r => r.json())
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

  // ── Iteration 15 — Product Owner Workspace (Cap W) ───────────────────────────
  function openPoWorkspace() {
    setView('poworkspace');
    const pid = i15ProjectId || (projects[0] && projects[0].id) || '';
    setI15ProjectId(pid);
    fetchRoadmapThemes(); fetchIdeas(); fetchFeedback(); fetchObjectives();
  }
  function fetchRoadmapThemes() {
    api.raw(`/roadmap-themes?workspaceId=${activeWorkspaceId}`).then(r => r.json())
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
    api.raw(`/ideas?workspaceId=${activeWorkspaceId}`).then(r => r.json())
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
    api.raw(`/customer-feedback?workspaceId=${activeWorkspaceId}`).then(r => r.json())
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
    api.raw(`/objectives?workspaceId=${activeWorkspaceId}`).then(r => r.json())
      .then(d => setObjectives(Array.isArray(d) ? d : [])).catch(() => setObjectives([]));
  }
  function createObjective() {
    if (!newObjective.title.trim()) { showToast('Title is required', 'error'); return; }
    api.send(`/objectives`, { method: 'POST', body: JSON.stringify({ ...newObjective, workspaceId: activeWorkspaceId, projectId: i15ProjectId || null }) })
      .then(() => { showToast('Objective created'); setNewObjective({ title: '', level: 'TEAM', quarter: '' }); fetchObjectives(); })
      .catch(() => showToast('Failed to create objective', 'error'));
  }
  function openObjective(id) {
    api.raw(`/objectives/${id}`).then(r => r.json()).then(d => setActiveObjective(d)).catch(reportError);
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

  function logWork() {
    if (!worklogForm.timeSpentMinutes || !selectedItem?.id) { showToast('Time and work item required', 'error'); return; }
    const date = worklogForm.workDate || new Date().toISOString().split('T')[0];
    api.send(`/worklogs`, { method: 'POST', body: JSON.stringify({ ...worklogForm, workDate: date, workItemId: selectedItem.id }) })
      .then(() => { showToast('Time logged'); setIsWorklogOpen(false); setWorklogForm({ timeSpentMinutes: 30, description: '', workDate: '' }); })
      .catch(() => showToast('Failed to log time', 'error'));
  }

  function fetchTrash() {
    api.raw(`/work-items/trash`)
      .then(r => r.json()).then(d => setTrashItems(Array.isArray(d) ? d : [])).catch(reportError);
  }

  function restoreFromTrash(id) {
    api.send(`/work-items/${id}/restore`, { method: 'PUT' })
      .then(item => {
        setTrashItems(prev => prev.filter(i => i.id !== id));
        setWorkItems(prev => [...prev, item]);
        showToast('Item restored from trash');
      }).catch(err => showToast(err.message, 'error'));
  }

  async function permanentDelete(id) {
    const ok = await confirm({ title: 'Permanently delete', message: 'This work item will be permanently deleted. This cannot be undone.', confirmLabel: 'Delete permanently', variant: 'danger' });
    if (!ok) return;
    api.send(`/work-items/${id}/permanent`, { method: 'DELETE' })
      .then(() => { setTrashItems(prev => prev.filter(i => i.id !== id)); showToast('Permanently deleted'); })
      .catch(err => showToast(err.message, 'error'));
  }

  function toggleStar(item) {
    const isStarred = item.starred;
    const method = isStarred ? 'DELETE' : 'POST';
    api.raw(`/work-items/${item.id}/star`, { method, headers: headers() })
      .then(r => r.json()).then(() => {
        setWorkItems(prev => prev.map(i => i.id === item.id ? { ...i, starred: !isStarred } : i));
        if (selectedItem?.id === item.id) setSelectedItem(prev => ({ ...prev, starred: !isStarred }));
      }).catch(reportError);
  }

  function fetchProjectMembers(projectId) {
    setSelectedProjectId(projectId);
    api.raw(`/workspaces/${activeWorkspaceId}/projects/${projectId}/members`)
      .then(r => r.json()).then(d => setProjectMembers(Array.isArray(d) ? d : [])).catch(reportError);
  }

  function addProjectMember(projectId) {
    if (!projectMemberEmail.trim()) return;
    api.send(`/workspaces/${activeWorkspaceId}/projects/${projectId}/members`, {
      method: 'POST', body: JSON.stringify({ email: projectMemberEmail, role: 'MEMBER' })
    }).then(d => {
      setProjectMemberMsg(d.message || 'Added!');
      setProjectMemberEmail('');
      fetchProjectMembers(projectId);
    }).catch(err => setProjectMemberMsg(err.message || 'Error'));
  }

  function addReply(workItemId, parentId) {
    if (!replyBody.trim()) return;
    api.raw(`/work-items/${workItemId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body: replyBody, isInternal: false, parentId })
    }).then(r => r.json()).then(c => {
      setComments(prev => prev.map(cm =>
        cm.id === parentId ? { ...cm, replies: [...(cm.replies || []), { ...c, authorName: currentUser.fullName }] } : cm
      ));
      setReplyBody(''); setReplyingTo(null);
    }).catch(reportError);
  }

  const handleCreateSprint = () => {
    api.raw(`/sprints`, { method: 'POST', body: JSON.stringify({ ...newSprint, projectId: 'PROJ-WORKS' }) })
      .then(r => r.json()).then(s => {
        setSprints(prev => [s, ...prev]);
        setNewSprint({ name: '', goal: '', startDate: '', endDate: '', capacity: 40 });
        setIsSprintOpen(false);
        if (!activeSprint) { setActiveSprint(s); }
      });
  };
  const handleSprintStatusChange = (sprintId, newStatus) => {
    const sprint = sprints.find(s => s.id === sprintId);
    if (!sprint) return;
    api.raw(`/sprints/${sprintId}`, { method: 'PUT', body: JSON.stringify({ ...sprint, status: newStatus }) })
      .then(r => r.json()).then(updated => {
        setSprints(prev => prev.map(s => s.id === updated.id ? updated : s));
        if (activeSprint?.id === updated.id) setActiveSprint(updated);
      });
  };
  const handleMoveToSprint = (itemId, sprintId) => {
    api.raw(`/sprints/${sprintId}/items/${itemId}`, { method: 'POST', headers: headers() })
      .then(() => { fetchBacklog(); if (activeSprint) fetchSprintItems(activeSprint.id); });
  };
  const handleMoveToBacklog = (itemId, sprintId) => {
    api.raw(`/sprints/${sprintId}/items/${itemId}`, { method: 'DELETE', headers: headers() })
      .then(() => { fetchBacklog(); fetchSprintItems(sprintId); });
  };

  // Backlog drag-drop reorder
  const handleBacklogDragStart = (e, id) => { e.dataTransfer.setData('backlogId', id); };
  const handleBacklogDrop = (e, targetId) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('backlogId');
    if (!sourceId || sourceId === targetId) { setDragOverId(null); return; }
    const items = [...backlogItems];
    const sourceIdx = items.findIndex(i => i.id === sourceId);
    const targetIdx = items.findIndex(i => i.id === targetId);
    const [moved] = items.splice(sourceIdx, 1);
    items.splice(targetIdx, 0, moved);
    const reordered = items.map((item, idx) => ({ ...item, backlogOrder: idx }));
    setBacklogItems(reordered);
    setDragOverId(null);
    api.raw(`/work-items/backlog/reorder`, {
      method: 'PUT',
      body: JSON.stringify(reordered.map((i, idx) => ({ id: i.id, order: idx })))
    }).catch(reportError);
  };

  // Inline refinement update (story points, priority)
  const handleRefinementUpdate = (itemId, field, value) => {
    const item = backlogItems.find(i => i.id === itemId);
    if (!item) return;
    const updated = { ...item, [field]: value };
    setBacklogItems(prev => prev.map(i => i.id === itemId ? updated : i));
    api.raw(`/work-items/${itemId}`, { method: 'PUT', body: JSON.stringify(updated) })
      .then(r => { if (r.status === 409) { showToast('That item changed elsewhere — refreshing', 'error'); fetchBacklog(); } })
      .catch(reportError);
  };

  const handleSaveFilter = () => {
    if (!saveFilterName.trim()) return;
    api.raw(`/saved-filters?workspaceId=${encodeURIComponent(activeWorkspaceId)}`, {
      method: 'POST',
      body: JSON.stringify({ name: saveFilterName, filterJson: JSON.stringify(sprintFilters), isShared: false })
    }).then(r => r.json()).then(f => { setSavedFilters(prev => [...prev, f]); setSaveFilterName(''); setShowSaveFilter(false); });
  };

  // Filter + sort the sprint board with the shared Deliver model (replaces the old quick-filter chips).
  const applyFilter = (items) => sortItems(filterItems(items, sprintFilters, currentUser?.id), sprintSort);

  // LINKS
  const handleAddLink = () => {
    if (!newLink.targetId) return;
    api.raw(`/work-items/${selectedItem.id}/links`, {
      method: 'POST', body: JSON.stringify(newLink)
    }).then(r => r.json()).then(l => { setLinks(prev => [...prev, l]); setNewLink({ targetId: '', linkType: 'RELATES_TO' }); });
  };
  const handleDeleteLink = (linkId) => {
    api.raw(`/work-items/${selectedItem.id}/links/${linkId}`, { method: 'DELETE', headers: headers() })
      .then(() => setLinks(prev => prev.filter(l => l.id !== linkId)));
  };
  // Create a typed link to a searched item (BLOCKS / RELATES_TO / DUPLICATES …).
  const handleCreateLink = (targetId, linkType) => {
    if (!targetId || !selectedItem) return;
    api.raw(`/work-items/${selectedItem.id}/links`, { method: 'POST', body: JSON.stringify({ targetId, linkType }) })
      .then(r => r.json()).then(l => setLinks(prev => [...prev, l])).catch(reportError);
  };

  // ── Hierarchy (parent/child) — uses the parent-only endpoint (no field clobbering) ──
  const handleSetParent = (parentId) => {
    if (!selectedItem) return;
    api.send(`/work-items/${selectedItem.id}/parent`, { method: 'PUT', body: { parentId: parentId || '' } })
      .then(saved => { setSelectedItem(saved); setWorkItems(prev => prev.map(i => i.id === saved.id ? { ...i, ...saved } : i)); })
      .catch(err => showToast(err.message || 'Could not set parent', 'error'));
  };
  const handleAddChild = (child) => {
    if (!selectedItem || !child) return;
    api.send(`/work-items/${child.id}/parent`, { method: 'PUT', body: { parentId: selectedItem.id } })
      .then(saved => {
        setItemChildren(prev => [...prev.filter(c => c.id !== saved.id), saved]);
        setWorkItems(prev => prev.map(i => i.id === saved.id ? { ...i, ...saved } : i));
      })
      .catch(err => showToast(err.message || 'Could not add child', 'error'));
  };
  const handleRemoveChild = (childId) => {
    api.send(`/work-items/${childId}/parent`, { method: 'PUT', body: { parentId: '' } })
      .then(() => setItemChildren(prev => prev.filter(c => c.id !== childId)))
      .catch(err => showToast(err.message || 'Could not remove child', 'error'));
  };

  // ATTACHMENTS
  const MAX_UPLOAD_MB = 20; // must match app.attachments.max-size-bytes / 1024 / 1024
  const handleUploadFile = (e) => {
    const file = e.target.files[0]; if (!file) return;
    // Client-side size guard (mirrors server limit)
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      showToast(`File too large — max ${MAX_UPLOAD_MB} MB`, 'error'); return;
    }
    const fd = new FormData(); fd.append('file', file);
    api.raw(`/work-items/${selectedItem.id}/attachments`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: fd
    }).then(async res => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = {
          413: `File too large (max ${MAX_UPLOAD_MB} MB)`,
          415: 'File type not permitted',
          422: 'File rejected by virus scanner',
        }[res.status] || (err.message || `Upload failed (${res.status})`);
        showToast(msg, 'error');
        return null;
      }
      return res.json();
    }).then(a => { if (a) setAttachments(prev => [a, ...prev]); });
  };
  const handleDeleteAttachment = (attId) => {
    api.raw(`/work-items/${selectedItem.id}/attachments/${attId}`, { method: 'DELETE', headers: headers() })
      .then(() => setAttachments(prev => prev.filter(a => a.id !== attId)));
  };
  // Attach an external link (URL / webpage) — refetches so the new row carries server fields.
  const handleAttachLink = (url, title) =>
    api.send(`/work-items/${selectedItem.id}/attachments/link`, { method: 'POST', body: { url, title } })
      .then(() => api.raw(`/work-items/${selectedItem.id}/attachments`, { headers: headers() })
        .then(r => r.json()).then(d => setAttachments(Array.isArray(d) ? d : [])));

  // PROJECT ARCHIVE
  const handleArchiveProject = (projectId) => {
    api.raw(`/projects/${projectId}/archive`, { method: 'PUT', headers: headers() })
      .then(r => r.json()).then(p => setProjects(prev => prev.map(x => x.id === p.id ? p : x)));
  };

  // Map workflow category → dot-color token so board column headers are category-colored.
  const CATEGORY_DOT = { TO_DO: 'bg-neutral-400', IN_PROGRESS: 'bg-brand-navy-tint', DONE: 'bg-semantic-success' };
  // Map workflow category → WIP limit key (for backward compatibility with wipLimits).
  const CATEGORY_LIMIT_KEY = { TO_DO: 'todoLimit', IN_PROGRESS: 'inProgressLimit', DONE: 'doneLimit' };
  // Derive board columns from the active workflow statuses; fall back to three fixed category columns.
  const FALLBACK_COLUMNS = [
    { name: 'Todo',        category: 'TO_DO',       dot: 'bg-neutral-400',     limitKey: 'todoLimit' },
    { name: 'In Progress', category: 'IN_PROGRESS', dot: 'bg-brand-navy-tint',  limitKey: 'inProgressLimit' },
    { name: 'Done',        category: 'DONE',        dot: 'bg-semantic-success', limitKey: 'doneLimit' },
  ];
  const columns = boardColumns
    ? boardColumns.map(s => ({
        name:     s.name,
        category: s.category,
        dot:      CATEGORY_DOT[s.category] || 'bg-neutral-400',
        color:    s.color || null,
        limitKey: CATEGORY_LIMIT_KEY[s.category] || 'todoLimit',
      }))
    : FALLBACK_COLUMNS;

  // densityPad moved to board-view.jsx (TD-003)
  const userName = u => users.find(x => x.id === u)?.fullName || '';

  // Public share/embed routes short-circuit before authentication.
  const publicPath = /^\/(?:p\/|embed\/(?:article|dashboard)\/)/.test(window.location.pathname)
    || new URLSearchParams(window.location.search).has('share');
  if (publicPath) return <PublicRoutes />;
  // Authentication is isolated; the product shell mounts only after a session exists.
  if (!currentUser) {
    return <AuthScreens api={api} onLogin={handleLogin} showToast={showToast} />;
  }
  // ==========================================
  // MAIN APP
  // ==========================================

  // One dispatcher for nav — preserves each destination's exact load side-effects (the data each
  // view needs) while the rail/sub-rail markup stays data-driven (lib/nav-model MODES).
  const navigate = (id) => {
    setView(id);
    setMobileNavOpen(false); // close the mobile drawer on any navigation (G1)
    // Per-view load side-effects only — setView is hoisted above; views with no extra fetch
    // (board, sla, performance, automations, integrations, projects) fall through to default.
    switch (id) {
      case 'dashboard': fetchDashboard(dashboardRole); break;
      case 'myworks': fetchNotifications(); break;
      case 'notifications': fetchNotifications(); break;
      case 'backlog': fetchBacklog(); fetchSprints(); fetchSavedFilters(); break;
      case 'board':  fetchActiveWorkflow(selectedProjectId || undefined); break;
      case 'sprint': fetchSprints(); fetchSavedFilters(); fetchActiveWorkflow(selectedProjectId || undefined); break;
      case 'reports': fetchSprints(); fetchVelocityData(); break;
      case 'dashboards': setSelectedDashboard(null); fetchCustomDashboards(); fetchTeams(); break;
      case 'reportbuilder': setSelectedReport(null); fetchReports(); fetchReportTemplates(); break;
      case 'releases': fetchReleases(); break;
      case 'settings3': fetchWorkflows(); fetchFieldDefs(); fetchRoles(); fetchWorkItemTypes(); break;
      case 'knowledge': fetchKnowledgeSpaces(); setKnowledgeTab('spaces'); setSelectedSpace(null); setSelectedArticle(null); break;
      case 'compliance': setComplianceTab('dashboard'); setRuleBuilder(null); fetchComplianceDashboard(); fetchComplianceRules(); fetchComplianceViolations(); break;
      case 'service': setServiceTab('queues'); setServiceQueue('open'); fetchServiceRequests('open'); break;
      case 'pm': if (projects.length) { const pid = projects[0].id; setPmProjectId(pid); fetchRaidDashboard(pid); fetchRisks(pid); fetchAssumptions(pid); fetchPmIssues(pid); fetchDependencies(pid); fetchDecisions(pid); fetchMeetings(pid); fetchActionItems(pid); fetchStakeholders(pid); fetchLessons(pid); } break;
      case 'smcockpit': openCockpit(); break;
      case 'poworkspace': openPoWorkspace(); break;
      case 'account': fetchNotifPrefs(); break;
      case 'workspace': fetchMembers(); fetchNotifPrefs(); fetchBranding(); break;
      case 'trash': fetchTrash(); break;
      case 'projects': fetchProjectMetrics(projects); break;
      default: break;
    }
  };
  navigateRef.current = navigate; // keep the global shortcut handler pointed at the latest navigate

  // Enter "preview as role" (Admin/Owner only): reduce the nav to that role's tier + emphasis,
  // retune the role-tuned "Today" dashboard, and jump to the role's cockpit.
  const selectLens = (lensId) => {
    const l = LENSES.find((x) => x.id === lensId) || LENSES[0];
    setLens(l.id);
    setLensOpen(false);
    setDashboardRole(l.role);
    navigate(l.view);
    showToast(`Previewing as ${l.label}`);
  };
  const exitPreview = () => { setLens(null); setLensOpen(false); showToast('Exited role preview'); };

  // The user's real, server-authoritative visibility (surface list when present, else tier).
  const realVisibility = { tier: userRole.tier, surfaces: userRole.surfaces };
  // Only Admin/Owner can preview; for them an active lens reduces the nav to that role's tier.
  const activeLens = userRole.tier >= TIER.ADMIN && lens ? LENSES.find((x) => x.id === lens) : null;
  const previewing = Boolean(activeLens);
  const visibility = previewing ? activeLens.previewTier : realVisibility;
  const primarySurfaces = previewing ? primarySurfacesFor(activeLens.id) : null;

  const activeMode = modeForView(view);
  // When the current view isn't pinned to its mode's sub-rail (a lens cockpit or the BQL chip),
  // surface it as a highlighted orientation row so the nav still shows "where am I?".
  const activeExtra = getMode(activeMode).surfaces.some((s) => s.id === view)
    ? null
    : { id: view, label: labelForView(view), tag: LENSES.some((l) => l.view === view) ? 'Lens' : null };

  // Commands for the Cmd-K palette: every destination + a couple of quick actions.
  // Offline-draft sync result handler (iteration 18, Cap S). APPLIED drafts are already dropped by
  // syncDrafts; any CONFLICT is surfaced in the conflict-resolution UI, pairing the server state with
  // the still-queued local draft.
  function handleSynced(res) {
    const queued = pendingDrafts();
    const conflicting = (res?.results || [])
      .filter(r => r.result === 'CONFLICT')
      .map(r => ({ id: r.id, server: r.server, draft: queued.find(d => d.id === r.id) || {} }));
    if (conflicting.length) setConflicts(conflicting);
  }

  // Resolve one sync conflict: keep mine (re-queue against the server's new version, then re-sync) or
  // keep theirs (discard the local draft).
  async function resolveConflict(c, choice) {
    if (choice === 'mine' && c.draft?.id) {
      removeDraft(c.id);
      queueDraft({ ...c.draft, baseVersion: c.server?.version });
      try { await syncDrafts(); } catch { /* stays queued for the next attempt */ }
    } else {
      removeDraft(c.id);
    }
    setConflicts(prev => prev.filter(x => x.id !== c.id));
  }

  // Command-palette server search (iteration 18, Cap S): items + people, workspace-scoped, mapped to
  // runnable palette commands. Selecting an item opens it; selecting a person filters to their work.
  async function commandSearch(q) {
    if (!activeWorkspaceId) return [];
    try {
      const res = await api.send(
        `/command-palette/search?workspaceId=${encodeURIComponent(activeWorkspaceId)}&q=${encodeURIComponent(q)}`,
      );
      const items = (res.items || []).map(it => ({
        id: `item-${it.id}`, label: `${it.id} · ${it.title}`, group: 'Items', Icon: ListTodo,
        run: () => { setSelectedItem({ id: it.id, title: it.title, type: it.type, status: it.status }); },
      }));
      const people = (res.people || []).map(p => ({
        id: `person-${p.id}`, label: p.full_name || p.email, group: 'People', Icon: User,
        run: () => { setView('myworks'); },
      }));
      return [...items, ...people];
    } catch {
      return [];
    }
  }

  const paletteCommands = [
    // Only offer "go to" jumps for surfaces the current visibility allows, so ⌘K matches the rail
    // (a Member can't palette-jump to Admin Ops). Server RBAC still governs the actual data.
    ...navDestinations()
      .filter(d => allowed(d.id, visibility))
      .map(d => ({
        id: `go-${d.id}`,
        label: d.labelKey ? t(d.labelKey) : d.label,
        group: d.groupKey ? t(d.groupKey) : d.group,
        Icon: d.Icon,
        run: () => navigate(d.id),
      })),
    { id: 'act-create', label: 'Create work item', group: 'Action', Icon: ListTodo, keywords: ['new', 'add'],
      run: () => { setView('board'); setIsCreateOpen(true); } },
    { id: 'act-search', label: 'Search work items', group: 'Action', Icon: Search, keywords: ['find'],
      run: () => setPaletteOpen(true) },
    { id: 'act-search-all', label: 'Search everything', group: 'Action', Icon: Search, keywords: ['find', 'articles', 'full text'],
      run: () => navigate('search') },
    { id: 'act-status', label: 'System status', group: 'Action', Icon: Activity, keywords: ['health', 'uptime', 'observability'],
      run: () => setOverlay('status') },
    { id: 'act-push', label: 'Notification preferences', group: 'Action', Icon: BellRing, keywords: ['push', 'quiet hours', 'snooze'],
      run: () => setOverlay('push') },
    { id: 'act-shortcuts', label: 'Keyboard shortcuts', group: 'Action', Icon: Keyboard, keywords: ['keys', 'help'],
      run: () => setShortcutsHelpOpen(true) },
  ];

  return (
    <div className="flex flex-col h-screen bg-neutral-50 dark:bg-neutral-900 font-sans text-neutral-900 dark:text-neutral-100">

      {/* SHELL — full-width navy topbar spans the top; the two-tier nav (mode-rail + sub-rail)
          and the scrollable content sit in a row beneath it (redesign mockup). */}
      <main className="flex-1 flex flex-col min-w-0 min-h-0 dark:bg-neutral-900">
        {/* OFFLINE / SYNC STATUS BAR (iteration 18, Cap S) */}
        <OfflineBanner onSynced={handleSynced} />
        {/* TOPBAR — navy three-zone command bar (redesign mockup):
              left  = brand + workspace switcher + BQL chip
              center= command-palette intent pill (⌘K)
              right = role lens + Ask AI + create + notifications + account */}
        <header className="h-14 bg-brand-navy border-b border-white/10 grid grid-cols-[auto_1fr_auto] items-center gap-3 px-3 md:px-4 flex-shrink-0 relative z-sticky">
          {/* LEFT */}
          <div className="flex items-center gap-2 min-w-0 justify-self-start">
            <button
              type="button"
              aria-label="Open navigation"
              aria-expanded={mobileNavOpen}
              onClick={() => setMobileNavOpen(true)}
              className="md:hidden -ml-1 p-1.5 rounded-md text-white/80 hover:bg-white/10 transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40">
              <PanelLeft aria-hidden="true" className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Go to home dashboard"
              onClick={() => navigate('dashboard')}
              className="flex items-center shrink-0 select-none p-0.5 rounded-md hover:bg-white/10 transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              {branding?.logoUrl ? (
                <img src={branding.logoUrl} alt="Workspace Logo" className="h-6 max-w-24 object-contain" />
              ) : (
                <Logo size="lg" variant="reverse" />
              )}
            </button>

            {/* Workspace switcher chip */}
            <div className="relative shrink-0" ref={wsRef}>
              <button
                type="button"
                onClick={() => setWsOpen(o => !o)}
                aria-haspopup="menu"
                aria-expanded={wsOpen}
                aria-label="Switch workspace"
                className="hidden sm:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-semibold text-white bg-white/10 border border-white/15 hover:bg-white/15 transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40">
                <span className="max-w-32 truncate">{workspace.name}</span>
                <ChevronDown aria-hidden="true" className="h-3.5 w-3.5 text-white/60" />
              </button>
              {wsOpen && (
                <div className="absolute left-0 top-full mt-1 w-60 rounded-lg border border-neutral-200 bg-white py-1 text-neutral-900 shadow-xl z-dropdown dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100">
                  <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">Workspaces</p>
                  {wsLoading ? (
                    <div className="space-y-2 px-3 py-2">
                      <div className="h-7 animate-pulse rounded-md bg-neutral-100 dark:bg-neutral-700" />
                      <div className="h-7 animate-pulse rounded-md bg-neutral-100 dark:bg-neutral-700" />
                    </div>
                  ) : wsError ? (
                    <div className="px-3 py-3">
                      <p className="mb-2 text-xs text-semantic-danger">Couldn’t load your workspaces.</p>
                      <button type="button" onClick={fetchMyWorkspaces} className="text-xs font-medium text-brand-navy hover:text-brand-navy-tint dark:text-neutral-200">Try again</button>
                    </div>
                  ) : workspaces.length === 0 ? (
                    <p className="px-3 py-3 text-xs text-neutral-400">You don’t belong to any workspace yet.</p>
                  ) : (
                    workspaces.map(w => {
                      const isActive = w.id === activeWorkspaceId;
                      return (
                        <button key={w.id} type="button" onClick={() => switchWorkspace(w.id)}
                          aria-current={isActive ? 'true' : undefined}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left outline-none hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 dark:hover:bg-neutral-700">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-brand-navy text-xs font-bold text-white">{(w.name || '?').slice(0, 1).toUpperCase()}</span>
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">{w.name}</span>
                          {isActive && <Check aria-hidden="true" className="h-4 w-4 shrink-0 text-brand-orange" />}
                        </button>
                      );
                    })
                  )}
                  {allowed('workspace', visibility) && (
                    <div className="mt-1 border-t border-neutral-100 pt-1 dark:border-neutral-700">
                      <button type="button" onClick={() => { setWsOpen(false); navigate('workspace'); }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-neutral-500 hover:bg-neutral-50 hover:text-brand-navy dark:hover:bg-neutral-700">
                        <Settings aria-hidden="true" className="h-3.5 w-3.5 shrink-0" /> Workspace settings
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* BQL chip — hidden when the current visibility can't use it (matches rail) */}
            {allowed('bql', visibility) && (
            <button
              type="button"
              onClick={() => navigate('bql')}
              aria-label="Open BQL query"
              className="hidden md:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-semibold text-white bg-white/10 border border-white/15 hover:bg-white/15 transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40">
              <Code aria-hidden="true" className="h-3.5 w-3.5 text-white/70" /> BQL
            </button>
            )}
            <MoreMenu activeView={view} visibility={visibility} onNavigate={navigate} />
          </div>

          {/* CENTER — command-palette intent pill (fills all space between left and right zones) */}
          <div className="flex justify-center px-2 min-w-0">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label="Search, create, or ask anything"
              className="flex items-center gap-2.5 h-9 w-full max-w-3xl px-3 rounded-lg bg-white text-left shadow-sm hover:shadow-md transition-shadow duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50">
              <Search aria-hidden="true" className="h-4 w-4 text-neutral-500 shrink-0" />
              <span className="flex-1 truncate text-sm text-neutral-400">Search, create, or ask anything…</span>
              <kbd className="hidden sm:inline text-xs font-mono bg-neutral-100 rounded px-1.5 py-0.5 border border-neutral-200 text-neutral-600">⌘K</kbd>
            </button>
          </div>

          {/* RIGHT */}
          <div className="flex items-center gap-1.5 justify-self-end">
            {/* Live co-presence — who else is in this workspace (iteration 18, Cap S) */}
            <div className="hidden lg:flex"><PresenceBar present={presence} currentUserId={currentUser?.id} /></div>

            {/* Role lens — Admin/Owner only: opt-in "preview as role" that reduces the nav to that
                role's tier + stars its key surfaces. NOT access control — server RBAC governs. */}
            {userRole.tier >= TIER.ADMIN && (
            <div className="relative shrink-0" ref={lensRef}>
              <button
                type="button"
                onClick={() => setLensOpen(o => !o)}
                aria-haspopup="menu"
                aria-expanded={lensOpen}
                aria-label={previewing ? `Previewing as ${activeLens.label}. Open role preview menu` : 'Preview as role'}
                className={`hidden sm:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-semibold border transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${previewing ? 'bg-brand-orange/25 border-brand-orange/50 text-white' : 'bg-white/10 border-white/15 text-white hover:bg-white/15'}`}>
                {previewing && <Eye aria-hidden="true" className="h-3.5 w-3.5 text-brand-orange" />}
                <span className="max-w-28 truncate">{previewing ? activeLens.label : 'View as'}</span>
                <ChevronDown aria-hidden="true" className="h-3.5 w-3.5 text-white/60" />
              </button>
              {lensOpen && (
                <div className="absolute right-0 top-full mt-1 w-60 rounded-lg border border-neutral-200 bg-white py-1 text-neutral-900 shadow-xl z-dropdown dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100">
                  <p className="px-3 pt-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">Preview as role</p>
                  <p className="px-3 pb-2 pt-0.5 text-xs text-neutral-400">Reduces the nav to that role · doesn’t change your permissions</p>
                  {LENSES.map(l => {
                    const isActive = previewing && l.id === lens;
                    return (
                      <button key={l.id} type="button" onClick={() => selectLens(l.id)}
                        aria-current={isActive ? 'true' : undefined}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm outline-none hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 dark:hover:bg-neutral-700">
                        <span className="min-w-0 flex-1 truncate">{l.label}</span>
                        {isActive && <Check aria-hidden="true" className="h-4 w-4 shrink-0 text-brand-orange" />}
                      </button>
                    );
                  })}
                  {previewing && (
                    <div className="mt-1 border-t border-neutral-100 pt-1 dark:border-neutral-700">
                      <button type="button" onClick={exitPreview}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-neutral-500 hover:bg-neutral-50 hover:text-brand-navy dark:hover:bg-neutral-700">
                        <X aria-hidden="true" className="h-3.5 w-3.5 shrink-0" /> Exit preview
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            )}

            <AiCommandBar
              workspaceId={activeWorkspaceId}
              onToast={showToast}
              onExecuted={() => { fetchAll(); fetchNotifications(); }}
            />
            {can('create_items') && (
              <Button variant="action" className="hidden md:inline-flex" onClick={() => { setView('board'); setIsCreateOpen(true); }}>
                + Create
              </Button>
            )}
            <button onClick={() => { navigate('notifications'); }}
              aria-label={unreadCount > 0 ? `Inbox, ${unreadCount} actionable` : 'Inbox'}
              className="relative w-9 h-9 rounded-md flex items-center justify-center text-white/80 hover:bg-white/10 transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40">
              <Bell aria-hidden="true" className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-brand-orange text-white text-xs font-bold flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <UserMenu
              user={currentUser}
              role={userRole.role}
              darkMode={darkMode}
              onToggleTheme={() => setDarkMode(d => !d)}
              onOpenSettings={() => navigate('account')}
              onLogout={handleLogout}
            />
          </div>
        </header>

        {/* NAV + CONTENT ROW — two-tier nav on the left, scrollable deck on the right.
            Desktop (md+): nav static, in-flow. Mobile (<md): off-canvas drawer + backdrop (G1). */}
        <div className="flex flex-1 min-h-0">
          {mobileNavOpen && (
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setMobileNavOpen(false)}
              className="fixed inset-0 z-modal bg-black/40 md:hidden"
            />
          )}
          <aside
            className={`flex shrink-0
              fixed inset-y-0 left-0 z-modal transition-transform duration-base
              md:static md:z-auto md:translate-x-0 md:transition-none
              ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'}`}
          >
            <ModeRail
              activeMode={activeMode}
              visibility={visibility}
              onSelectMode={(m) => navigate(roleLandingForMode(m, activeLens?.id, visibility))}
            />
            <SubRail
              activeMode={activeMode}
              activeView={view}
              activeExtra={activeExtra}
              visibility={visibility}
              primary={primarySurfaces}
              onNavigate={navigate}
              badges={{ myworks: myItems.length, notifications: unreadCount }}
              dots={{ sprint: Boolean(sprints.find(s => s.status === 'ACTIVE')) }}
              collapsed={subRailCollapsed}
              onToggleCollapsed={() => setSubRailCollapsed(c => !c)}
            />
          </aside>

        {/* CONTENT — wrapped in Suspense so lazy-loaded route chunks show a skeleton (WI-21). */}
        <div className="flex min-w-0 flex-1 flex-col dark:bg-neutral-900">
          <ShellBreadcrumbs view={view} entityLabel={selectedItem?.title || selectedItem?.id} />
          <div className="min-h-0 flex-1 overflow-auto">
            <RouteOutlet
            model={{
              acceptDashboardSuggestion, actionItems, activeCeremony, activeObjective, activeRetro, activeSprint, activeStandup, activeWorkspaceId,
              actOnViolation, addArticleComment, addDashboardWidget, addItemToRelease, addKeyResult, addProjectMember, addReportSection, addRetroNote,
              addStatus, addTransition, adminDash, advanceStandup, aiAction, aiCapabilities, aiLoading, applyFilter,
              archiveArticle, articleAnalytics, articleChildren, articleComments, articlePanel, articleVersions, assignServiceRequest, assumptions,
              backlogItems, bqlError, bqlLoading, bqlQuery, bqlResults, brandingColor, brandingDesc, bulkAcknowledge,
              can, capacityBoard, cardPrefs, ceremonies, cloneTemplate, clusterFeedback, clusterRetro, coachTips,
              cockpitContext, cockpitLoading, columns, completeCeremony, completeStandup, complianceAudit, complianceDashboard, complianceRules,
              complianceTab, complianceTemplates, complianceViolations, convertRetroNote, createBlankReport, createCrossProjectDep, createDashboard, createFeedback,
              createFieldDef, createIdea, createImpediment, createObjective, createReportFromTemplate, createReportSchedule, createRetro, createRole,
              createServiceCustomer, createTheme, createWorkItemType, crossProjectDeps, crossProjForm, currentUser, customDashboards, customFieldDefs,
              dashboardAggregate, dashboardDrill, dashboardEditMode, dashboardRole, dashboardScope, dashboardTeamId, dashLoading, decisions,
              deleteArticle, deleteArticleComment, deleteDashboard, deleteKnowledgeSpace, deleteRelease, deleteReport, deleteReportSchedule, deleteRule,
              deleteStatus, deleteTheme, deleteTransition, density, dependencies, developerDash, digest, dragOverId,
              editingArticle, editRuleBuilder, evaluateRule, excuseCeremony, execDash, expandedWorkflowId, expandWorkflow, exportComplianceAudit,
              feedbackClusters, feedbackItems, fetchActionItems, fetchArticleChildren, fetchArticleDetail, fetchAssumptions, fetchBacklog, fetchCapacity,
              fetchCeremonies, fetchCoachTips, fetchCockpitContext, fetchComplianceAudit, fetchComplianceDashboard, fetchComplianceRules, fetchComplianceTemplates, fetchComplianceViolations,
              fetchCrossProjectDeps, fetchDashboard, fetchDashboardAggregate, fetchDecisions, fetchDependencies, fetchDigest, fetchFieldDefs, fetchFieldLayouts,
              fetchFieldVisibility, fetchImpediments, fetchKnowledgeArticles, fetchLessons, fetchMeetings, fetchMembers, fetchMyDay, fetchNotifications,
              fetchPermMatrix, fetchPmIssues, fetchProjectMembers, fetchRaidDashboard, fetchReleaseItems, fetchReleases, fetchRetros, fetchRisks,
              fetchRoles, fetchSavedFilters, fetchServiceCsat, fetchServiceCustomers, fetchServiceRequests, fetchServiceTiers, fetchServiceTypes, fetchSprintItems,
              fetchSprintMetrics, fetchSprintReport, fetchSprints, fetchStakeholders, fetchStandups, fetchUnreadCount, fetchWidgetData, fetchWorkflows,
              fetchWorkItemTypes, fieldDefs, fieldLayouts, fieldPrefs, fieldVisibility, formDesignerTypeId, handleArchiveProject, handleBacklogDragStart,
              handleBacklogDrop, handleBulkEdit, handleDelete, handleDragOver, handleDragStart, handleDrop, handleInlineCreate, handleInvite,
              handleMfaConfirm, handleMfaEnroll, handleMoveToBacklog, handleMoveToSprint, handleRefinementUpdate, handleRemoveMember, handleSaveFieldPrefs, handleSaveFilter,
              handleSprintStatusChange, i15ProjectId, ideas, impediments, inviteEmail, inviteMsg, isCrossProjOpen, joinCeremony,
              knowledgeArticles, knowledgeArticlesLoading, knowledgeSearch, knowledgeSearchResults, knowledgeSpaces, knowledgeSpacesLoading, knowledgeTab, lessonsLearned,
              loading, meetingNotes, meetings, mfaSetup, mfaSetupCode, mfaSetupMsg, mintShare, moveReportSection,
              myDay, myItems, myWorksTab, navigate, newArticleComment, newCeremony, newCustomer, newFeedback,
              newFieldForm, newFieldVisForm, newIdea, newImpediment, newKr, newObjective, newRetro, newRoleForm,
              newRuleBuilder, newStatusForm, newTheme, newTransitionForm, newTypeForm, notifications, inboxItems, notifPrefs, objectives,
              openArticlePanel, openCeremony, openDashboard, openObjective, openReport, openRetro, openScheduleManager, openStandup,
              patternsResult, permanentDelete, permMatrix, planningResult, planningTimeOff, pmCreate, pmDelete, pmForm,
              pmFormOpen, pmIssues, pmProjectId, pmTab, poDash, poTab, previewWidgetData, projectMemberEmail,
              projectMemberMsg, projectMembers, projectMetrics, projectMetricsLoading, projects, promoteIdea, publishArticle, raidDashboard,
              recordStandup, refinementMode, rejectArticle, releaseItems, releaseNotesName, releaseNotesResult, releases, releaseSearch,
              removeDashboardWidget, removeItemFromRelease, removeReportSection, reorderDashboardWidgets, reportEditMode, reports, reportSchedules, reportSections,
              reportTemplates, resetCockpitAnalysis, resetTodayLayout, resizeDashboardWidget, restoreArticle, restoreFromTrash, retroClusters, retroNoteDraft,
              retros, reviewResult, reviewSprintId, riskPanel, risks, riskSprintId, roadmapThemes, roles,
              ruleBuilder, ruleTestResult, runBql, runPatterns, runReleaseNotes, runReviewPrep, runRiskPanel, runSprintPlanning,
              runVariance, saveBranding, savedFilters, saveFieldVisibility, saveFilterName, saveMemberCapacity, saveNotifPrefs, saveReport, saveUserPrefs,
              saveRule, saveTodayLayout, saveTodayTemplate, scheduleCeremony, scheduleForm, scheduleManagerOpen, scopeChanges, searchKnowledge,
              selectAllViolations, selectedArticle, selectedDashboard, selectedItem, selectedMeeting, selectedProjectId, selectedRelease, selectedReport,
              selectedSpace, selectedSprintId, selectedViolations, serviceCsat, serviceCustomers, serviceQueue, serviceRequests, serviceTab,
              serviceTiers, serviceTypes, setActiveCeremony, setActiveRetro, setActiveSprint, setActiveStandup, setArticleForm, setArticlePanel,
              setBqlQuery, setBrandingColor, setBrandingDesc, setComplianceTab, setCrossProjForm, setCustomFieldDefs, setDashboardDrill, setDashboardEditMode,
              setDashboardRole, setDashboardScope, setDashboardTeamId, setDensity, setDragOverId, setDragWidgetId, setEditingArticle, setExpandedWorkflowId,
              setFormDesignerTypeId, setI15ProjectId, setInviteEmail, setIsArticleFormOpen, setIsCreateOpen, setIsCrossProjOpen, setIsProjectOpen, setIsReleaseOpen,
              setIsSpaceFormOpen, setIsSprintOpen, setIsWorklogOpen, setKnowledgeSearch, setKnowledgeTab, setMeetingNotes, setMfaSetup, setMfaSetupCode,
              setMyWorksTab, setNewArticleComment, setNewCeremony, setNewCustomer, setNewFeedback, setNewFieldForm, setNewFieldVisForm, setNewIdea,
              setNewImpediment, setNewItem, setNewKr, setNewObjective, setNewRetro, setNewRoleForm, setNewStatusForm, setNewTheme,
              setNewTransitionForm, setNewTypeForm, setNotifications, setInboxItems, setPlanningTimeOff, setPmForm, setPmFormOpen, setPmProjectId, setPmTab,
              setPoTab, setProjectMemberEmail, setRefinementMode, setReleaseNotesName, setReleaseSearch, setReportEditMode, setRetroNoteDraft, setReviewSprintId,
              setRiskSprintId, setRuleActive, setRuleBuilder, setSaveFilterName, setScheduleForm, setScheduleManagerOpen, setSelectedArticle, setSelectedDashboard,
              setSelectedItem, setSelectedMeeting, setSelectedRelease, setSelectedReport, setSelectedSpace, setSelectedSprintId, setServiceQueue, setServiceTab,
              setSettings3Tab, setShowFieldForm, setShowRoleForm, setShowSaveFilter, setShowTypeForm, setSmTab, setSprintFilters, setSprintItems,
              setSprintSort, setStandupDraft, setSwimlaneBy, settings3Tab, setUnreadCount, setVarianceSprintId, setView, setViolationFilter,
              setWipLimit, shareInfo, showFieldForm, showRoleForm, showSaveFilter, showToast, showTypeForm, smDash,
              smTab, sprintFilters, sprintItems, sprintMetrics, sprintMetricsLoading, sprintReport, sprints, sprintSort,
              stakeholders, standupDraft, standups, startCeremony, startStandup, statusResolver, stopShare, submitArticleForReview, supportDash,
              submitMyStandup, swimlaneBy, teams, testRule, todayLayout, toggleArticleComment, togglePermission, toggleReportSchedule,
              toggleStar, toggleViolationSelect, totalWorkItemCount, transitionServiceRequest, trashItems, unreadCount, updateArticle, updateDashboardWidgetConfig,
              updateImpediment, updateKrProgress, updateRelease, updateReportSection, updateThemeStatus, userName, userRole, users,
              varianceResult, varianceSprintId, velocityData, view, violationFilter, voteIdea, voteRetroNote, widgetMetrics,
              wipLimits, workflowDetail, workflows, workItems, workItemTypes, workspaceMembers,
            }}
            />
          </div>
        </div>
        </div>
      </main>

      {/* DETAIL PANEL — right slide-in overlay; the shell persists (mockup side-panel pattern) */}
      {selectedItem && (
        <WorkItemDetailPanel
          selectedItem={selectedItem}
          setSelectedItem={setSelectedItem}
          toggleStar={toggleStar}
          handleDelete={handleDelete}
          can={can}
          handleUpdateItem={handleUpdateItem}
          setIsWorklogOpen={setIsWorklogOpen}
          detailTab={detailTab}
          setDetailTab={setDetailTab}
          tagInput={tagInput}
          setTagInput={setTagInput}
          workItems={workItems}
          itemChildren={itemChildren}
          users={users}
          aiCapabilities={aiCapabilities}
          aiLoading={aiLoading}
          aiAction={aiAction}
          activeWorkspaceId={activeWorkspaceId}
          fieldDefs={fieldDefs}
          fieldValues={fieldValues}
          setFieldValues={setFieldValues}
          saveFieldValue={saveFieldValue}
          comments={comments}
          currentUser={currentUser}
          newComment={newComment}
          handleCommentInput={handleCommentInput}
          handleAddComment={handleAddComment}
          commentInternal={commentInternal}
          setCommentInternal={setCommentInternal}
          replyingTo={replyingTo}
          setReplyingTo={setReplyingTo}
          replyBody={replyBody}
          setReplyBody={setReplyBody}
          addReply={addReply}
          mentionOpen={mentionOpen}
          mentionQuery={mentionQuery}
          insertMention={insertMention}
          links={links}
          newLink={newLink}
          setNewLink={setNewLink}
          handleDeleteLink={handleDeleteLink}
          handleAddLink={handleAddLink}
          handleCreateLink={handleCreateLink}
          handleSetParent={handleSetParent}
          handleAddChild={handleAddChild}
          handleRemoveChild={handleRemoveChild}
          attachments={attachments}
          fileInputRef={fileInputRef}
          handleUploadFile={handleUploadFile}
          handleAttachLink={handleAttachLink}
          handleDeleteAttachment={handleDeleteAttachment}
          maxUploadMb={MAX_UPLOAD_MB}
          activity={activity}
          statusMetrics={statusMetrics}
          fieldPrefs={fieldPrefs}
          onToggleFieldPref={handleToggleFieldPref}
          activityEventFilter={activityEventFilter}
          setActivityEventFilter={setActivityEventFilter}
          setActivity={setActivity}
          reportError={reportError}
          statusResolver={statusResolver}
        />
      )}

      {/* CREATE KNOWLEDGE SPACE MODAL */}
      {isSpaceFormOpen && (
        <Modal title="New Knowledge Space" onClose={() => setIsSpaceFormOpen(false)}>
          <div className="space-y-3">
            <Field label="Space Name *">
              <input type="text" className="input" placeholder="e.g. Engineering, Support, Onboarding" value={spaceForm.name}
                onChange={e => setSpaceForm(f => ({ ...f, name: e.target.value }))} />
            </Field>
            <Field label="Description">
              <textarea rows={2} className="input resize-none" placeholder="What kind of knowledge does this space contain?"
                value={spaceForm.description} onChange={e => setSpaceForm(f => ({ ...f, description: e.target.value }))} />
            </Field>
            <Field label="Visibility">
              <select className="input" value={spaceForm.visibility} onChange={e => setSpaceForm(f => ({ ...f, visibility: e.target.value }))}>
                <option value="PUBLIC">Public — visible to everyone</option>
                <option value="TEAM">Team — workspace members only</option>
                <option value="PRIVATE">Private — only invited members</option>
              </select>
            </Field>
          </div>
          <div className="flex justify-end gap-3 mt-5">
            <Button variant="ghost" onClick={() => setIsSpaceFormOpen(false)}>Cancel</Button>
            <Button variant="action" onClick={createKnowledgeSpace}>Create Space</Button>
          </div>
        </Modal>
      )}

      {/* CREATE ARTICLE MODAL */}
      {isArticleFormOpen && (
        <Modal title="New Article" onClose={() => setIsArticleFormOpen(false)}>
          <div className="space-y-3">
            <Field label="Title *">
              <input type="text" className="input" placeholder="Article title" value={articleForm.title}
                onChange={e => setArticleForm(f => ({ ...f, title: e.target.value }))} />
            </Field>
            <Field label="Template Type">
              <select className="input" value={articleForm.templateType} onChange={e => setArticleForm(f => ({ ...f, templateType: e.target.value }))}>
                {['KB','RUNBOOK','ADR','POSTMORTEM','ONBOARDING','TROUBLESHOOTING','CUSTOM'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Initial Content (optional)">
              <textarea rows={4} className="input resize-none font-mono text-sm" placeholder="Start writing... (Markdown supported)"
                value={articleForm.content} onChange={e => setArticleForm(f => ({ ...f, content: e.target.value }))} />
            </Field>
          </div>
          <div className="flex justify-end gap-3 mt-5">
            <Button variant="ghost" onClick={() => setIsArticleFormOpen(false)}>Cancel</Button>
            <Button variant="action" onClick={createArticle}>Create Article</Button>
          </div>
        </Modal>
      )}

      {/* CREATE RELEASE MODAL */}
      {isReleaseOpen && (
        <Modal title="New Release" onClose={() => setIsReleaseOpen(false)}>
          <div className="space-y-3">
            <Field label="Release Name *">
              <input type="text" className="input" placeholder="e.g. Q2 Feature Release" value={newRelease.name} onChange={e => setNewRelease(r => ({ ...r, name: e.target.value }))} />
            </Field>
            <Field label="Version *">
              <input type="text" className="input" placeholder="e.g. 2.1.0" value={newRelease.version} onChange={e => setNewRelease(r => ({ ...r, version: e.target.value }))} />
            </Field>
            <Field label="Description">
              <textarea rows={2} className="input resize-none" placeholder="What's in this release?" value={newRelease.description} onChange={e => setNewRelease(r => ({ ...r, description: e.target.value }))} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Project">
                <select className="input" value={newRelease.projectId} onChange={e => setNewRelease(r => ({ ...r, projectId: e.target.value }))}>
                  <option value="">— Select project —</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="Target Date">
                <input type="date" className="input" value={newRelease.releaseDate} onChange={e => setNewRelease(r => ({ ...r, releaseDate: e.target.value }))} />
              </Field>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-5">
            <Button variant="ghost" onClick={() => setIsReleaseOpen(false)}>Cancel</Button>
            <Button variant="action" onClick={createRelease}>Create Release</Button>
          </div>
        </Modal>
      )}

      {/* LOG WORK MODAL */}
      {isWorklogOpen && selectedItem && (
        <Modal title="Log Work" onClose={() => setIsWorklogOpen(false)}>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-3">{selectedItem.title}</p>
          <div className="space-y-3">
            <Field label="Time Spent (minutes) *">
              <input type="number" className="input" min={1} value={worklogForm.timeSpentMinutes} onChange={e => setWorklogForm(f => ({ ...f, timeSpentMinutes: parseInt(e.target.value) || 0 }))} />
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">{Math.round(worklogForm.timeSpentMinutes / 60 * 10) / 10} hours</p>
            </Field>
            <Field label="Date">
              <input type="date" className="input" value={worklogForm.workDate} onChange={e => setWorklogForm(f => ({ ...f, workDate: e.target.value }))} />
            </Field>
            <Field label="Description (optional)">
              <textarea rows={2} className="input resize-none" placeholder="What did you work on?" value={worklogForm.description} onChange={e => setWorklogForm(f => ({ ...f, description: e.target.value }))} />
            </Field>
          </div>
          <div className="flex justify-end gap-3 mt-5">
            <Button variant="ghost" onClick={() => setIsWorklogOpen(false)}>Cancel</Button>
            <Button variant="action" onClick={logWork}>Log Work</Button>
          </div>
        </Modal>
      )}

      {/* COMMAND PALETTE (Cmd/Ctrl-K) — actions + live server search of items & people (iteration 18) */}
      {paletteOpen && (
        <CommandPalette
          onClose={() => setPaletteOpen(false)}
          commands={paletteCommands}
          onSearch={commandSearch}
        />
      )}

      {/* ITERATION 18 OVERLAYS — status page, push prefs, shortcuts help, sync conflicts */}
      {overlay === 'status' && (
        <Modal title="System status" onClose={() => setOverlay(null)} size="lg">
          <StatusPage />
        </Modal>
      )}
      {overlay === 'push' && (
        <Modal title="Notification preferences" onClose={() => setOverlay(null)} size="lg">
          <PushSettingsPanel onSaved={() => showToast('Notification preferences saved')} />
        </Modal>
      )}
      {shortcutsHelpOpen && <ShortcutsHelp onClose={() => setShortcutsHelpOpen(false)} />}
      {conflicts.length > 0 && (
        <ConflictResolver conflicts={conflicts} onResolve={resolveConflict} onClose={() => setConflicts([])} />
      )}

      {/* TOAST NOTIFICATION — accessible live region (components/works/atoms/toast.jsx) */}
      <Toast toast={toast} canUndo={Boolean(deleteUndoItem)} onUndo={handleUndoDelete} />
      {/* TOAST STACK — queued push-notifications (WI-26: lib/toast-queue.js + pushToast()) */}
      <ToastStack />

      {/* CREATE SPRINT MODAL */}
      {isSprintOpen && (
        <Modal title="New Sprint" onClose={() => setIsSprintOpen(false)}>
          <div className="space-y-3">
            <Field label="Sprint Name *">
              <input type="text" value={newSprint.name} onChange={e => setNewSprint({ ...newSprint, name: e.target.value })}
                className="input" placeholder="e.g. Sprint 1" />
            </Field>
            <Field label="Sprint Goal">
              <input type="text" value={newSprint.goal} onChange={e => setNewSprint({ ...newSprint, goal: e.target.value })}
                className="input" placeholder="e.g. Stabilize portal, ship SAML" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start Date"><input type="date" value={newSprint.startDate} onChange={e => setNewSprint({ ...newSprint, startDate: e.target.value })} className="input" /></Field>
              <Field label="End Date"><input type="date" value={newSprint.endDate} onChange={e => setNewSprint({ ...newSprint, endDate: e.target.value })} className="input" /></Field>
            </div>
            <Field label="Capacity (story points)">
              <input type="number" value={newSprint.capacity} onChange={e => setNewSprint({ ...newSprint, capacity: parseInt(e.target.value) || 0 })} className="input" min={0} />
            </Field>
          </div>
          <div className="flex justify-end gap-3 mt-5">
            <Button variant="ghost" onClick={() => setIsSprintOpen(false)}>Cancel</Button>
            <Button variant="action" onClick={handleCreateSprint}>Create Sprint</Button>
          </div>
        </Modal>
      )}

      {/* CREATE WORK ITEM DIALOG — 3-step: Category → Type → Form */}
      <CreateWorkItemDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreate}
        projects={projects}
        users={users}
        workItems={workItems}
      />

      {/* CREATE TEAM MODAL */}
      {isProjectOpen && (
        <Modal title="New Team" onClose={() => { setIsProjectOpen(false); setCreateError(''); }}>
          {createError && <div className="text-semantic-danger bg-semantic-danger-surface p-2 text-sm rounded mb-3">{createError}</div>}
          <div className="space-y-3">
            <Field label="Team Name *">
              <input type="text" value={newProject.name} onChange={e => setNewProject({ ...newProject, name: e.target.value })}
                className="input" placeholder="e.g. Platform Team" />
            </Field>
            <Field label="Team Key *">
              <input type="text" maxLength={5} value={newProject.keyPrefix}
                onChange={e => setNewProject({ ...newProject, keyPrefix: e.target.value.toUpperCase() })}
                className="input" placeholder="e.g. PLAT" />
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">2–5 uppercase letters — identifies this team (e.g. PLAT)</p>
            </Field>
            <Field label="Description">
              <textarea rows={2} value={newProject.description} onChange={e => setNewProject({ ...newProject, description: e.target.value })}
                className="input resize-none" placeholder="What does this team work on?" />
            </Field>
            <Field label="Framework">
              <select
                value={newProject.framework || 'SCRUM'}
                onChange={e => setNewProject({ ...newProject, framework: e.target.value })}
                className="input"
              >
                <option value="SCRUM">Scrum</option>
                <option value="KANBAN">Kanban</option>
                <option value="WATERFALL">Waterfall</option>
                <option value="LEAN">Lean</option>
                <option value="DSDM">DSDM</option>
                <option value="XP">XP</option>
              </select>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">Dictates which features (e.g. Sprints) this team uses.</p>
            </Field>
          </div>
          <div className="flex justify-end gap-3 mt-5">
            <Button variant="ghost" onClick={() => setIsProjectOpen(false)}>Cancel</Button>
            <Button variant="action" onClick={handleCreateProject}>Create Team</Button>
          </div>
        </Modal>
      )}
      {import.meta.env.DEV && <FlagDevtools />}
    </div>
  );
}

// Modal now lives in components/works/molecules/modal.jsx — accessible (role=dialog, aria-modal,
// focus trap, Escape, backdrop close, scroll lock, focus restoration). Imported at the top.

// renderMd extracted to @/lib/utils (imported above). Imported as renderMd from utils (TD-003).

// getTimeOfDay moved to lib/utils.js (TD-003 / ONE Source — also de-duplicates dashboard-view.jsx).

// StatCard, RoleBadge, Field and the onPressKey keyboard helper now live in
// components/works/{stat-card,role-badge,field}.jsx and lib/utils.js (imported above).

// ExportButtons extracted to src/components/works/export-buttons.jsx (TD-003).

// aggregateByDimension / filterReportItems moved to lib/dashboard-metrics.js (TD-003).

// ReportSectionControls + ReportSectionCard extracted to
// src/components/works/organisms/report-section-card.jsx (TD-003).

// PublicDashboardEmbed (iteration 6, Cap J) extracted to
// src/components/works/organisms/public-dashboard-embed.jsx — imported at the top of this file and
// rendered before the auth gate from ?share=<token> or /embed/dashboard/<token>.

// AiComplianceSuggestion (B27) extracted to
// src/components/works/organisms/ai-compliance-suggestion.jsx (TD-003 / ONE Function) — imported
// above and passed to the compliance view as a prop.

// DashboardDrillModal extracted to src/components/works/organisms/dashboard-drill-modal.jsx (TD-003).
// PmArtifactList extracted to src/components/works/organisms/pm-artifact-list.jsx (TD-003).

// SprintItemList extracted to src/components/works/organisms/sprint-item-list.jsx (TD-003 / ONE
// Function) — imported above and passed to the sprint surfaces as a prop.

// SprintBoard extracted to src/components/works/organisms/sprint-board.jsx (TD-003)
