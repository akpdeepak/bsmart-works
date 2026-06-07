/* eslint-disable */ // legacy monolith — a11y and hooks violations are known baseline debt; new components must pass clean
import React, { useState, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import {
  Mail, PanelLeft, ChevronDown, Check,
  Home, User, Bell, LayoutGrid, ListTodo, Zap, Rocket, FolderKanban,
  BarChart2, LayoutDashboard, FileText, TrendingUp, Headset, Timer, ShieldCheck,
  Gauge, Map as MapIcon, ClipboardList, Workflow, Plug, Search, BookOpen,
  SlidersHorizontal, Settings, Trash2, Code,
  CheckCircle2, AlertCircle, Heart, AlertTriangle, Puzzle, Link, Lock,
  File as FileIcon, Folder, Lightbulb, Users, Shield, Ban, Construction,
  MessageCircle, Archive, RefreshCw, Repeat, Send, Megaphone, ScrollText,
  Pin, Calendar, Eye, EyeOff, Building2, Target, Globe, Star, Scale, Clock, Reply, AtSign,
  X, ArrowRight, ArrowLeft, ArrowUp, ArrowDown, ChevronRight, ChevronUp,
  SquarePen, Upload, IndentIncrease, IndentDecrease, MapPin, KeyRound,
  Unlock, CornerDownRight, Image as ImageIcon, Flame, Bug,
  Package, Ticket, Wrench, Flag, SquareCheck,
} from 'lucide-react';
import { Button } from '@/components/works/button';
import { UserMenu } from '@/components/works/organisms/user-menu';
import { SidebarNav } from '@/components/works/organisms/sidebar-nav';
import { AiCommandBar } from '@/components/works/organisms/ai-command-bar';
import { DeveloperWorkspace } from '@/components/works/organisms/developer-workspace';
import { SlaView } from '@/components/works/organisms/sla-view';
import { PerformancePanel } from '@/components/works/organisms/performance-panel';
import { AiSettingsPanel } from '@/components/works/organisms/ai-settings-panel';
import { WorkItemStatusTimeline } from '@/components/works/organisms/work-item-status-timeline';
import { AcceptanceCriteria } from '@/components/works/organisms/acceptance-criteria';
import { BoardWipBadge } from '@/components/works/organisms/board-wip-badge';
import { AutomationsPanel } from '@/components/works/organisms/automations-panel';
import { IntegrationsPanel } from '@/components/works/organisms/integrations-panel';
import { Modal } from '@/components/works/molecules/modal';
import { Toast } from '@/components/works/atoms/toast';
import { Skeleton } from '@/components/works/atoms/skeleton';
import { CommandPalette } from '@/components/works/organisms/command-palette';
import { viewToPath, pathToView } from '@/lib/routes';
import { StatusBadge } from '@/components/works/status-badge';
import { statusToCategory } from '@/components/works/status';
import { Logo } from '@/components/works/logo';
import { ResetPasswordScreen } from '@/components/works/reset-password-screen';
import { DonutChart, BarChart } from '@/components/works/molecules';
import { exportElementToPng, exportElementToPdf, exportRowsToCsv } from '@/lib/export';
import { api } from '@/lib/apiClient';
import { isIconComponent, onPressKey } from '@/lib/utils';
import { EmptyState } from '@/components/works/atoms/empty-state';
import { TYPES, TYPE_ICON_SET, TYPE_ICON_KEYS } from '@/lib/work-item-types';
import { TypeBadge, TypeIcon } from '@/components/works/work-item-type';
import { PriorityBadge } from '@/components/works/priority-badge';
import { StatCard } from '@/components/works/stat-card';
import { RoleBadge } from '@/components/works/role-badge';
import { Field } from '@/components/works/field';
import { Avatar } from '@/components/works/atoms/avatar';
import DashboardView from '@/views/dashboard-view';
import WorkspaceView from '@/views/workspace-view';
import PoWorkspaceView from '@/views/po-workspace-view';
import { AiMetaBadge } from '@/components/works/ai-meta-badge';
import NotificationsView from '@/views/notifications-view';
import TrashView from '@/views/trash-view';
import ReleasesView from '@/views/releases-view';
import BqlView from '@/views/bql-view';
import MyWorksView from '@/views/my-works-view';
import ProjectsView from '@/views/projects-view';
import ReportsView from '@/views/reports-view';
import AiStudioView from '@/views/ai-studio-view';
import MarketplaceView from '@/views/marketplace-view';
import DeveloperPortalView from '@/views/developer-portal-view';
import KnowledgeTemplatesView from '@/views/knowledge-templates-view';
import SupportInboxView from '@/views/support-inbox-view';
import { LanguageSwitcher } from '@/components/works/organisms/language-switcher';
import {
  filterItems as filterWidgetItems, statusBreakdown, statusPriorityMatrix,
  sprintProgress, velocityPoints, SERIES_BG, EXTRA_WIDGET_PRESETS, EXTRA_WIDGET_CATEGORIES,
} from '@/lib/dashboard-metrics';

// One error-presentation contract (findings F1/F2 in docs/UX-CODEBASE-ANALYSIS.md): failures are
// never swallowed silently. `reportError` is registered with the live toast emitter from inside
// App(); because there is a single toast slot, a burst of failures collapses to one message
// rather than spamming. Transient/data errors surface here; form-field errors stay inline.
let _emitToast = null;
function reportError(e) {
  if (e) { try { console.error('[bSmart]', e); } catch { /* noop */ } }
  if (_emitToast) _emitToast('Something went wrong. Please try again.', 'error');
}

// Sidebar information architecture — data-driven, grouped by workflow so the ~25 destinations
// scan as a handful of intents instead of one flat list (RB-30 §7 navigation; brand §5.2). Lucide
// icons only, never emoji (RB-30 §8). Each item's click side-effects live in the `navigate`
// dispatcher inside App(); badge/dot keys are resolved per-render from live state.
const NAV_GROUPS = [
  { label: null, items: [{ id: 'dashboard', label: 'Home', Icon: Home }] },
  { label: 'My Work', items: [
    { id: 'myworks',       label: 'My Works',      Icon: User, badge: 'myItems' },
    { id: 'notifications', label: 'Notifications', Icon: Bell, badge: 'unread' },
    { id: 'developer',     label: 'Developer',     Icon: Code },
  ] },
  { label: 'Plan & Track', items: [
    { id: 'board',    label: 'Board',         Icon: LayoutGrid },
    { id: 'backlog',  label: 'Backlog',       Icon: ListTodo },
    { id: 'sprint',   label: 'Active Sprint', Icon: Zap, dot: 'activeSprint' },
    { id: 'releases', label: 'Releases',      Icon: Rocket },
    { id: 'projects', label: 'Projects',      Icon: FolderKanban, badge: 'projects' },
  ] },
  { label: 'Insights', items: [
    { id: 'reports',       label: 'Reports',        Icon: BarChart2 },
    { id: 'dashboards',    label: 'Dashboards',     Icon: LayoutDashboard },
    { id: 'reportbuilder', label: 'Report builder', Icon: FileText },
    { id: 'performance',   label: 'Performance',    Icon: TrendingUp },
  ] },
  { label: 'Service & Compliance', items: [
    { id: 'service',    label: 'Service Desk', Icon: Headset },
    { id: 'sla',        label: 'SLA',          Icon: Timer },
    { id: 'compliance', label: 'Compliance',   Icon: ShieldCheck },
  ] },
  { label: 'Cockpits', items: [
    { id: 'smcockpit',   label: 'SM Cockpit',   Icon: Gauge },
    { id: 'poworkspace', label: 'PO Workspace', Icon: MapIcon },
    { id: 'pm',          label: 'PM Artifacts', Icon: ClipboardList },
  ] },
  { label: 'Automate & Connect', items: [
    { id: 'automations',  label: 'Automations',  Icon: Workflow },
    { id: 'integrations', label: 'Integrations', Icon: Plug },
    { id: 'bql',          label: 'BQL Query',    Icon: Search },
  ] },
  { label: 'Knowledge', items: [
    { id: 'knowledge', label: 'Knowledge', Icon: BookOpen },
  ] },
  { label: 'Configure', items: [
    { id: 'settings3', label: 'Workflows & Fields', Icon: SlidersHorizontal },
    { id: 'workspace', label: 'Settings',           Icon: Settings },
    { id: 'trash',     label: 'Trash',              Icon: Trash2 },
  ] },
];

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';

// Avatar + getInitials now live in components/works/atoms/avatar.jsx (imported above).

function readStoredSession() {
  try {
    return JSON.parse(localStorage.getItem('bSmartSession') || 'null');
  } catch {
    return null;
  }
}

// Work-item type vocabulary + presentation now live in lib/work-item-types.js and
// components/works/work-item-type.jsx (imported above).

// Iteration 15 — retro board columns per template (Cap V · retro toolkit).
const RETRO_COLUMNS = {
  START_STOP_CONTINUE: [
    { key: 'START', label: 'Start' },
    { key: 'STOP', label: 'Stop' },
    { key: 'CONTINUE', label: 'Continue' },
  ],
  FOUR_LS: [
    { key: 'LIKED', label: 'Liked' },
    { key: 'LEARNED', label: 'Learned' },
    { key: 'LACKED', label: 'Lacked' },
    { key: 'LONGED_FOR', label: 'Longed for' },
  ],
  MAD_SAD_GLAD: [
    { key: 'MAD', label: 'Mad' },
    { key: 'SAD', label: 'Sad' },
    { key: 'GLAD', label: 'Glad' },
  ],
};

// Iteration 15 — surfaces the AI Control Plane verdict (RB-40 §2) honestly: whether AI ran, fell
// back to the deterministic result, was degraded to the cheap tier, or served a cached response.
// AiMetaBadge now lives in components/works/ai-meta-badge.jsx (imported above).

export default function App() {
  const initialSession                  = readStoredSession();
  const [currentUser, setCurrentUser]   = useState(() => initialSession?.user || null);
  const [token, setToken]               = useState(() => initialSession?.token || null);
  const [authMode, setAuthMode]         = useState('login');
  const [authForm, setAuthForm]         = useState({ email: '', password: '', fullName: '' });
  const [authError, setAuthError]       = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotMode, setForgotMode]     = useState(false);
  const [forgotEmail, setForgotEmail]   = useState('');
  const [forgotMsg, setForgotMsg]       = useState('');
  const [verifyPending, setVerifyPending] = useState(null); // { email, devToken }
  // Token from the emailed /reset-password?token=… link (read once on load).
  const [resetToken, setResetToken] = useState(() => {
    if (!window.location.pathname.includes('reset-password')) return null;
    return new URLSearchParams(window.location.search).get('token') || '';
  });
  const [verifyMsg, setVerifyMsg]       = useState('');
  const [mfaChallenge, setMfaChallenge] = useState(null); // { userId } — awaiting TOTP
  const [mfaCode, setMfaCode]           = useState('');
  const [mfaError, setMfaError]         = useState('');
  const [mfaSetup, setMfaSetup]         = useState(null); // { otpAuthUri, secret } — enroll flow
  const [mfaSetupCode, setMfaSetupCode] = useState('');
  const [mfaSetupMsg, setMfaSetupMsg]   = useState('');

  const [view, setView]                 = useState(() => pathToView(window.location.pathname) || 'dashboard');
  const didInitRoute                    = useRef(false);
  const [toast, setToast]               = useState(null); // { message, type }
  const [workItems, setWorkItems]       = useState([]);
  const [projects, setProjects]         = useState([]);
  const [users, setUsers]               = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]   = useState(0);
  const [loading, setLoading]           = useState(true);

  const [selectedItem, setSelectedItem] = useState(null);
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

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProjectOpen, setIsProjectOpen] = useState(false);
  const [newItem, setNewItem]           = useState({ title: '', type: 'Task', description: '', assigneeId: '', dueDate: '', tags: '', priority: 'MEDIUM', parentId: '', projectId: '' });
  const [newProject, setNewProject]     = useState({ name: '', keyPrefix: '', description: '' });
  const [createError, setCreateError]   = useState('');

  const [searchQuery, setSearchQuery]   = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchOpen, setSearchOpen]     = useState(false);
  const searchRef                       = useRef(null);

  const [paletteOpen, setPaletteOpen]   = useState(false);
  const goToRef                         = useRef(false); // 'g' then a key — quick go-to (brand §5.2)
  const navigateRef                     = useRef(null);  // latest navigate(), for global shortcuts

  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [inviteEmail, setInviteEmail]   = useState('');
  const [inviteMsg, setInviteMsg]       = useState('');

  // Kanban density: compact | comfortable | spacious
  const [density, setDensity]           = useState('comfortable');

  // Sidebar collapse (w-56 expanded ↔ w-12 icon-only)
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false); // off-canvas drawer under md (G1)

  // Dark mode
  const [darkMode, setDarkMode]         = useState(() => localStorage.getItem('bSmartTheme') === 'dark');

  // RBAC
  const [userRole, setUserRole]         = useState({ role: 'MEMBER', tier: 2, permissions: [] });
  const can = (perm) => userRole.permissions.includes(perm) || userRole.tier >= 4;

  // My Works sub-tab
  const [myWorksTab, setMyWorksTab]     = useState('assigned'); // assigned | activity | mentions

  // Notification prefs
  const [notifPrefs, setNotifPrefs]     = useState({ notifyAssign: true, notifyComment: true, notifyMention: true, emailDigest: false });

  // Iteration 2 — Sprints & Backlog
  const [sprints, setSprints]           = useState([]);
  const [activeSprint, setActiveSprint] = useState(null);
  const [backlogItems, setBacklogItems] = useState([]);
  const [sprintItems, setSprintItems]   = useState([]);
  const [sprintReport, setSprintReport] = useState(null);
  const [savedFilters, setSavedFilters] = useState([]);
  const [activeFilter, setActiveFilter] = useState(null);
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
  const [wsOpen, setWsOpen]             = useState(false);
  const wsRef                           = useRef(null);
  const [workspaces, setWorkspaces]     = useState([]);
  const [wsLoading, setWsLoading]       = useState(false);
  const [wsError, setWsError]           = useState(false);
  const [activeWorkspaceId, setActiveWorkspaceId] =
    useState(() => localStorage.getItem('bSmartActiveWorkspace') || 'WS-001');

  // Iteration 3 — Workflows, Custom Fields, Permissions, BQL
  const [workflows, setWorkflows]           = useState([]);
  const [fieldDefs, setFieldDefs]           = useState([]);
  const [roles, setRoles]                   = useState([]);
  const [bqlQuery, setBqlQuery]           = useState('');
  const [bqlResults, setBqlResults]       = useState([]);
  const [bqlFilters, setBqlFilters]       = useState([]);
  const [bqlFilterName, setBqlFilterName] = useState('');
  const [bqlError, setBqlError]           = useState('');
  const [workItemTypes, setWorkItemTypes]   = useState({ builtIn: [], custom: [] });
  const [permMatrix, setPermMatrix]         = useState(null);
  const [settings3Tab, setSettings3Tab]     = useState('workflows'); // workflows | fields | permissions | types

  // Iter 3 — settings UI state
  const [expandedWorkflowId, setExpandedWorkflowId] = useState(null);
  const [workflowDetail, setWorkflowDetail]         = useState(null); // { statuses, transitions }
  const [newStatusForm, setNewStatusForm]           = useState({ name: '', color: '#0B2F5C', category: 'IN_PROGRESS' });
  const [newTransitionForm, setNewTransitionForm]   = useState({ name: '', fromStatus: '', toStatus: '' });
  const [showFieldForm, setShowFieldForm]           = useState(false);
  const [newFieldForm, setNewFieldForm]             = useState({ name: '', fieldType: 'TEXT', required: false, description: '' });
  const [showTypeForm, setShowTypeForm]             = useState(false);
  const [newTypeForm, setNewTypeForm]               = useState({ label: '', typeKey: '', icon: 'package' });
  const [showRoleForm, setShowRoleForm]             = useState(false);
  const [newRoleForm, setNewRoleForm]               = useState({ name: '', tier: 2 });

  // Iteration 4 — PM Artifacts
  const [pmProjectId, setPmProjectId]       = useState('');
  const [pmTab, setPmTab]                   = useState('raid');   // raid | risks | assumptions | issues | deps | decisions | meetings | actions | stakeholders | lessons
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
  const [pmFormOpen, setPmFormOpen]         = useState(null); // 'risk'|'assumption'|...|null
  const [selectedPmItem, setSelectedPmItem] = useState(null);

  // Iteration 6 — Role-tuned Dashboards
  const [dashboardRole, setDashboardRole]       = useState('developer');
  const [developerDash, setDeveloperDash]       = useState(null);
  const [smDash, setSmDash]                     = useState(null);
  const [poDash, setPoDash]                     = useState(null);
  const [execDash, setExecDash]                 = useState(null);
  const [adminDash, setAdminDash]               = useState(null);
  const [dashLoading, setDashLoading]           = useState(false);

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
  const [newImpediment, setNewImpediment]       = useState({ title: '', severity: 'MEDIUM', category: '', description: '' });
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
  const [reviewSprintId, setReviewSprintId]     = useState('');
  const [reviewResult, setReviewResult]         = useState(null);
  const [patternsResult, setPatternsResult]     = useState(null);
  const [riskSprintId, setRiskSprintId]         = useState('');
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
  const [myWorklogs, setMyWorklogs]             = useState([]);
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

  // Iteration 5 — Knowledge Repository
  const [knowledgeSpaces, setKnowledgeSpaces] = useState([]);
  const [knowledgeArticles, setKnowledgeArticles] = useState([]);
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [articleVersions, setArticleVersions] = useState([]);
  const [knowledgeSearch, setKnowledgeSearch] = useState('');
  const [knowledgeSearchResults, setKnowledgeSearchResults] = useState([]);
  const [knowledgeTab, setKnowledgeTab] = useState('spaces');
  const [spaceForm, setSpaceForm] = useState({ name: '', description: '', visibility: 'TEAM' });
  const [articleForm, setArticleForm] = useState({ title: '', content: '', templateType: 'KB', status: 'DRAFT' });
  const [isSpaceFormOpen, setIsSpaceFormOpen] = useState(false);
  const [isArticleFormOpen, setIsArticleFormOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState(false);
  const [articlePanel, setArticlePanel] = useState(null); // 'history' | 'comments' | 'analytics' | null
  const [articleComments, setArticleComments] = useState([]);
  const [newArticleComment, setNewArticleComment] = useState('');
  const [articleAnalytics, setArticleAnalytics] = useState(null);

  // Iter 1 & 2 completion features
  const [recentlyViewed, setRecentlyViewed] = useState(() => {
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
  // Iteration 7 — Compliance Rules Engine (Cap K) + status duration (Cap B)
  const [complianceTab, setComplianceTab] = useState('dashboard'); // dashboard | rules | violations | audit
  const [complianceRules, setComplianceRules] = useState([]);
  const [complianceTemplates, setComplianceTemplates] = useState([]);
  const [complianceViolations, setComplianceViolations] = useState([]);
  const [complianceDashboard, setComplianceDashboard] = useState(null);
  const [complianceAudit, setComplianceAudit] = useState([]);
  const [violationFilter, setViolationFilter] = useState(''); // '' | OPEN | ACKNOWLEDGED | RESOLVED | WONT_FIX
  const [selectedViolations, setSelectedViolations] = useState([]);
  const [ruleBuilder, setRuleBuilder] = useState(null); // the rule being created/edited, or null
  const [ruleTestResult, setRuleTestResult] = useState(null);
  const [statusDurations, setStatusDurations] = useState([]);
  const [deleteUndoItem, setDeleteUndoItem] = useState(null);
  const deleteUndoTimer = useRef(null);
  const [itemChildren, setItemChildren] = useState([]);

  // Iter 1 complete — new states
  const [replyingTo, setReplyingTo]     = useState(null);   // comment being replied to
  const [replyBody, setReplyBody]       = useState('');
  const [trashItems, setTrashItems]     = useState([]);
  const [, setBranding]                 = useState({ primaryColor: '#E94E1B', logoUrl: '', description: '' });
  const [projectMembers, setProjectMembers] = useState([]);
  const [projectMemberEmail, setProjectMemberEmail] = useState('');
  const [projectMemberMsg, setProjectMemberMsg] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [brandingColor, setBrandingColor] = useState('#E94E1B');
  const [brandingDesc, setBrandingDesc]  = useState('');

  // Derived from the membership list + the active selection (see fetchMyWorkspaces).
  const workspace = workspaces.find(w => w.id === activeWorkspaceId)
    || { id: activeWorkspaceId, name: 'Workspace' };
  // Board WIP limits for the active workspace ({ todoLimit, inProgressLimit, doneLimit }); empty = none.
  const [wipLimits, setWipLimits] = useState({});

  const headers = (extra = {}) => ({
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...extra
  });

  // Shared request wrapper (throws on error, returns JSON) — delegates to the single apiClient.
  const apiFetch = (url, options = {}) => api.send(url, options);

  useEffect(() => {
    if (currentUser) {
      fetchMyWorkspaces();
      fetchAll();
      fetchDashboard('developer');
      fetchReleases();
      const iv = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(iv);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // Deep-link load: when signed in on a non-default URL, run that view's data fetch once (the
  // same side-effects a nav click would trigger), so a refreshed/shared link arrives populated.
  useEffect(() => {
    if (!currentUser || didInitRoute.current) return;
    didInitRoute.current = true;
    const v = pathToView(window.location.pathname);
    if (v && v !== 'dashboard' && navigateRef.current) navigateRef.current(v);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('bSmartTheme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    if (!selectedItem) return;
    const id = selectedItem.id;
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

  // Close workspace dropdown on outside click
  useEffect(() => {
    function handler(e) { if (wsRef.current && !wsRef.current.contains(e.target)) setWsOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Global keyboard shortcuts (brand §5.2): Cmd/Ctrl-K command palette, '/' search, 'c' create,
  // 'g' then a letter to jump. Only active once the app shell is mounted (navigateRef set = signed
  // in); never hijacks typing in a field (except Cmd/Ctrl-K, which is always available).
  useEffect(() => {
    function onKey(e) {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && (e.key === 'k' || e.key === 'K')) {
        if (!navigateRef.current) return;
        e.preventDefault();
        setPaletteOpen(o => !o);
        return;
      }
      if (!navigateRef.current) return; // not in the app shell yet
      const t = e.target;
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
      if (typing || meta || e.altKey) return;

      if (goToRef.current) {
        goToRef.current = false;
        const dest = { h: 'dashboard', b: 'board', l: 'backlog', s: 'sprint', m: 'myworks',
          n: 'notifications', p: 'projects', r: 'reports', k: 'knowledge' }[e.key.toLowerCase()];
        if (dest) { e.preventDefault(); navigateRef.current(dest); }
        return;
      }
      if (e.key === 'g') { goToRef.current = true; setTimeout(() => { goToRef.current = false; }, 1200); return; }
      if (e.key === '/') { e.preventDefault(); searchRef.current?.querySelector('input')?.focus(); return; }
      if (e.key === 'c') { e.preventDefault(); setView('board'); setIsCreateOpen(true); return; }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Reflect the active view in the URL so views are deep-linkable and refresh-stable. Unknown
  // views (viewToPath === null) leave the URL alone. Skipped when already correct, so it does not
  // fight the popstate handler below (no history loop).
  useEffect(() => {
    const path = viewToPath(view);
    if (path && window.location.pathname !== path) {
      window.history.pushState({ view }, '', path);
    }
  }, [view]);

  // Back/forward: drive the view from the URL, routing through navigate so the target view's data
  // loads (by now the workspace is ready, so its fetches are safe).
  useEffect(() => {
    function onPop() {
      const v = pathToView(window.location.pathname) || 'dashboard';
      if (navigateRef.current) navigateRef.current(v); else setView(v);
    }
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

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
  _emitToast = showToast; // register the live emitter for module-level reportError (F1/F2)

  // Multi-workspace context (I01-S02). Loads the workspaces the user belongs to and reconciles the
  // active selection: keep the persisted choice if still a member, else fall back to the first.
  function fetchMyWorkspaces() {
    setWsLoading(true); setWsError(false);
    api.raw(`/workspaces/mine`)
      .then(r => r.json())
      .then(list => {
        const wss = Array.isArray(list) ? list : [];
        setWorkspaces(wss);
        setWsLoading(false);
        if (wss.length > 0 && !wss.some(w => w.id === activeWorkspaceId)) {
          const fallback = wss[0].id;
          setActiveWorkspaceId(fallback);
          localStorage.setItem('bSmartActiveWorkspace', fallback);
        }
      })
      .catch(() => { setWsLoading(false); setWsError(true); });
  }

  // Switching tenant persists the choice and reloads so every workspace-scoped query refetches
  // cleanly under the new workspace — no stale cross-tenant data in this large single-file app.
  const switchWorkspace = (id) => {
    if (id === activeWorkspaceId) { setWsOpen(false); return; }
    localStorage.setItem('bSmartActiveWorkspace', id);
    setActiveWorkspaceId(id);
    setWsOpen(false);
    window.location.reload();
  };

  function fetchUserRole() {
    api.raw(`/rbac/me`)
      .then(r => r.json()).then(d => setUserRole({
        role: d.role || 'MEMBER',
        tier: d.tier || 2,
        permissions: Array.isArray(d.permissions) ? d.permissions : []
      })).catch(reportError);
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
      api.raw(`/work-items`).then(r => r.json()),
      api.raw(`/projects`).then(r => r.json()),
      api.raw(`/users`).then(r => r.json()),
    ]).then(([items, projs, usrs]) => {
      setWorkItems(Array.isArray(items) ? items : []);
      setProjects(Array.isArray(projs) ? projs : []);
      setUsers(Array.isArray(usrs) ? usrs : []);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
      showToast('Failed to load data. Check your connection.', 'error');
    });
    fetchUnreadCount();
    fetchUserRole();
    fetchBranding();
    fetchWipLimits();
  }

  function fetchUnreadCount() {
    if (!currentUser) return;
    api.raw(`/notifications/unread-count?userId=${currentUser.id}`)
      .then(r => r.json()).then(d => setUnreadCount(d.count || 0)).catch(reportError);
  }

  function fetchNotifications() {
    api.raw(`/notifications?userId=${currentUser.id}`)
      .then(r => r.json()).then(d => setNotifications(Array.isArray(d) ? d : [])).catch(reportError);
  }

  // AUTH
  const handleAuthSubmit = (e) => {
    e.preventDefault(); setAuthError('');
    if (authMode === 'signup') {
      if (authForm.email !== confirmEmail) { setAuthError('Email addresses do not match.'); return; }
      if (authForm.password !== confirmPassword) { setAuthError('Passwords do not match.'); return; }
      if (authForm.password.length < 8) { setAuthError('Password must be at least 8 characters.'); return; }
    }
    api.raw(`/auth${authMode === 'login' ? '/login' : '/signup'}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(authForm)
    }).then(async res => {
      const data = await res.json();
      if (!res.ok) {
        if (data.requiresVerification) {
          setVerifyPending({ email: authForm.email, devToken: null });
          setVerifyMsg('Please verify your email before signing in. Check your inbox.');
          return;
        }
        throw new Error(data.message || data.error || 'Authentication failed');
      }
      return data;
    }).then(data => {
      if (!data) return;
      if (data.requiresVerification) {
        setVerifyPending({ email: authForm.email, devToken: data.devToken });
        setVerifyMsg('');
        return;
      }
      if (data.requiresMfa) {
        setMfaChallenge({ userId: data.userId });
        setMfaCode(''); setMfaError('');
        return;
      }
      setCurrentUser(data.user); setToken(data.token);
      localStorage.setItem('bSmartSession', JSON.stringify({ user: data.user, token: data.token }));
    }).catch(err => setAuthError(err.message));
  };

  const handleVerifyEmail = (token) => {
    api.raw(`/auth/verify?token=${token}`)
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || data.error || 'Verification failed');
        return data;
      })
      .then(data => {
        setVerifyPending(null); setVerifyMsg('');
        setCurrentUser(data.user); setToken(data.token);
        localStorage.setItem('bSmartSession', JSON.stringify({ user: data.user, token: data.token }));
      })
      .catch(err => setVerifyMsg(err.message));
  };

  const handleMfaVerify = () => {
    setMfaError('');
    api.raw(`/auth/mfa/verify`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: mfaChallenge.userId, totp: mfaCode })
    }).then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Invalid code');
      return data;
    }).then(data => {
      setMfaChallenge(null); setMfaCode('');
      setCurrentUser(data.user); setToken(data.token);
      localStorage.setItem('bSmartSession', JSON.stringify({ user: data.user, token: data.token }));
    }).catch(err => setMfaError(err.message));
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

  const handleForgotPassword = (e) => {
    e.preventDefault();
    api.raw(`/auth/forgot-password`, {
      method: 'POST',
      body: JSON.stringify({ email: forgotEmail })
    }).then(r => r.json()).then(d => setForgotMsg(d.message)).catch(() => setForgotMsg('Error. Please try again.'));
  };

  // Token-based reset reached from the emailed /reset-password?token=… link.
  // Returns the success message (or throws) so ResetPasswordScreen can render its own states.
  const handleResetPassword = (token, newPassword) =>
    api.send(`/auth/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    }).then(d => d.message);

  const goToSignIn = () => {
    window.history.replaceState({}, '', '/');
    setResetToken(null);
    setForgotMode(false); setForgotMsg('');
  };

  const handleLogout = () => {
    setCurrentUser(null); setToken(null);
    localStorage.removeItem('bSmartSession');
    localStorage.removeItem('bSmartActiveWorkspace');
  };

  // WORK ITEMS
  const handleCreate = () => {
    if (!newItem.title || newItem.title.length < 3) { setCreateError('Title must be at least 3 characters.'); return; }
    setCreateError('');
    const tags = newItem.tags ? newItem.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    const projectId = newItem.projectId || (projects.length > 0 ? projects[0].id : 'PROJ-WORKS');
    api.send(`/work-items`, {
      method: 'POST',
      body: JSON.stringify({
        ...newItem,
        tags,
        dueDate: newItem.dueDate || null,
        assigneeId: newItem.assigneeId || null,
        parentId: newItem.parentId || null,
        projectId,
        priority: newItem.priority || 'MEDIUM',
      })
    }).then(saved => {
      setWorkItems(prev => [...prev, saved]);
      setNewItem({ title: '', type: 'Task', description: '', assigneeId: '', dueDate: '', tags: '', priority: 'MEDIUM', parentId: '', projectId: '' });
      setIsCreateOpen(false);
      showToast('Work item created');
    }).catch(err => setCreateError(err.message));
  };

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
  const handleDrop = (e, newStatus) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('itemId');
    const item = workItems.find(i => i.id === itemId);
    if (!item || item.status === newStatus) return;
    // Optimistic update
    setWorkItems(prev => prev.map(i => i.id === itemId ? { ...i, status: newStatus } : i));
    api.send(`/work-items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify({ ...item, status: newStatus })
    }).catch(() => {
      // Revert on failure
      setWorkItems(prev => prev.map(i => i.id === itemId ? { ...i, status: item.status } : i));
      showToast('Failed to update status', 'error');
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

  // SEARCH
  useEffect(() => {
    if (!searchQuery.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSearchResults([]);
      return;
    }
    const t = setTimeout(() => {
      api.raw(`/work-items/search?q=${encodeURIComponent(searchQuery)}`)
        .then(r => r.json()).then(d => setSearchResults(Array.isArray(d) ? d : [])).catch(reportError);
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // PROJECTS
  const handleCreateProject = () => {
    if (!newProject.name || !newProject.keyPrefix) { setCreateError('Name and key prefix required.'); return; }
    setCreateError('');
    api.send(`/projects`, { method: 'POST', body: JSON.stringify(newProject) })
      .then(p => {
        setProjects(prev => [...prev, p]);
        setNewProject({ name: '', keyPrefix: '', description: '' });
        setIsProjectOpen(false);
        showToast('Project created');
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

  // SPRINT FUNCTIONS
  function fetchSprints(projectId = 'PROJ-WORKS') {
    api.raw(`/sprints?projectId=${projectId}`)
      .then(r => r.json()).then(d => {
        const list = Array.isArray(d) ? d : [];
        setSprints(list);
        const active = list.find(s => s.status === 'ACTIVE') || list[0];
        if (active) { setActiveSprint(active); fetchSprintItems(active.id); }
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
    api.raw(`/saved-filters`)
      .then(r => r.json()).then(d => setSavedFilters(Array.isArray(d) ? d : [])).catch(reportError);
  }

  function fetchVelocityData() {
    api.raw(`/sprints/velocity`)
      .then(r => r.json()).then(d => setVelocityData(Array.isArray(d) ? d : [])).catch(reportError);
  }

  // ── Iteration 6 — custom dashboards ──────────────────────────────────────────
  function fetchCustomDashboards() {
    api.raw(`/dashboards`)
      .then(r => r.json()).then(d => setCustomDashboards(Array.isArray(d) ? d : [])).catch(reportError);
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

  function createDashboard() {
    const name = prompt('Dashboard name'); // simple capture; inline form is a later refinement
    if (!name || !name.trim()) return;
    api.send(`/dashboards`, { method: 'POST', body: JSON.stringify({ name: name.trim(), scope: 'PERSONAL', workspaceId: activeWorkspaceId }) })
      .then(d => { showToast('Dashboard created'); fetchCustomDashboards(); openDashboard(d.id); setDashboardEditMode(true); })
      .catch(() => showToast('Failed to create dashboard', 'error'));
  }

  function deleteDashboard(id) {
    api.send(`/dashboards/${id}`, { method: 'DELETE' })
      .then(() => { showToast('Dashboard deleted'); setSelectedDashboard(null); fetchCustomDashboards(); })
      .catch(() => showToast('Failed to delete dashboard', 'error'));
  }

  // ── Iteration 6 — custom reports ─────────────────────────────────────────────
  function fetchReports() {
    api.raw(`/reports`).then(r => r.json()).then(d => setReports(Array.isArray(d) ? d : [])).catch(reportError);
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
  function createBlankReport() {
    const name = prompt('Report name'); // simple capture; inline form is a later refinement
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

  // ── Iteration 7 — Compliance Rules Engine (Cap K) ────────────────────────────
  const COMPLIANCE_WS = 'WS-001';
  function fetchComplianceRules() {
    api.raw(`/compliance/rules?workspaceId=${COMPLIANCE_WS}`).then(r => r.json())
      .then(d => setComplianceRules(Array.isArray(d) ? d : [])).catch(reportError);
  }
  function fetchComplianceTemplates() {
    api.raw(`/compliance/rules/templates`).then(r => r.json())
      .then(d => setComplianceTemplates(Array.isArray(d) ? d : [])).catch(reportError);
  }
  function fetchComplianceViolations(status = violationFilter) {
    const qs = status ? `&status=${status}` : '';
    api.raw(`/compliance/violations?workspaceId=${COMPLIANCE_WS}${qs}`).then(r => r.json())
      .then(d => { setComplianceViolations(Array.isArray(d) ? d : []); setSelectedViolations([]); }).catch(reportError);
  }
  function fetchComplianceDashboard() {
    api.raw(`/compliance/dashboard?workspaceId=${COMPLIANCE_WS}`).then(r => r.json())
      .then(d => setComplianceDashboard(d)).catch(reportError);
  }
  function fetchComplianceAudit() {
    api.raw(`/compliance/audit?workspaceId=${COMPLIANCE_WS}`).then(r => r.json())
      .then(d => setComplianceAudit(Array.isArray(d) ? d : [])).catch(reportError);
  }
  function newRuleBuilder() {
    setRuleTestResult(null);
    setRuleBuilder({ name: '', description: '', scopeBql: '', assertionBql: '', severity: 'MEDIUM',
      evaluationMode: 'CONTINUOUS', escalateAfterHours: '', notifyOwner: true, notifyAdmin: false });
  }
  function editRuleBuilder(rule) {
    setRuleTestResult(null);
    const notify = (() => { try { return JSON.parse(rule.notifyTo || '[]'); } catch { return []; } })();
    const types = notify.map(t => (typeof t === 'string' ? t : t.type));
    setRuleBuilder({ id: rule.id, name: rule.name || '', description: rule.description || '',
      scopeBql: rule.scopeBql || '', assertionBql: rule.assertionBql || '', severity: rule.severity || 'MEDIUM',
      evaluationMode: rule.evaluationMode || 'CONTINUOUS',
      escalateAfterHours: rule.escalateAfterHours ?? '',
      notifyOwner: types.includes('ITEM_OWNER'), notifyAdmin: types.includes('PROJECT_ADMIN') });
  }
  function buildNotifyTo(b) {
    const targets = [];
    if (b.notifyOwner) targets.push({ type: 'ITEM_OWNER' });
    if (b.notifyAdmin) targets.push({ type: 'PROJECT_ADMIN' });
    return JSON.stringify(targets);
  }
  function saveRule() {
    const b = ruleBuilder;
    if (!b.name.trim() || !b.assertionBql.trim()) { showToast('Name and assertion are required', 'error'); return; }
    const payload = {
      workspaceId: COMPLIANCE_WS, name: b.name.trim(), description: b.description,
      scopeBql: b.scopeBql, assertionBql: b.assertionBql, severity: b.severity,
      evaluationMode: b.evaluationMode, notifyTo: buildNotifyTo(b),
      escalateAfterHours: b.escalateAfterHours === '' ? null : Number(b.escalateAfterHours),
    };
    const req = b.id
      ? api.send(`/compliance/rules/${b.id}`, { method: 'PUT', body: JSON.stringify(payload) })
      : api.send(`/compliance/rules`, { method: 'POST', body: JSON.stringify(payload) });
    req.then(() => { showToast(b.id ? 'Rule updated' : 'Rule created'); setRuleBuilder(null); fetchComplianceRules(); })
      .catch(e => showToast(e.message || 'Failed to save rule', 'error'));
  }
  function testRule(id) {
    api.send(`/compliance/rules/${id}/test`, { method: 'POST' })
      .then(d => { setRuleTestResult(d); showToast(d.valid ? `Would flag ${d.violations} item(s)` : 'Rule did not validate', d.valid ? 'success' : 'error'); })
      .catch(e => showToast(e.message || 'Test failed', 'error'));
  }
  function setRuleActive(id, active) {
    api.send(`/compliance/rules/${id}/${active ? 'activate' : 'deactivate'}`, { method: 'POST' })
      .then(() => { showToast(active ? 'Rule activated' : 'Rule deactivated'); fetchComplianceRules(); })
      .catch(e => showToast(e.message || 'Failed', 'error'));
  }
  function evaluateRule(id) {
    api.send(`/compliance/rules/${id}/evaluate`, { method: 'POST' })
      .then(d => { showToast(`Evaluated: ${d.opened} opened, ${d.resolved} resolved`); fetchComplianceViolations(); fetchComplianceDashboard(); })
      .catch(e => showToast(e.message || 'Evaluation failed', 'error'));
  }
  function cloneTemplate(templateId) {
    api.send(`/compliance/rules/from-template/${templateId}?workspaceId=${COMPLIANCE_WS}`, { method: 'POST' })
      .then(() => { showToast('Rule added from template'); fetchComplianceRules(); })
      .catch(e => showToast(e.message || 'Failed to clone template', 'error'));
  }
  function deleteRule(id) {
    api.send(`/compliance/rules/${id}`, { method: 'DELETE' })
      .then(() => { showToast('Rule deleted'); fetchComplianceRules(); })
      .catch(e => showToast(e.message || 'Failed to delete', 'error'));
  }
  function actOnViolation(id, action, note) {
    const body = note ? JSON.stringify({ note }) : undefined;
    api.send(`/compliance/violations/${id}/${action}`, { method: 'POST', body })
      .then(() => { showToast('Violation updated'); fetchComplianceViolations(); fetchComplianceDashboard(); })
      .catch(e => showToast(e.message || 'Failed', 'error'));
  }
  function bulkAcknowledge() {
    if (selectedViolations.length === 0) return;
    api.send(`/compliance/violations/bulk-acknowledge`, { method: 'POST', body: JSON.stringify({ ids: selectedViolations }) })
      .then(d => { showToast(`Acknowledged ${d.acknowledged} violation(s)`); fetchComplianceViolations(); fetchComplianceDashboard(); })
      .catch(e => showToast(e.message || 'Bulk acknowledge failed', 'error'));
  }
  function toggleViolationSelect(id) {
    setSelectedViolations(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }
  function exportComplianceAudit() {
    api.raw(`/compliance/audit/export?workspaceId=${COMPLIANCE_WS}`)
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'compliance-audit.csv'; a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => showToast('Export failed', 'error'));
  }
  // ── Service Desk (iteration 9, Cap N + Cap M) ────────────────────────────────────
  const [serviceTab, setServiceTab] = useState('queues');
  const [serviceQueue, setServiceQueue] = useState('open');
  const [serviceRequests, setServiceRequests] = useState([]);
  const [serviceCustomers, setServiceCustomers] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [serviceTiers, setServiceTiers] = useState([]);
  const [serviceCsat, setServiceCsat] = useState(null);
  const [newCustomer, setNewCustomer] = useState(null);
  function fetchServiceRequests(q = serviceQueue) {
    api.raw(`/service/requests?workspaceId=${activeWorkspaceId}&queue=${q}`).then(r => r.json())
      .then(d => setServiceRequests(Array.isArray(d) ? d : [])).catch(reportError);
  }
  function fetchServiceCustomers() {
    api.raw(`/service/customers?workspaceId=${activeWorkspaceId}`).then(r => r.json())
      .then(d => setServiceCustomers(Array.isArray(d) ? d : [])).catch(reportError);
  }
  function fetchServiceTypes() {
    api.raw(`/service/request-types?workspaceId=${activeWorkspaceId}`).then(r => r.json())
      .then(d => setServiceTypes(Array.isArray(d) ? d : [])).catch(reportError);
  }
  function fetchServiceTiers() {
    api.raw(`/service/sla-tiers?workspaceId=${activeWorkspaceId}`).then(r => r.json())
      .then(d => setServiceTiers(Array.isArray(d) ? d : [])).catch(reportError);
  }
  function fetchServiceCsat() {
    api.raw(`/service/csat?workspaceId=${activeWorkspaceId}`).then(r => r.json())
      .then(d => setServiceCsat(d)).catch(reportError);
  }
  function assignServiceRequest(id) {
    api.send(`/service/requests/${id}/assign`, { method: 'POST', body: JSON.stringify({}) })
      .then(() => { showToast('Assigned to you'); fetchServiceRequests(); })
      .catch(e => showToast(e.message || 'Assign failed', 'error'));
  }
  function transitionServiceRequest(id, status) {
    api.send(`/service/requests/${id}/transition`, { method: 'POST', body: JSON.stringify({ status }) })
      .then(() => { showToast('Request updated'); fetchServiceRequests(); })
      .catch(e => showToast(e.message || 'Update failed', 'error'));
  }
  function createServiceCustomer() {
    api.send(`/service/customers`, { method: 'POST', body: JSON.stringify({ ...newCustomer, workspaceId: activeWorkspaceId }) })
      .then(() => { showToast('Customer created'); setNewCustomer(null); fetchServiceCustomers(); })
      .catch(e => showToast(e.message || 'Create failed', 'error'));
  }
  function fetchStatusDurations(itemId) {
    setStatusDurations([]);
    api.raw(`/work-items/${itemId}/status-durations`).then(r => r.json())
      .then(d => setStatusDurations(Array.isArray(d) ? d : [])).catch(reportError);
  }
  const severityClass = {
    CRITICAL: 'bg-semantic-danger text-white',
    HIGH:     'bg-brand-orange text-white',
    MEDIUM:   'bg-semantic-warning text-white',
    LOW:      'bg-brand-navy-tint text-white',
    INFO:     'bg-neutral-200 text-neutral-700',
  };
  const vStatusClass = {
    OPEN:         'bg-semantic-danger text-white',
    ACKNOWLEDGED: 'bg-semantic-warning text-white',
    RESOLVED:     'bg-semantic-success text-white',
    WONT_FIX:     'bg-neutral-300 text-neutral-700',
  };
  function humanDuration(seconds) {
    if (seconds == null) return '—';
    const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60);
    if (h >= 24) { const d = Math.floor(h / 24); return `${d}d ${h % 24}h`; }
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m`;
    return `${seconds}s`;
  }
  function addReportSection(type) {
    const defaults = {
      kpi:       { title: 'Open items', config: { metric: 'count', filter: { open: true } } },
      chart:     { title: 'By status', config: { chartType: 'bar', dimension: 'status' } },
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
        setBrandingColor(d.primaryColor || '#E94E1B');
        setBrandingDesc(d.description || '');
        // Apply brand color as CSS variable
        document.documentElement.style.setProperty('--brand-action', d.primaryColor || '#E94E1B');
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
      .then(r => r.json()).then(() => { loadWorkflowDetail(wfId); setNewStatusForm({ name: '', color: '#0B2F5C', category: 'IN_PROGRESS' }); }).catch(reportError);
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
    api.raw(`/work-item-types`, { method: 'POST', body: JSON.stringify({ ...newTypeForm, typeKey, color: '#6b7280', workspaceId: activeWorkspaceId }) })
      .then(r => r.json()).then(() => { fetchWorkItemTypes(); setShowTypeForm(false); setNewTypeForm({ label: '', typeKey: '', icon: 'package' }); }).catch(reportError);
  }
  function createRole() {
    if (!newRoleForm.name.trim()) return;
    api.raw(`/permission-schemes/roles`, { method: 'POST', body: JSON.stringify({ ...newRoleForm, workspaceId: activeWorkspaceId }) })
      .then(r => r.json()).then(() => { fetchRoles(); fetchPermMatrix(); setShowRoleForm(false); setNewRoleForm({ name: '', tier: 2 }); }).catch(reportError);
  }
  function runBql() {
    setBqlError('');
    api.raw(`/bql/execute`, { method: 'POST', body: JSON.stringify({ query: bqlQuery }) })
      .then(r => r.json()).then(d => {
        if (d.error) { setBqlError(d.error); setBqlResults([]); }
        else setBqlResults(Array.isArray(d) ? d : []);
      }).catch(err => setBqlError(err.message));
  }
  function fetchBqlFilters() {
    api.raw(`/bql/filters`)
      .then(r => r.json()).then(d => setBqlFilters(Array.isArray(d) ? d : [])).catch(reportError);
  }
  function saveBqlFilter() {
    if (!bqlFilterName.trim() || !bqlQuery.trim()) return;
    api.raw(`/bql/filters`, { method: 'POST', body: JSON.stringify({ name: bqlFilterName, query: bqlQuery, isShared: false }) })
      .then(r => r.json()).then(f => { setBqlFilters(prev => [f, ...prev]); setBqlFilterName(''); showToast('Filter saved'); })
      .catch(() => showToast('Failed to save filter', 'error'));
  }

  // ---- Iteration 4 fetches ----
  function fetchRaidDashboard(pid) {
    if (!pid) return;
    api.raw(`/raid-dashboard?projectId=${pid}`)
      .then(r => r.json()).then(setRaidDashboard).catch(reportError);
  }
  function fetchRisks(pid)       { api.raw(`/risks?projectId=${pid}`).then(r => r.json()).then(d => setRisks(Array.isArray(d) ? d : [])).catch(reportError); }
  function fetchAssumptions(pid) { api.raw(`/assumptions?projectId=${pid}`).then(r => r.json()).then(d => setAssumptions(Array.isArray(d) ? d : [])).catch(reportError); }
  function fetchPmIssues(pid)    { api.raw(`/pm-issues?projectId=${pid}`).then(r => r.json()).then(d => setPmIssues(Array.isArray(d) ? d : [])).catch(reportError); }
  function fetchDependencies(pid){ api.raw(`/dependencies?projectId=${pid}`).then(r => r.json()).then(d => setDependencies(Array.isArray(d) ? d : [])).catch(reportError); }
  function fetchDecisions(pid)   { api.raw(`/decisions?projectId=${pid}`).then(r => r.json()).then(d => setDecisions(Array.isArray(d) ? d : [])).catch(reportError); }
  function fetchMeetings(pid)    { api.raw(`/meetings?projectId=${pid}`).then(r => r.json()).then(d => setMeetings(Array.isArray(d) ? d : [])).catch(reportError); }
  function fetchActionItems(pid) { api.raw(`/action-items?projectId=${pid}`).then(r => r.json()).then(d => setActionItems(Array.isArray(d) ? d : [])).catch(reportError); }
  function fetchStakeholders(pid){ api.raw(`/stakeholders?projectId=${pid}`).then(r => r.json()).then(d => setStakeholders(Array.isArray(d) ? d : [])).catch(reportError); }
  function fetchLessons(pid)     { api.raw(`/lessons-learned?projectId=${pid}`).then(r => r.json()).then(d => setLessonsLearned(Array.isArray(d) ? d : [])).catch(reportError); }

  function pmCreate(type, payload) {
    const endpoints = {
      risk: 'risks', assumption: 'assumptions', issue: 'pm-issues', dependency: 'dependencies',
      decision: 'decisions', meeting: 'meetings', action: 'action-items', stakeholder: 'stakeholders', lesson: 'lessons-learned'
    };
    const ep = endpoints[type];
    if (!ep) return;
    api.raw(`/${ep}`, { method: 'POST', body: JSON.stringify({ ...payload, projectId: pmProjectId, workspaceId: activeWorkspaceId }) })
      .then(r => r.json()).then(() => {
        setPmFormOpen(null); setPmForm({});
        if (type === 'risk')        { fetchRisks(pmProjectId); fetchRaidDashboard(pmProjectId); }
        if (type === 'assumption')  { fetchAssumptions(pmProjectId); fetchRaidDashboard(pmProjectId); }
        if (type === 'issue')       { fetchPmIssues(pmProjectId); fetchRaidDashboard(pmProjectId); }
        if (type === 'dependency')  { fetchDependencies(pmProjectId); fetchRaidDashboard(pmProjectId); }
        if (type === 'decision')    { fetchDecisions(pmProjectId); }
        if (type === 'meeting')     { fetchMeetings(pmProjectId); }
        if (type === 'action')      { fetchActionItems(pmProjectId); }
        if (type === 'stakeholder') { fetchStakeholders(pmProjectId); }
        if (type === 'lesson')      { fetchLessons(pmProjectId); }
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
    api.raw(`/${ep}/${id}`, { method: 'DELETE' }).then(() => {
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

  // ── Iteration 3 completions ──────────────────────────────────────────────────

  function fetchFieldValues(workItemId) {
    api.raw(`/work-items/${workItemId}/field-values`)
      .then(r => r.json()).then(d => {
        const map = {};
        (Array.isArray(d) ? d : []).forEach(fv => { map[fv.fieldDefId] = fv.value; });
        setFieldValues(map);
      }).catch(reportError);
  }

  function saveFieldValue(workItemId, fieldDefId, value) {
    api.send(`/work-items/${workItemId}/field-values`, {
      method: 'POST', body: JSON.stringify({ fieldDefId, value })
    }).catch(reportError);
  }

  function fetchFieldLayouts() {
    api.raw(`/field-layouts`).then(r => r.json()).then(d => setFieldLayouts(Array.isArray(d) ? d : [])).catch(reportError);
  }

  function fetchFieldVisibility() {
    api.raw(`/field-visibility`).then(r => r.json()).then(d => setFieldVisibility(Array.isArray(d) ? d : [])).catch(reportError);
  }

  function saveFieldVisibility() {
    if (!newFieldVisForm.fieldDefId || !newFieldVisForm.roleId) { showToast('Select field and role', 'error'); return; }
    api.send(`/field-visibility`, { method: 'POST', body: JSON.stringify(newFieldVisForm) })
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

  // ── Iteration 5 — Knowledge Repository ──────────────────────────────────────

  function fetchKnowledgeSpaces() {
    api.raw(`/knowledge-spaces`).then(r => r.json()).then(d => setKnowledgeSpaces(Array.isArray(d) ? d : [])).catch(reportError);
  }

  function fetchKnowledgeArticles(spaceId) {
    const url = spaceId ? `/knowledge-spaces/${spaceId}/articles` : `/articles`;
    api.raw(url).then(r => r.json()).then(d => setKnowledgeArticles(Array.isArray(d) ? d : [])).catch(reportError);
  }

  function fetchArticleVersions(articleId) {
    api.raw(`/articles/${articleId}/versions`)
      .then(r => r.json()).then(d => setArticleVersions(Array.isArray(d) ? d : [])).catch(reportError);
  }

  function createKnowledgeSpace() {
    if (!spaceForm.name) { showToast('Space name is required', 'error'); return; }
    api.send(`/knowledge-spaces`, { method: 'POST', body: JSON.stringify({ ...spaceForm, workspaceId: activeWorkspaceId }) })
      .then(() => { showToast('Space created'); setIsSpaceFormOpen(false); setSpaceForm({ name: '', description: '', visibility: 'TEAM' }); fetchKnowledgeSpaces(); })
      .catch(() => showToast('Failed to create space', 'error'));
  }

  function deleteKnowledgeSpace(id) {
    api.send(`/knowledge-spaces/${id}`, { method: 'DELETE' })
      .then(() => { showToast('Space deleted'); if (selectedSpace?.id === id) { setSelectedSpace(null); setKnowledgeArticles([]); } fetchKnowledgeSpaces(); })
      .catch(() => showToast('Failed to delete space', 'error'));
  }

  function createArticle() {
    if (!articleForm.title) { showToast('Title is required', 'error'); return; }
    api.send(`/articles`, { method: 'POST', body: JSON.stringify({ ...articleForm, spaceId: selectedSpace?.id, workspaceId: activeWorkspaceId }) })
      .then(() => { showToast('Article created'); setIsArticleFormOpen(false); setArticleForm({ title: '', content: '', templateType: 'KB', status: 'DRAFT' }); fetchKnowledgeArticles(selectedSpace?.id); })
      .catch(() => showToast('Failed to create article', 'error'));
  }

  function updateArticle(id, patch) {
    api.send(`/articles/${id}`, { method: 'PUT', body: JSON.stringify(patch) })
      .then(d => { setSelectedArticle(d); showToast('Article saved'); fetchKnowledgeArticles(selectedSpace?.id); })
      .catch(() => showToast('Failed to save article', 'error'));
  }

  // Publishing workflow: DRAFT → IN_REVIEW → PUBLISHED → ARCHIVED.
  function articleWorkflow(id, action, successMsg) {
    api.send(`/articles/${id}/${action}`, { method: 'PUT' })
      .then(d => { setSelectedArticle(d); showToast(successMsg); fetchKnowledgeArticles(selectedSpace?.id); })
      .catch(e => showToast(e.message || 'Action failed', 'error'));
  }
  const submitArticleForReview = id => articleWorkflow(id, 'submit',  'Submitted for review');
  const publishArticle        = id => articleWorkflow(id, 'publish', 'Article published');
  const rejectArticle         = id => articleWorkflow(id, 'reject',  'Returned to draft');
  const archiveArticle        = id => articleWorkflow(id, 'archive', 'Article archived');
  const restoreArticle        = id => articleWorkflow(id, 'restore', 'Article restored to draft');

  function fetchArticleComments(articleId) {
    api.raw(`/articles/${articleId}/comments`)
      .then(r => r.json()).then(d => setArticleComments(Array.isArray(d) ? d : [])).catch(reportError);
  }

  function addArticleComment(articleId) {
    const body = newArticleComment.trim();
    if (!body) return;
    api.send(`/articles/${articleId}/comments`, { method: 'POST', body: JSON.stringify({ body }) })
      .then(() => { setNewArticleComment(''); fetchArticleComments(articleId); })
      .catch(() => showToast('Failed to add comment', 'error'));
  }

  function toggleArticleComment(articleId, commentId, resolved) {
    api.send(`/articles/${articleId}/comments/${commentId}/resolve`, { method: 'PUT', body: JSON.stringify({ resolved }) })
      .then(() => fetchArticleComments(articleId))
      .catch(() => showToast('Failed to update comment', 'error'));
  }

  function deleteArticleComment(articleId, commentId) {
    api.send(`/articles/${articleId}/comments/${commentId}`, { method: 'DELETE' })
      .then(() => fetchArticleComments(articleId))
      .catch(() => showToast('Failed to delete comment', 'error'));
  }

  function fetchArticleAnalytics(articleId) {
    api.raw(`/articles/${articleId}/analytics`)
      .then(r => r.json()).then(d => setArticleAnalytics(d)).catch(() => setArticleAnalytics(null));
  }

  function openArticlePanel(panel) {
    setArticlePanel(prev => {
      const next = prev === panel ? null : panel;
      if (next === 'history' && selectedArticle) fetchArticleVersions(selectedArticle.id);
      if (next === 'comments' && selectedArticle) fetchArticleComments(selectedArticle.id);
      if (next === 'analytics' && selectedArticle) fetchArticleAnalytics(selectedArticle.id);
      return next;
    });
  }

  function deleteArticle(id) {
    api.send(`/articles/${id}`, { method: 'DELETE' })
      .then(() => { showToast('Article deleted'); setSelectedArticle(null); setEditingArticle(false); fetchKnowledgeArticles(selectedSpace?.id); })
      .catch(() => showToast('Failed to delete article', 'error'));
  }

  function searchKnowledge() {
    if (!knowledgeSearch.trim()) return;
    api.raw(`/articles?search=${encodeURIComponent(knowledgeSearch.trim())}`)
      .then(r => r.json()).then(d => setKnowledgeSearchResults(Array.isArray(d) ? d : [])).catch(reportError);
  }

  // ── Iteration 6 — Dashboards ─────────────────────────────────────────────────

  function fetchDashboard(role) {
    setDashLoading(true);
    const wsId = activeWorkspaceId;
    const uid = currentUser?.id;
    let url;
    if (role === 'developer') url = `/dashboards/developer?userId=${uid}`;
    else if (role === 'scrum-master') url = `/dashboards/scrum-master?workspaceId=${wsId}`;
    else if (role === 'product-owner') url = `/dashboards/product-owner?workspaceId=${wsId}`;
    else if (role === 'executive') url = `/dashboards/executive?workspaceId=${wsId}`;
    else if (role === 'admin') url = `/dashboards/admin?workspaceId=${wsId}`;
    api.raw(url).then(r => r.json()).then(d => {
      if (role === 'developer') setDeveloperDash(d);
      else if (role === 'scrum-master') setSmDash(d);
      else if (role === 'product-owner') setPoDash(d);
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
  function openCockpit() {
    setView('smcockpit');
    const pid = i15ProjectId || (projects[0] && projects[0].id) || '';
    setI15ProjectId(pid);
    if (pid) { fetchImpediments(pid); fetchStandups(pid); fetchRetros(pid); fetchSprints(pid); }
  }
  function fetchImpediments(pid) {
    api.raw(`/impediments?projectId=${pid}`).then(r => r.json())
      .then(d => setImpediments(Array.isArray(d) ? d : [])).catch(() => setImpediments([]));
  }
  function createImpediment() {
    if (!newImpediment.title.trim()) { showToast('Title is required', 'error'); return; }
    api.send(`/impediments`, { method: 'POST', body: JSON.stringify({ ...newImpediment, projectId: i15ProjectId }) })
      .then(() => { showToast('Impediment raised'); setNewImpediment({ title: '', severity: 'MEDIUM', category: '', description: '' }); fetchImpediments(i15ProjectId); })
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
  function runSprintPlanning() {
    api.send(`/cockpit/sprint-planning?workspaceId=${activeWorkspaceId}`, { method: 'POST', body: JSON.stringify({ projectId: i15ProjectId, timeOffPoints: Number(planningTimeOff) || 0 }) })
      .then(d => setPlanningResult(d)).catch(() => showToast('Planning helper failed', 'error'));
  }
  function runRiskPanel() {
    if (!riskSprintId) { showToast('Select a sprint', 'error'); return; }
    api.raw(`/cockpit/risk-panel?workspaceId=${activeWorkspaceId}&sprintId=${riskSprintId}`).then(r => r.json())
      .then(d => setRiskPanel(d)).catch(() => showToast('Risk panel failed', 'error'));
  }
  function runReviewPrep() {
    if (!reviewSprintId) { showToast('Select a sprint', 'error'); return; }
    api.send(`/cockpit/review-prep?workspaceId=${activeWorkspaceId}`, { method: 'POST', body: JSON.stringify({ sprintId: reviewSprintId }) })
      .then(d => setReviewResult(d)).catch(() => showToast('Review prep failed', 'error'));
  }
  function runPatterns() {
    api.send(`/cockpit/patterns?workspaceId=${activeWorkspaceId}`, { method: 'POST', body: JSON.stringify({ projectId: i15ProjectId }) })
      .then(d => setPatternsResult(d)).catch(() => showToast('Pattern detection failed', 'error'));
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

  function permanentDelete(id) {
    if (!window.confirm('Permanently delete? This cannot be undone.')) return;
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
    api.raw(`/saved-filters`, {
      method: 'POST',
      body: JSON.stringify({ name: saveFilterName, filterJson: JSON.stringify(activeFilter), isShared: false })
    }).then(r => r.json()).then(f => { setSavedFilters(prev => [...prev, f]); setSaveFilterName(''); setShowSaveFilter(false); });
  };

  const applyFilter = (items) => {
    if (!activeFilter) return items;
    if (activeFilter.type === 'mine') return items.filter(i => i.assigneeId === currentUser.id);
    if (activeFilter.type === 'priority') return items.filter(i => i.priority === activeFilter.value);
    if (activeFilter.type === 'itemType') return items.filter(i => i.type === activeFilter.value);
    if (activeFilter.type === 'blockers') return items.filter(i => i.priority === 'CRITICAL' || i.type === 'Incident');
    return items;
  };

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

  // PROJECT ARCHIVE
  const handleArchiveProject = (projectId) => {
    api.raw(`/projects/${projectId}/archive`, { method: 'PUT', headers: headers() })
      .then(r => r.json()).then(p => setProjects(prev => prev.map(x => x.id === p.id ? p : x)));
  };

  const columns = [
    { name: 'Todo',        dot: 'bg-neutral-400',     limitKey: 'todoLimit' },
    { name: 'In Progress', dot: 'bg-brand-navy-tint',  limitKey: 'inProgressLimit' },
    { name: 'Done',        dot: 'bg-semantic-success', limitKey: 'doneLimit' },
  ];

  const densityPad = { compact: 'p-2', comfortable: 'p-3', spacious: 'p-4' };
  const userName = u => users.find(x => x.id === u)?.fullName || '';
  const myItems  = workItems.filter(i => i.assigneeId === currentUser?.id);

  // Public, unauthenticated, read-only dashboard embed (?share=<token>) — short-circuits
  // before the auth gate so it renders without a login (iteration 6).
  const shareToken = new URLSearchParams(window.location.search).get('share');
  if (shareToken) return <PublicDashboardEmbed token={shareToken} />;

  // Password-reset link (forgot-password flow) — renders without a session.
  if (resetToken !== null) {
    return <ResetPasswordScreen token={resetToken} onSubmit={handleResetPassword} onBackToSignIn={goToSignIn} />;
  }

  // ==========================================
  // AUTH SCREENS
  // ==========================================
  if (!currentUser) {
    // Email verification pending screen
    if (verifyPending) return (
      <div className="flex h-screen bg-neutral-50 dark:bg-neutral-900 items-center justify-center font-sans">
        <div className="bg-white dark:bg-neutral-800 p-8 rounded-xl shadow-xl w-96 border border-neutral-200 dark:border-neutral-700">
          <div className="flex justify-center mb-6"><Logo /></div>
          <div className="h-10 w-10 rounded-xl bg-semantic-success-surface flex items-center justify-center mx-auto mb-4"><Mail className="h-5 w-5 text-semantic-success" /></div>
          <h2 className="text-xl font-bold text-brand-navy text-center mb-2">Check your email</h2>
          <p className="text-sm text-neutral-600 text-center mb-5">
            We sent a verification link to <strong>{verifyPending.email}</strong>.<br/>
            Click it to activate your account.
          </p>
          {verifyMsg && <p className="text-sm text-semantic-danger text-center mb-3">{verifyMsg}</p>}
          {/* DEV/UAT only — show token so testers can verify without email */}
          {verifyPending.devToken && (
            <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg p-3 mb-4">
              <p className="text-xs text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-1">UAT — One-click verify</p>
              <button onClick={() => handleVerifyEmail(verifyPending.devToken)}
                className="w-full py-2 bg-brand-navy text-white rounded-lg text-sm font-semibold hover:bg-brand-navy/90 transition-colors">
                <Check className="inline-block h-4 w-4 mr-1 align-text-bottom" aria-hidden="true" />Verify my email (UAT shortcut)
              </button>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-2 text-center">In production this arrives by email</p>
            </div>
          )}
          <button onClick={() => { setVerifyPending(null); setAuthMode('login'); }}
            className="w-full text-center text-sm text-neutral-600 dark:text-neutral-400 hover:text-brand-navy transition-colors">
            <ArrowLeft className="inline-block h-4 w-4 mr-1 align-text-bottom" aria-hidden="true" />Back to sign in
          </button>
        </div>
      </div>
    );

    // MFA challenge screen
    if (mfaChallenge) return (
      <div className="flex h-screen bg-neutral-50 dark:bg-neutral-900 items-center justify-center font-sans">
        <div className="bg-white dark:bg-neutral-800 p-8 rounded-xl shadow-xl w-96 border border-neutral-200 dark:border-neutral-700">
          <div className="flex justify-center mb-6"><Logo /></div>
          <div className="h-10 w-10 rounded-xl bg-semantic-info-surface flex items-center justify-center mx-auto mb-4"><ShieldCheck className="h-5 w-5 text-semantic-info" /></div>
          <h2 className="text-xl font-bold text-brand-navy text-center mb-2">Two-factor authentication</h2>
          <p className="text-sm text-neutral-600 text-center mb-5">Enter the 6-digit code from your authenticator app.</p>
          {mfaError && <p className="text-sm text-semantic-danger text-center mb-3">{mfaError}</p>}
          <input type="text" inputMode="numeric" maxLength={6} placeholder="000000"
            value={mfaCode} onChange={e => setMfaCode(e.target.value.replace(/\D/g,''))}
            onKeyDown={e => e.key === 'Enter' && mfaCode.length === 6 && handleMfaVerify()}
            className="input text-center text-2xl tracking-widest mb-4" autoFocus />
          <Button variant="action" fullWidth onClick={handleMfaVerify}
            disabled={mfaCode.length !== 6}>Verify Code</Button>
          <button onClick={() => { setMfaChallenge(null); setMfaCode(''); }}
            className="w-full mt-3 text-center text-sm text-neutral-600 dark:text-neutral-400 hover:text-brand-navy transition-colors">
            <ArrowLeft className="inline-block h-4 w-4 mr-1 align-text-bottom" aria-hidden="true" />Back to sign in
          </button>
        </div>
      </div>
    );

    if (forgotMode) return (
      <div className="flex h-screen bg-neutral-50 dark:bg-neutral-900 items-center justify-center font-sans">
        <div className="bg-white dark:bg-neutral-800 p-8 rounded-xl shadow-xl w-96 border border-neutral-200 dark:border-neutral-700">
          <div className="flex justify-center mb-6"><Logo /></div>
          <h2 className="text-xl font-bold text-brand-navy text-center mb-4">Reset Password</h2>
          {forgotMsg
            ? <div className="text-semantic-success bg-semantic-success-surface p-3 rounded text-sm text-center mb-4">{forgotMsg}</div>
            : <form onSubmit={handleForgotPassword} className="space-y-4">
                <input type="email" required placeholder="Your email address" value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)} className="input" />
                <Button type="submit" fullWidth>Send Reset Link</Button>
              </form>
          }
          <div className="mt-4 text-center">
            <button onClick={() => { setForgotMode(false); setForgotMsg(''); }}
              className="text-brand-orange text-sm font-bold hover:underline"><ArrowLeft className="inline-block h-4 w-4 mr-1 align-text-bottom" aria-hidden="true" />Back to Sign In</button>
          </div>
        </div>
      </div>
    );

    return (
      <div className="flex h-screen font-sans">
        {/* Brand canvas (mockup 01) — hero on dark; hidden below lg */}
        <div className="hidden lg:flex lg:flex-1 flex-col justify-between bg-gradient-to-br from-brand-navy to-brand-navy-tint p-12 text-white">
          <Logo variant="reverse" size="lg" />
          <div className="max-w-md">
            <h1 className="mb-4 text-4xl font-bold tracking-tight">Work, in rhythm.</h1>
            <p className="mb-8 text-base text-white/75">
              Plan, deliver, and prove it — with a project workspace built for utilities and engineering teams who run on work, not chaos.
            </p>
            <ul className="space-y-3">
              {[[ShieldCheck, 'Native compliance rules with full audit history'], [Gauge, 'Internal & external SLAs from one engine'], [TrendingUp, 'KPIs at every layer with privacy guardrails'], [Zap, 'No-code workflows, rules, and automations']].map(([Icon, label]) => (
                <li key={label} className="flex items-center gap-3 text-sm text-white/90">
                  <Icon aria-hidden="true" className="h-4 w-4 flex-shrink-0 text-brand-amber" />
                  {label}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-white/45">A BCITS product · 25 years of utility-grade reliability</p>
        </div>

        {/* Auth form panel */}
        <div className="flex w-full flex-col justify-center overflow-y-auto bg-white px-8 py-12 dark:bg-neutral-900 sm:px-12 lg:w-2/5 lg:px-16">
          <div className="mx-auto w-full max-w-sm">
            <div className="mb-8 lg:hidden"><Logo /></div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-navy-tint">
              {authMode === 'login' ? 'Sign in' : 'Get started'}
            </p>
            <h2 className="mb-1 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              {authMode === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="mb-6 text-sm text-neutral-600 dark:text-neutral-400">
              {authMode === 'login' ? 'Pick up where you left off.' : 'Start running your work in rhythm.'}
            </p>
            {authError && <div className="mb-4 rounded-md bg-semantic-danger-surface p-3 text-center text-sm text-semantic-danger">{authError}</div>}
            <form onSubmit={handleAuthSubmit} className="space-y-4">
            {authMode === 'signup' && (
              <Field label="Full Name">
                <input type="text" required value={authForm.fullName}
                  onChange={e => setAuthForm({ ...authForm, fullName: e.target.value })} className="input" autoFocus />
              </Field>
            )}
            <Field label="Email">
              <input type="email" required value={authForm.email}
                onChange={e => setAuthForm({ ...authForm, email: e.target.value })} className="input" />
            </Field>
            {authMode === 'signup' && (
              <Field label="Confirm Email">
                <input type="email" required value={confirmEmail}
                  onChange={e => setConfirmEmail(e.target.value)} className="input"
                  placeholder="Re-enter your email" />
              </Field>
            )}
            <Field label="Password">
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} required value={authForm.password}
                  onChange={e => setAuthForm({ ...authForm, password: e.target.value })}
                  className="input pr-10" placeholder={authMode === 'signup' ? 'Min. 8 characters' : ''} />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded"
                  tabIndex={-1}>
                  {showPassword
                    ? <EyeOff aria-hidden="true" className="h-4 w-4" />
                    : <Eye aria-hidden="true" className="h-4 w-4" />}
                </button>
              </div>
            </Field>
            {authMode === 'signup' && (
              <Field label="Confirm Password">
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} required value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="input pr-10" placeholder="Re-enter your password" />
                  {confirmPassword && (
                    <span className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-sm ${confirmPassword === authForm.password ? 'text-semantic-success' : 'text-semantic-danger'}`}>
                      {confirmPassword === authForm.password ? <Check className="h-4 w-4" aria-label="Passwords match" /> : <X className="h-4 w-4" aria-label="Passwords do not match" />}
                    </span>
                  )}
                </div>
              </Field>
            )}
            {authMode === 'login' && (
              <div className="-mt-1 flex justify-end">
                <button type="button" onClick={() => setForgotMode(true)} className="text-sm text-brand-navy-tint hover:underline">Forgot password?</button>
              </div>
            )}
            <Button type="submit" variant="primary" fullWidth>
              {authMode === 'login' ? 'Sign in' : 'Create account'}
            </Button>
          </form>
          {authMode === 'login' && (
            <div className="mt-5">
              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
                <span className="text-xs text-neutral-400">or continue with</span>
                <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {['Google', 'Microsoft'].map((p) => (
                  <button key={p} type="button" disabled title="Single sign-on is coming soon"
                    className="cursor-not-allowed rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                    {p}
                  </button>
                ))}
              </div>
              <button type="button" disabled title="Single sign-on is coming soon"
                className="mt-3 w-full cursor-not-allowed rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                Sign in with SAML SSO
              </button>
              <p className="mt-2 text-center text-xs text-neutral-400">Single sign-on is coming soon — use your work email for now.</p>
            </div>
          )}
          <div className="mt-6 text-center text-sm text-neutral-600 dark:text-neutral-400">
            {authMode === 'login' ? 'New to Works? ' : 'Already have an account? '}
            <button onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthError(''); setShowPassword(false); setConfirmEmail(''); setConfirmPassword(''); }}
              className="font-bold text-brand-orange hover:underline">
              {authMode === 'login' ? 'Create an account' : 'Log in'}
            </button>
          </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // MAIN APP
  // ==========================================

  // One dispatcher for sidebar navigation — preserves each destination's exact load side-effects
  // (the data each view needs) while the markup stays data-driven (NAV_GROUPS).
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
      case 'sprint': fetchSprints(); fetchSavedFilters(); break;
      case 'reports': fetchSprints(); fetchVelocityData(); break;
      case 'dashboards': setSelectedDashboard(null); fetchCustomDashboards(); fetchTeams(); break;
      case 'reportbuilder': setSelectedReport(null); fetchReports(); fetchReportTemplates(); break;
      case 'releases': fetchReleases(); break;
      case 'settings3': fetchWorkflows(); fetchFieldDefs(); fetchRoles(); fetchWorkItemTypes(); break;
      case 'bql': fetchBqlFilters(); break;
      case 'knowledge': fetchKnowledgeSpaces(); setKnowledgeTab('spaces'); setSelectedSpace(null); setSelectedArticle(null); break;
      case 'compliance': setComplianceTab('dashboard'); setRuleBuilder(null); fetchComplianceDashboard(); fetchComplianceRules(); fetchComplianceViolations(); break;
      case 'service': setServiceTab('queues'); setServiceQueue('open'); fetchServiceRequests('open'); break;
      case 'pm': if (projects.length) { const pid = projects[0].id; setPmProjectId(pid); fetchRaidDashboard(pid); fetchRisks(pid); fetchAssumptions(pid); fetchPmIssues(pid); fetchDependencies(pid); fetchDecisions(pid); fetchMeetings(pid); fetchActionItems(pid); fetchStakeholders(pid); fetchLessons(pid); } break;
      case 'smcockpit': openCockpit(); break;
      case 'poworkspace': openPoWorkspace(); break;
      case 'workspace': fetchMembers(); fetchNotifPrefs(); fetchBranding(); break;
      case 'trash': fetchTrash(); break;
      default: break;
    }
  };
  navigateRef.current = navigate; // keep the global shortcut handler pointed at the latest navigate

  // Commands for the Cmd-K palette: every destination + a couple of quick actions.
  const paletteCommands = [
    ...NAV_GROUPS.flatMap(g => g.items.map(item => ({
      id: `go-${item.id}`, label: item.label, group: g.label || 'Go to', Icon: item.Icon,
      run: () => navigate(item.id),
    }))),
    { id: 'act-create', label: 'Create work item', group: 'Action', Icon: ListTodo, keywords: ['new', 'add'],
      run: () => { setView('board'); setIsCreateOpen(true); } },
    { id: 'act-search', label: 'Search work items', group: 'Action', Icon: Search, keywords: ['find'],
      run: () => searchRef.current?.querySelector('input')?.focus() },
  ];

  return (
    <div className="flex h-screen bg-neutral-50 dark:bg-neutral-900 font-sans text-neutral-900 dark:text-neutral-100">

      {/* SIDEBAR — design-system navy nav (organisms/sidebar-nav.jsx).
          Desktop (md+): static, in-flow, width driven by collapse.
          Mobile (<md): off-canvas drawer toggled from the header, with a backdrop (G1). */}
      {mobileNavOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileNavOpen(false)}
          className="fixed inset-0 z-modal bg-black/40 md:hidden"
        />
      )}
      <aside
        className={`${navCollapsed ? 'w-sidebar-collapsed' : 'w-sidebar'} shrink-0
          fixed inset-y-0 left-0 z-modal transition-transform duration-base
          md:static md:z-auto md:translate-x-0 md:transition-[width] md:duration-fast
          ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <SidebarNav
          activeView={view}
          onNavigate={navigate}
          workspace={workspace}
          currentUser={currentUser}
          userRole={userRole.role}
          myItemCount={myItems.length}
          unreadCount={unreadCount}
          projectCount={projects.length}
          hasActiveSprint={Boolean(sprints.find(s => s.status === 'ACTIVE'))}
          collapsed={navCollapsed}
          onToggleCollapse={() => setNavCollapsed(c => !c)}
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
          workspacesLoading={wsLoading}
          workspacesError={wsError}
          onSwitchWorkspace={switchWorkspace}
          onRetryWorkspaces={fetchMyWorkspaces}
          onOpenWorkspaceSettings={() => { setView('workspace'); fetchMembers(); }}
        />
      </aside>

      {/* MAIN */}
      <main className="flex-1 flex flex-col min-w-0 dark:bg-neutral-900">
        {/* TOPBAR */}
        <header className="h-14 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between px-3 md:px-6 flex-shrink-0 relative">
          <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            aria-label="Open navigation"
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen(true)}
            className="md:hidden -ml-1 p-1.5 rounded-md text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40">
            <PanelLeft aria-hidden="true" className="h-5 w-5" />
          </button>
          <div className="relative" ref={searchRef}>
            <input type="text" placeholder="Search work items..." aria-label="Search work items"
              value={searchQuery}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-100 rounded-md px-3 py-1.5 w-40 sm:w-56 md:w-72 text-sm focus:outline-none focus:ring-1 focus:ring-brand-navy" />
            {searchOpen && searchResults.length > 0 && (
              <div className="absolute top-full mt-1 w-80 bg-white dark:bg-neutral-800 rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-700 z-50 max-h-64 overflow-y-auto">
                {searchResults.map(item => (
                  <button key={item.id} onClick={() => { setSelectedItem(item); setSearchQuery(''); setSearchOpen(false); }}
                    className="w-full text-left px-4 py-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-700 border-b border-neutral-100 dark:border-neutral-700 last:border-0">
                    <div className="flex items-center gap-2">
                      <TypeBadge type={item.type} compact />
                      <span className="font-mono text-xs text-neutral-600 dark:text-neutral-400">{item.id}</span>
                    </div>
                    <div className="text-sm text-neutral-900 font-medium mt-0.5">{item.title}</div>
                  </button>
                ))}
              </div>
            )}
            {searchOpen && searchQuery.trim() && searchResults.length === 0 && (
              <div className="absolute top-full mt-1 w-80 bg-white dark:bg-neutral-800 rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-700 z-50 px-4 py-6 text-center">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">No results for "<span className="text-neutral-700">{searchQuery}</span>"</p>
              </div>
            )}
            {searchOpen && !searchQuery.trim() && recentlyViewed.length > 0 && (
              <div className="absolute top-full mt-1 w-80 bg-white dark:bg-neutral-800 rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-700 z-50 max-h-64 overflow-y-auto">
                <div className="px-4 py-2 border-b border-neutral-100 dark:border-neutral-700">
                  <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">Recently Viewed</p>
                </div>
                {recentlyViewed.map(item => {
                  const full = workItems.find(i => i.id === item.id);
                  return (
                    <button key={item.id} onClick={() => { if (full) { setSelectedItem(full); } setSearchQuery(''); setSearchOpen(false); }}
                      className="w-full text-left px-4 py-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-700 border-b border-neutral-100 dark:border-neutral-700 last:border-0">
                      <div className="flex items-center gap-2">
                        <TypeBadge type={item.type} compact />
                        <span className="font-mono text-xs text-neutral-600 dark:text-neutral-400">{item.id}</span>
                      </div>
                      <div className="text-sm text-neutral-900 font-medium mt-0.5 truncate">{item.title}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setPaletteOpen(true)}
              aria-label="Open command palette"
              className="hidden sm:flex items-center gap-2 h-9 px-3 rounded-md border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:text-neutral-900 hover:border-neutral-400 dark:hover:text-neutral-100 transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 focus-visible:ring-offset-2">
              <Search aria-hidden="true" className="h-4 w-4" />
              <span className="text-xs">Quick find</span>
              <kbd className="text-xs font-mono bg-neutral-100 dark:bg-neutral-800 rounded px-1 border border-neutral-200 dark:border-neutral-700">⌘K</kbd>
            </button>
            <AiCommandBar
              workspaceId={activeWorkspaceId}
              onToast={showToast}
              onExecuted={() => { fetchAll(); fetchNotifications(); }}
            />
            {can('create_items') && (
              <Button variant="action" onClick={() => { setView('board'); setIsCreateOpen(true); }}>
                + Create
              </Button>
            )}
            <LanguageSwitcher className="hidden md:flex" />
            <button onClick={() => { setView('notifications'); fetchNotifications(); }}
              aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
              className="relative w-9 h-9 rounded-md flex items-center justify-center text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 focus-visible:ring-offset-2">
              <Bell aria-hidden="true" className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-brand-orange text-white text-xs font-bold flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <UserMenu
              user={currentUser}
              role={userRole.role}
              darkMode={darkMode}
              onToggleTheme={() => setDarkMode(d => !d)}
              onOpenSettings={() => { setView('workspace'); fetchMembers(); fetchNotifPrefs(); fetchBranding(); }}
              onLogout={handleLogout}
            />
          </div>
        </header>

        {/* CONTENT */}
        <div className="flex-1 overflow-auto dark:bg-neutral-900">

          {/* ======================================================
               ITERATION 6 — ROLE-TUNED DASHBOARD
             ====================================================== */}
          {view === 'dashboard' && (
            <DashboardView
              currentUser={currentUser}
              userRole={userRole}
              dashboardRole={dashboardRole}
              dashLoading={dashLoading}
              developerDash={developerDash}
              smDash={smDash}
              poDash={poDash}
              execDash={execDash}
              adminDash={adminDash}
              workItems={workItems}
              selectedItem={selectedItem}
              setIsCreateOpen={setIsCreateOpen}
              setDashboardRole={setDashboardRole}
              fetchDashboard={fetchDashboard}
              setView={setView}
              setSelectedItem={setSelectedItem}
              setIsWorklogOpen={setIsWorklogOpen}
              showToast={showToast}
              fetchBacklog={fetchBacklog}
              fetchSprints={fetchSprints}
              fetchMembers={fetchMembers}
            />
          )}

          {/* MY WORKS */}
          {view === 'myworks' && (
            <MyWorksView
              myItems={myItems}
              workItems={workItems}
              notifications={notifications}
              myWorksTab={myWorksTab}
              currentUser={currentUser}
              setMyWorksTab={setMyWorksTab}
              setSelectedItem={setSelectedItem}
              setIsCreateOpen={setIsCreateOpen}
              onPressKey={onPressKey}
            />
          )}

          {/* BOARD */}
          {view === 'board' && (
            <div className="p-6 h-full flex flex-col">
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h1 className="text-xl font-bold text-brand-navy">Board</h1>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">{workItems.length} items total</p>
                </div>
                {/* Density toggle */}
                <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1">
                  {['compact', 'comfortable', 'spacious'].map(d => (
                    <button key={d} onClick={() => setDensity(d)}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize ${density === d ? 'bg-white dark:bg-neutral-700 shadow-sm text-brand-navy' : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              {loading ? (
                  /* Skeleton, never a spinner (Constitution Part 4). */
                  <div className="flex gap-4 flex-1 overflow-x-auto pb-4">
                    {columns.map(col => (
                      <div key={col.name} className="flex-1 min-w-56 flex flex-col bg-neutral-100 dark:bg-neutral-800 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-3 px-1">
                          <div className="h-3 w-20 bg-neutral-200 rounded animate-pulse"></div>
                          <div className="h-5 w-6 bg-white rounded-full animate-pulse"></div>
                        </div>
                        {[1,2,3].map(n => (
                          <div key={n} className="bg-white rounded-lg p-3 mb-2 border border-neutral-200">
                            <div className="h-2 w-16 bg-neutral-100 rounded animate-pulse mb-2"></div>
                            <div className="h-3 w-full bg-neutral-100 rounded animate-pulse mb-1"></div>
                            <div className="h-3 w-3/4 bg-neutral-100 rounded animate-pulse mb-3"></div>
                            <div className="flex justify-between">
                              <div className="h-4 w-14 bg-neutral-100 rounded animate-pulse"></div>
                              <div className="h-5 w-5 bg-neutral-100 rounded-full animate-pulse"></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex gap-4 flex-1 overflow-x-auto pb-4">
                    {columns.map(col => {
                      const colItems = workItems.filter(i => i.status === col.name);
                      const wipLimit = wipLimits[col.limitKey] ?? null;
                      const overWip = wipLimit != null && colItems.length > wipLimit;
                      return (
                        <div key={col.name}
                          className={`flex-1 min-w-56 flex flex-col bg-neutral-100 dark:bg-neutral-800 rounded-xl p-3 ${overWip ? 'ring-1 ring-semantic-danger/40' : ''}`}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, col.name)}>
                          <div className="mb-3 px-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${col.dot}`}></span>
                                <h3 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">{col.name}</h3>
                              </div>
                              <BoardWipBadge count={colItems.length} limit={wipLimit}
                                canEdit={can('manage_projects')} onSet={(next) => setWipLimit(col.limitKey, next)} />
                            </div>
                            {overWip && <p className="mt-1 text-xs font-medium text-semantic-danger">Over WIP limit</p>}
                          </div>
                          <div className="space-y-2 flex-1">
                            {colItems.length === 0 && (
                              <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-neutral-200 rounded-lg">
                                <p className="text-xs text-neutral-600 dark:text-neutral-400">Drop items here</p>
                              </div>
                            )}
                            {colItems.map(item => (
                              <div key={item.id} draggable
                                onDragStart={(e) => handleDragStart(e, item.id)}
                                className={`bg-white dark:bg-neutral-700 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-600 cursor-grab hover:shadow-md transition-shadow group ${densityPad[density]} ${item.starred ? 'border-brand-orange/40' : ''}`}>
                                <div className="flex items-start justify-between mb-1.5">
                                  <span className="font-mono text-xs text-neutral-600 dark:text-neutral-400">{item.id}</span>
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => toggleStar(item)} title={item.starred ? 'Unstar' : 'Star'}
                                      className={`text-xs p-0.5 transition-colors ${item.starred ? 'text-brand-orange' : 'text-neutral-300 hover:text-brand-orange'}`}><Star className={`h-3.5 w-3.5 ${item.starred ? 'fill-current' : ''}`} aria-hidden="true" /></button>
                                    <button onClick={() => setSelectedItem(item)} className="text-neutral-600 dark:text-neutral-400 hover:text-brand-navy text-xs p-0.5" aria-label="Edit work item"><SquarePen className="h-3.5 w-3.5" aria-hidden="true" /></button>
                                    <button onClick={() => handleDelete(item.id)} className="text-neutral-600 dark:text-neutral-400 hover:text-semantic-danger text-xs p-0.5" aria-label="Delete work item"><X className="h-3.5 w-3.5" aria-hidden="true" /></button>
                                  </div>
                                </div>
                                <p className="text-sm font-medium text-neutral-900 leading-snug mb-2 cursor-pointer"
                                  onClick={() => setSelectedItem(item)}>{item.title}</p>
                                {density !== 'compact' && item.description && (
                                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-2 line-clamp-2">{item.description}</p>
                                )}
                                <div className="flex items-center justify-between">
                                  <TypeBadge type={item.type} compact={density === 'compact'} />
                                  <div className="flex items-center gap-1.5">
                                    {item.dueDate && <span className="text-xs text-semantic-warning font-medium">{item.dueDate}</span>}
                                    {item.assigneeId && <Avatar name={userName(item.assigneeId)} size={5} />}
                                  </div>
                                </div>
                                {density !== 'compact' && item.tags && item.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {item.tags.map(t => (
                                      <span key={t} className="text-xs bg-neutral-100 dark:bg-neutral-600 text-neutral-600 dark:text-neutral-300 px-1.5 py-0.5 rounded">{t}</span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                          {/* Add item shortcut */}
                          <button onClick={() => { setNewItem(p => ({ ...p, status: col.name })); setIsCreateOpen(true); }}
                            className="mt-2 w-full flex items-center gap-1.5 px-2 py-1.5 text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-white dark:hover:bg-neutral-700 rounded-lg transition-colors">
                            <span>+</span> Add item
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )
              }
            </div>
          )}

          {/* PROJECTS */}
          {view === 'projects' && (
            <ProjectsView
              projects={projects}
              workItems={workItems}
              setIsProjectOpen={setIsProjectOpen}
              handleArchiveProject={handleArchiveProject}
              userName={userName}
            />
          )}

          {/* NOTIFICATIONS */}
          {view === 'developer' && (
            <div className="p-8">
              <DeveloperWorkspace
                workspaceId={activeWorkspaceId}
                onToast={showToast}
                onOpenItem={(id) => api.raw(`/work-items/${id}`)
                  .then((r) => (r.ok ? r.json() : null))
                  .then((it) => { if (it) setSelectedItem(it); })
                  .catch(reportError)}
              />
            </div>
          )}

          {view === 'aistudio' && (
            <AiStudioView workspaceId={activeWorkspaceId} onToast={showToast} />
          )}

          {view === 'marketplace' && (
            <MarketplaceView workspaceId={activeWorkspaceId} onToast={showToast} />
          )}

          {view === 'developerportal' && (
            <DeveloperPortalView workspaceId={activeWorkspaceId} onToast={showToast} />
          )}

          {view === 'knowledgeadvanced' && (
            <KnowledgeTemplatesView workspaceId={activeWorkspaceId} onToast={showToast} />
          )}

          {view === 'supportinbox' && (
            <SupportInboxView workspaceId={activeWorkspaceId} onToast={showToast} />
          )}

          {view === 'notifications' && (
            <NotificationsView
              notifications={notifications}
              unreadCount={unreadCount}
              currentUser={currentUser}
              fetchNotifications={fetchNotifications}
              fetchUnreadCount={fetchUnreadCount}
              setUnreadCount={setUnreadCount}
            />
          )}

          {/* BACKLOG VIEW */}
          {view === 'backlog' && (
            <div className="p-6">
              <div className="flex gap-6">
                {/* Epic panel (mockup 03) — sticky left rail with per-epic progress */}
                <aside className="hidden lg:block w-56 flex-shrink-0">
                  <div className="sticky top-6 rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-800">
                    <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-neutral-600">Epics</p>
                    {workItems.filter(i => i.type === 'Epic').length === 0 ? (
                      <p className="px-1 text-xs text-neutral-600 dark:text-neutral-400">No epics yet.</p>
                    ) : (
                      <ul className="space-y-1">
                        {workItems.filter(i => i.type === 'Epic').map(epic => {
                          const kids = workItems.filter(i => i.parentId === epic.id);
                          const done = kids.filter(i => i.status === 'Done').length;
                          const pct = kids.length ? Math.round((done / kids.length) * 100) : 0;
                          return (
                            <li key={epic.id}>
                              <button type="button" onClick={() => setSelectedItem(epic)}
                                className="w-full rounded-md px-2 py-1.5 text-left transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40">
                                <span className="block truncate text-xs font-medium text-neutral-900 dark:text-neutral-100">{epic.title}</span>
                                <span className="mt-1 block h-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-700">
                                  <span className="block h-full rounded-full bg-semantic-success" style={{ width: `${pct}%` }} />
                                </span>
                                <span className="mt-0.5 block text-xs text-neutral-600 dark:text-neutral-400">{done}/{kids.length} done · {pct}%</span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </aside>

                <div className="min-w-0 flex-1 max-w-5xl">
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h1 className="text-xl font-bold text-brand-navy">Backlog</h1>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">{backlogItems.length} items not in any sprint</p>
                </div>
                <div className="flex gap-2 items-center">
                  <label className="flex items-center gap-1.5 cursor-pointer mr-2">
                    <input type="checkbox" checked={refinementMode} onChange={e => setRefinementMode(e.target.checked)} className="w-3 h-3 accent-brand-navy" />
                    <span className="text-xs text-neutral-600 font-medium">Refinement mode</span>
                  </label>
                  <Button variant="secondary" size="sm" onClick={() => setIsSprintOpen(true)}>+ New Sprint</Button>
                  <Button variant="action" size="sm" onClick={() => setIsCreateOpen(true)}>+ Add Item</Button>
                </div>
              </div>

              {/* Sprints with capacity bar */}
              {sprints.map(sprint => {
                const usedPts = sprint.usedPoints || 0;
                const capPct = sprint.capacity > 0 ? Math.min(100, Math.round((usedPts / sprint.capacity) * 100)) : 0;
                const capColor = capPct >= 100 ? 'bg-semantic-danger' : capPct >= 80 ? 'bg-semantic-warning' : 'bg-semantic-success';
                return (
                  <div key={sprint.id} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl mb-4 overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-100 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900">
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sprint.status === 'ACTIVE' ? 'bg-semantic-success/10 text-semantic-success' : sprint.status === 'COMPLETED' ? 'bg-neutral-200 text-neutral-600' : 'bg-brand-navy-tint/10 text-brand-navy-tint'}`}>{sprint.status}</span>
                        <h3 className="font-semibold text-neutral-900">{sprint.name}</h3>
                        {sprint.goal && <span className="text-xs text-neutral-600 dark:text-neutral-400 italic hidden md:inline">"{sprint.goal}"</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        {/* Capacity bar — shows actual committed pts vs capacity */}
                        {sprint.capacity > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-1.5 bg-neutral-200 rounded-full overflow-hidden" title={`${usedPts}/${sprint.capacity} story points`}>
                              <div className={`h-full rounded-full transition-all ${capColor}`} style={{ width: `${capPct}%` }}></div>
                            </div>
                            <span className={`text-xs font-medium ${capPct >= 100 ? 'text-semantic-danger' : capPct >= 80 ? 'text-semantic-warning' : 'text-neutral-600 dark:text-neutral-400'}`}>
                              {usedPts}/{sprint.capacity}pt
                            </span>
                          </div>
                        )}
                        {sprint.startDate && <span className="text-xs text-neutral-600 dark:text-neutral-400 hidden md:inline">{sprint.startDate} → {sprint.endDate}</span>}
                        {sprint.status === 'PLANNING' && <Button size="sm" variant="secondary" onClick={() => handleSprintStatusChange(sprint.id, 'ACTIVE')}>Start Sprint</Button>}
                        {sprint.status === 'ACTIVE' && <Button size="sm" variant="secondary" onClick={() => handleSprintStatusChange(sprint.id, 'COMPLETED')}>Complete</Button>}
                      </div>
                    </div>
                    <SprintItemList sprintId={sprint.id} users={users} onMoveToBacklog={(id) => handleMoveToBacklog(id, sprint.id)} onSelect={setSelectedItem} />
                  </div>
                );
              })}

              {/* Backlog items with drag-drop reorder */}
              <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-100 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900">
                  <h3 className="font-semibold text-neutral-900">Backlog</h3>
                  <span className="text-xs text-neutral-600 dark:text-neutral-400">{backlogItems.length} items</span>
                </div>
                {backlogItems.length === 0
                  ? <EmptyState icon={FileText} title="Backlog is empty" subtitle="Create work items to add them to the backlog." action={<Button variant="action" size="sm" onClick={() => setIsCreateOpen(true)}>Add to backlog</Button>} />
                  : backlogItems.map((item) => (
                    <div key={item.id}
                      draggable onDragStart={(e) => handleBacklogDragStart(e, item.id)}
                      onDragOver={(e) => { e.preventDefault(); setDragOverId(item.id); }}
                      onDragLeave={() => setDragOverId(null)}
                      onDrop={(e) => handleBacklogDrop(e, item.id)}
                      className={`flex items-center gap-3 px-5 py-3 border-b border-neutral-50 dark:border-neutral-700 last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-700 group transition-colors ${dragOverId === item.id ? 'border-t-2 border-t-brand-navy bg-brand-navy/5' : ''}`}>
                      <span className="text-neutral-300 cursor-grab text-xs mr-1">⠿</span>
                      <TypeBadge type={item.type} compact />
                      <span className="font-mono text-xs text-neutral-600 dark:text-neutral-400 w-20 flex-shrink-0">{item.id}</span>
                      <span role="button" tabIndex={0} onKeyDown={onPressKey} className="flex-1 text-sm text-neutral-900 cursor-pointer hover:text-brand-navy truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded" onClick={() => setSelectedItem(item)}>{item.title}</span>
                      {/* Refinement mode — inline edit */}
                      {refinementMode ? (
                        <div className="flex items-center gap-2">
                          <select value={item.priority || 'MEDIUM'} onChange={e => handleRefinementUpdate(item.id, 'priority', e.target.value)}
                            className="text-xs border border-neutral-200 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-300 rounded px-1.5 py-1 focus:outline-none text-neutral-600">
                            {['LOW','MEDIUM','HIGH','CRITICAL'].map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                          <input type="number" min={0} max={100} value={item.storyPoints || 0}
                            onChange={e => handleRefinementUpdate(item.id, 'storyPoints', parseInt(e.target.value) || 0)}
                            className="w-14 text-xs border border-neutral-200 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-300 rounded px-1.5 py-1 focus:outline-none text-center"
                            placeholder="pts" />
                        </div>
                      ) : (
                        <>
                          <PriorityBadge priority={item.priority} />
                          {(item.storyPoints > 0) && <span className="text-xs bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 px-1.5 py-0.5 rounded">{item.storyPoints}pt</span>}
                        </>
                      )}
                      {item.assigneeId && <Avatar name={users.find(u => u.id === item.assigneeId)?.fullName || ''} size={6} />}
                      {sprints.filter(s => s.status !== 'COMPLETED').length > 0 && (
                        <select className="opacity-0 group-hover:opacity-100 text-xs border border-neutral-200 rounded px-1 py-0.5 text-neutral-600 transition-opacity"
                          onChange={e => e.target.value && handleMoveToSprint(item.id, e.target.value)} defaultValue="">
                          <option value="" disabled>→ Sprint</option>
                          {sprints.filter(s => s.status !== 'COMPLETED').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      )}
                    </div>
                  ))
                }
              </div>
                </div>
              </div>
            </div>
          )}

          {/* ACTIVE SPRINT VIEW */}
          {view === 'sprint' && (
            <div className="p-6 h-full flex flex-col">
              {activeSprint ? (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-3 mb-0.5">
                        <h1 className="text-xl font-bold text-brand-navy">{activeSprint.name}</h1>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${activeSprint.status === 'ACTIVE' ? 'bg-semantic-success/10 text-semantic-success' : 'bg-neutral-200 text-neutral-600'}`}>{activeSprint.status}</span>
                      </div>
                      {activeSprint.goal && <p className="text-sm text-neutral-600 dark:text-neutral-400 italic">"{activeSprint.goal}"</p>}
                      {activeSprint.startDate && <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">{activeSprint.startDate} → {activeSprint.endDate}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <select value={activeSprint.id}
                        onChange={e => { const s = sprints.find(x => x.id === e.target.value); if (s) { setActiveSprint(s); fetchSprintItems(s.id); } }}
                        className="text-sm border border-neutral-200 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 rounded-md px-2 py-1.5 focus:outline-none">
                        {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Capacity bar */}
                  {activeSprint.capacity > 0 && (
                    <div className="mb-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-4 py-2.5 flex items-center gap-4">
                      <span className="text-xs text-neutral-600 dark:text-neutral-400 font-medium w-20">Capacity</span>
                      <div className="flex-1 h-2 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-navy-tint rounded-full transition-all"
                          style={{ width: `${Math.min(100, (sprintItems.reduce((a, i) => a + (i.storyPoints || 0), 0) / activeSprint.capacity) * 100)}%` }}></div>
                      </div>
                      <span className="text-xs text-neutral-600 font-medium w-28 text-right">
                        {sprintItems.reduce((a, i) => a + (i.storyPoints || 0), 0)} / {activeSprint.capacity} pts
                      </span>
                    </div>
                  )}

                  {/* Quick filters + Swimlane + Saved filters */}
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    {[
                      { label: 'All', filter: null },
                      { label: 'Mine', filter: { type: 'mine' } },
                      { label: 'Blockers', Icon: Flame, filter: { type: 'blockers' } },
                      { label: 'High Priority', Icon: ArrowUp, filter: { type: 'priority', value: 'HIGH' } },
                      { label: 'Bugs', Icon: Bug, filter: { type: 'itemType', value: 'Bug' } },
                    ].map(f => (
                      <button key={f.label} onClick={() => setActiveFilter(f.filter)}
                        className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${JSON.stringify(activeFilter) === JSON.stringify(f.filter) ? 'bg-brand-navy text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'}`}>
                        {f.Icon && <f.Icon className="inline-block h-3.5 w-3.5 mr-1 align-text-bottom" aria-hidden="true" />}{f.label}
                      </button>
                    ))}
                    {savedFilters.map(f => (
                      <div key={f.id} className="flex items-center gap-0.5">
                        <button onClick={() => setActiveFilter(JSON.parse(f.filterJson))}
                          className={`text-xs px-2.5 py-1.5 rounded-l-full font-medium transition-colors ${f.shared ? 'bg-semantic-success/10 text-semantic-success' : 'bg-brand-navy/10 text-brand-navy'} hover:opacity-80`}>
                          {f.shared ? <Globe className="inline-block h-3.5 w-3.5 align-text-bottom" aria-hidden="true" /> : <Star className="inline-block h-3.5 w-3.5 align-text-bottom fill-current" aria-hidden="true" />}{f.name}
                        </button>
                        {f.createdBy === currentUser?.id && (
                          <button onClick={() => {
                            api.raw(`/saved-filters/${f.id}/share`, { method: 'PUT', headers: headers() })
                              .then(r => r.json()).then(() => fetchSavedFilters())
                              .catch(reportError);
                          }}
                            title={f.shared ? 'Make private' : 'Share with team'}
                            className={`text-xs px-1.5 py-1.5 rounded-r-full font-medium transition-colors ${f.shared ? 'bg-semantic-success/20 text-semantic-success hover:bg-semantic-success/30' : 'bg-neutral-100 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'}`}>
                            {f.shared ? <Unlock className="h-3.5 w-3.5" aria-hidden="true" /> : <Lock className="h-3.5 w-3.5" aria-hidden="true" />}
                          </button>
                        )}
                      </div>
                    ))}
                    {activeFilter && (
                      <div className="flex items-center gap-1 ml-auto">
                        {!showSaveFilter
                          ? <button onClick={() => setShowSaveFilter(true)} className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-brand-navy">Save filter</button>
                          : <div className="flex gap-1">
                              <input type="text" value={saveFilterName} onChange={e => setSaveFilterName(e.target.value)}
                                placeholder="Filter name" className="text-xs border border-neutral-200 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 rounded px-2 py-1 focus:outline-none" />
                              <Button size="sm" variant="secondary" onClick={handleSaveFilter}>Save</Button>
                              <button onClick={() => setShowSaveFilter(false)} className="text-xs text-neutral-600 dark:text-neutral-400 px-1" aria-label="Cancel"><X className="h-3.5 w-3.5" aria-hidden="true" /></button>
                            </div>
                        }
                      </div>
                    )}
                    <select value={swimlaneBy} onChange={e => setSwimlaneBy(e.target.value)}
                      className="text-xs border border-neutral-200 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 rounded-md px-2 py-1.5 focus:outline-none text-neutral-600 ml-auto">
                      <option value="none">No swimlane</option>
                      <option value="assignee">By Assignee</option>
                      <option value="type">By Type</option>
                      <option value="priority">By Priority</option>
                      <option value="epic">By Epic</option>
                      <option value="tag">By Tag</option>
                    </select>
                  </div>

                  <SprintBoard items={applyFilter(sprintItems)} columns={columns} users={users}
                    swimlaneBy={swimlaneBy} allItems={workItems} onDragStart={handleDragStart} onDragOver={handleDragOver}
                    onDrop={(e, status) => {
                      e.preventDefault();
                      const itemId = e.dataTransfer.getData('itemId');
                      const item = sprintItems.find(i => i.id === itemId);
                      if (!item || item.status === status) return;
                      setSprintItems(prev => prev.map(i => i.id === itemId ? { ...i, status } : i));
                      api.raw(`/work-items/${itemId}`, { method: 'PUT', body: JSON.stringify({ ...item, status }) })
                        .then(r => { if (r.status === 409) { showToast('That item changed elsewhere — refreshing', 'error'); fetchSprints(); } })
                        .catch(reportError);
                    }}
                    onSelect={setSelectedItem} onDelete={handleDelete} density={density} />
                </>
              ) : (
                <EmptyState icon={Zap} title="No sprints yet" subtitle="Create a sprint in the Backlog view to get started."
                  action={<Button variant="action" onClick={() => { setView('backlog'); fetchBacklog(); fetchSprints(); }}>Go to Backlog</Button>} />
              )}
            </div>
          )}

          {/* REPORTS VIEW */}
          {view === 'reports' && (
            <ReportsView
              velocityData={velocityData}
              sprints={sprints}
              selectedSprintId={selectedSprintId}
              sprintReport={sprintReport}
              scopeChanges={scopeChanges}
              setSelectedSprintId={setSelectedSprintId}
              fetchSprintReport={fetchSprintReport}
            />
          )}

          {/* WORKSPACE SETTINGS */}
          {view === 'workspace' && (
            <WorkspaceView
              workspaceMembers={workspaceMembers}
              currentUser={currentUser}
              userRole={userRole}
              inviteEmail={inviteEmail}
              inviteMsg={inviteMsg}
              notifPrefs={notifPrefs}
              mfaSetup={mfaSetup}
              mfaSetupCode={mfaSetupCode}
              mfaSetupMsg={mfaSetupMsg}
              brandingColor={brandingColor}
              brandingDesc={brandingDesc}
              projects={projects}
              selectedProjectId={selectedProjectId}
              projectMembers={projectMembers}
              projectMemberEmail={projectMemberEmail}
              projectMemberMsg={projectMemberMsg}
              setInviteEmail={setInviteEmail}
              setMfaSetup={setMfaSetup}
              setMfaSetupCode={setMfaSetupCode}
              setBrandingColor={setBrandingColor}
              setBrandingDesc={setBrandingDesc}
              setProjectMemberEmail={setProjectMemberEmail}
              handleRemoveMember={handleRemoveMember}
              handleInvite={handleInvite}
              saveNotifPrefs={saveNotifPrefs}
              handleMfaEnroll={handleMfaEnroll}
              handleMfaConfirm={handleMfaConfirm}
              saveBranding={saveBranding}
              fetchProjectMembers={fetchProjectMembers}
              addProjectMember={addProjectMember}
              can={can}
              showToast={showToast}
            />
          )}
          {/* ======================================================
               ITERATION 3 — WORKFLOWS & FIELDS SETTINGS
             ====================================================== */}
          {view === 'settings3' && (
            <div className="p-8 max-w-5xl">
              <h1 className="text-2xl font-bold text-brand-navy dark:text-white mb-1">Workflows & Fields</h1>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-5">Configure workflows, custom fields, permissions, and work item types</p>

              {/* Sub-tabs */}
              <div className="flex gap-1 mb-6 border-b border-neutral-200 dark:border-neutral-700">
                {[
                  { key: 'workflows',   label: 'Workflows' },
                  { key: 'fields',      label: 'Custom Fields' },
                  { key: 'layout',      label: 'Field Layout' },
                  { key: 'visibility',  label: 'Field Visibility' },
                  { key: 'permissions', label: 'Permissions' },
                  { key: 'types',       label: 'Item Types' },
                ].map(t => (
                  <button key={t.key} onClick={() => {
                    setSettings3Tab(t.key);
                    if (t.key === 'permissions') fetchPermMatrix();
                    if (t.key === 'layout') { fetchFieldDefs(); fetchFieldLayouts(); }
                    if (t.key === 'visibility') { fetchFieldDefs(); fetchRoles(); fetchFieldVisibility(); }
                  }}
                    className={`text-sm font-medium px-4 py-2 border-b-2 transition-colors ${settings3Tab === t.key ? 'border-brand-navy text-brand-navy' : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* WORKFLOWS TAB */}
              {settings3Tab === 'workflows' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">Workflow Definitions</h2>
                    <Button variant="action" onClick={() => {
                      const name = 'New Workflow ' + (workflows.length + 1);
                      api.raw(`/workflows`, { method: 'POST', body: JSON.stringify({ name, workspaceId: activeWorkspaceId, isDefault: false }) })
                        .then(r => r.json()).then(() => fetchWorkflows());
                    }}>+ New Workflow</Button>
                  </div>
                  {workflows.length === 0
                    ? <EmptyState icon={Settings} title="No workflows yet" subtitle="Create a workflow to define statuses and transitions for your work items."
                        action={<Button variant="action" onClick={() => {
                          api.raw(`/workflows`, { method: 'POST', body: JSON.stringify({ name: 'Default Workflow', workspaceId: activeWorkspaceId, isDefault: true }) })
                            .then(r => r.json()).then(() => fetchWorkflows());
                        }}>Create default workflow</Button>} />
                    : <div className="space-y-3">
                        {workflows.map(wf => {
                          const isExpanded = expandedWorkflowId === wf.id;
                          const detail = isExpanded ? workflowDetail : null;
                          const statuses = detail?.statuses || [];
                          const transitions = detail?.transitions || [];
                          const CATEGORIES = ['TO_DO', 'IN_PROGRESS', 'DONE'];
                          const catColor = { TO_DO: 'bg-neutral-200 text-neutral-700', IN_PROGRESS: 'bg-brand-navy/10 text-brand-navy', DONE: 'bg-semantic-success/10 text-semantic-success' };
                          return (
                            <div key={wf.id} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden">
                              {/* Workflow header */}
                              <div role="button" tabIndex={0} onKeyDown={onPressKey} aria-expanded={isExpanded}
                                className="flex items-center justify-between p-5 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-navy-tint/40"
                                onClick={() => expandWorkflow(wf.id)}>
                                <div className="flex items-center gap-3">
                                  <span className={`transition-transform ${isExpanded ? 'rotate-90' : ''} text-neutral-600 dark:text-neutral-400`}><ChevronRight className="h-4 w-4" aria-hidden="true" /></span>
                                  <span className="font-semibold text-neutral-900 dark:text-neutral-100">{wf.name}</span>
                                  {wf.isDefault && <span className="text-xs bg-brand-navy text-white px-2 py-0.5 rounded-full font-semibold">DEFAULT</span>}
                                  {wf.itemType && <span className="text-xs bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 px-2 py-0.5 rounded">{wf.itemType}</span>}
                                </div>
                                <div className="flex gap-3 items-center" onClick={e => e.stopPropagation()}>
                                  <span className="font-mono text-xs text-neutral-300">{wf.id}</span>
                                  <button onClick={() => api.raw(`/workflows/${wf.id}`, { method: 'DELETE' }).then(() => { fetchWorkflows(); if (expandedWorkflowId === wf.id) setExpandedWorkflowId(null); })}
                                    className="text-xs text-semantic-danger hover:underline">Delete</button>
                                </div>
                              </div>

                              {/* Expanded detail */}
                              {isExpanded && (
                                <div className="border-t border-neutral-100 dark:border-neutral-700 p-5 bg-neutral-50 dark:bg-neutral-900 space-y-6">
                                  {!detail ? <p className="text-sm text-neutral-600 dark:text-neutral-400 text-center py-4">Loading...</p> : (
                                    <>
                                      {/* Statuses */}
                                      <div>
                                        <p className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-3">Statuses ({statuses.length})</p>
                                        <div className="flex flex-wrap gap-2 mb-3">
                                          {statuses.map(s => (
                                            <div key={s.id} className="flex items-center gap-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-1.5">
                                              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color || '#0B2F5C' }}></span>
                                              <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{s.name}</span>
                                              <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${catColor[s.category] || 'bg-neutral-100 text-neutral-600'}`}>{s.category}</span>
                                              {s.isInitial && <span className="text-xs text-brand-amber font-bold">INITIAL</span>}
                                              <button onClick={() => deleteStatus(wf.id, s.id)} className="text-neutral-300 hover:text-semantic-danger ml-1 text-xs" aria-label="Delete status"><X className="h-3.5 w-3.5" aria-hidden="true" /></button>
                                            </div>
                                          ))}
                                        </div>
                                        {/* Add status inline form */}
                                        <div className="flex gap-2 items-end flex-wrap">
                                          <div>
                                            <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase block mb-1">Status Name</label>
                                            <input className="input text-sm w-36" placeholder="e.g. In Review" value={newStatusForm.name}
                                              onChange={e => setNewStatusForm(f => ({ ...f, name: e.target.value }))} />
                                          </div>
                                          <div>
                                            <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase block mb-1">Category</label>
                                            <select className="input text-sm" value={newStatusForm.category}
                                              onChange={e => setNewStatusForm(f => ({ ...f, category: e.target.value }))}>
                                              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                          </div>
                                          <div>
                                            <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase block mb-1">Color</label>
                                            <input type="color" className="h-9 w-12 rounded border border-neutral-200 cursor-pointer" value={newStatusForm.color}
                                              onChange={e => setNewStatusForm(f => ({ ...f, color: e.target.value }))} />
                                          </div>
                                          <Button variant="secondary" onClick={() => addStatus(wf.id)}>+ Add Status</Button>
                                        </div>
                                      </div>

                                      {/* Transitions */}
                                      <div>
                                        <p className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-3">Transitions ({transitions.length})</p>
                                        {transitions.length > 0 && (
                                          <div className="space-y-1.5 mb-3">
                                            {transitions.map(t => {
                                              const fromS = statuses.find(s => s.id === t.fromStatus);
                                              const toS = statuses.find(s => s.id === t.toStatus);
                                              return (
                                                <div key={t.id} className="flex items-center gap-2 text-sm">
                                                  <span className="font-medium text-neutral-700 dark:text-neutral-200 w-32 truncate">{t.name}</span>
                                                  <span className="text-neutral-600 dark:text-neutral-400 text-xs">{fromS?.name || t.fromStatus}</span>
                                                  <span className="text-neutral-300"><ArrowRight className="inline-block h-3.5 w-3.5 align-text-bottom" aria-hidden="true" /></span>
                                                  <span className="text-neutral-600 dark:text-neutral-400 text-xs">{toS?.name || t.toStatus}</span>
                                                  <button onClick={() => deleteTransition(wf.id, t.id)} className="text-neutral-300 hover:text-semantic-danger ml-auto text-xs" aria-label="Delete transition"><X className="h-3.5 w-3.5" aria-hidden="true" /></button>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                        {statuses.length >= 2 && (
                                          <div className="flex gap-2 items-end flex-wrap">
                                            <div>
                                              <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase block mb-1">Transition Name</label>
                                              <input className="input text-sm w-32" placeholder="e.g. Start Review" value={newTransitionForm.name}
                                                onChange={e => setNewTransitionForm(f => ({ ...f, name: e.target.value }))} />
                                            </div>
                                            <div>
                                              <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase block mb-1">From</label>
                                              <select className="input text-sm" value={newTransitionForm.fromStatus}
                                                onChange={e => setNewTransitionForm(f => ({ ...f, fromStatus: e.target.value }))}>
                                                <option value="">— From —</option>
                                                {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                              </select>
                                            </div>
                                            <div>
                                              <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase block mb-1">To</label>
                                              <select className="input text-sm" value={newTransitionForm.toStatus}
                                                onChange={e => setNewTransitionForm(f => ({ ...f, toStatus: e.target.value }))}>
                                                <option value="">— To —</option>
                                                {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                              </select>
                                            </div>
                                            <Button variant="secondary" onClick={() => addTransition(wf.id)}>+ Add Transition</Button>
                                          </div>
                                        )}
                                        {statuses.length < 2 && <p className="text-xs text-neutral-600 dark:text-neutral-400 italic">Add at least 2 statuses to define transitions.</p>}
                                      </div>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                  }
                </div>
              )}

              {/* CUSTOM FIELDS TAB */}
              {settings3Tab === 'fields' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">Custom Field Library</h2>
                    <Button variant="action" onClick={() => setShowFieldForm(f => !f)}>
                      {showFieldForm ? 'Cancel' : '+ New Field'}
                    </Button>
                  </div>

                  {/* Inline add field form */}
                  {showFieldForm && (
                    <div className="bg-white dark:bg-neutral-800 border border-brand-navy/20 rounded-xl p-5 mb-5 space-y-4">
                      <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">New Custom Field</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-semibold text-neutral-600 uppercase tracking-wider block mb-1">Field Name *</label>
                          <input className="input text-sm w-full" placeholder="e.g. Meter Serial Number" value={newFieldForm.name}
                            onChange={e => setNewFieldForm(f => ({ ...f, name: e.target.value }))} />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-neutral-600 uppercase tracking-wider block mb-1">Field Type *</label>
                          <select className="input text-sm w-full" value={newFieldForm.fieldType}
                            onChange={e => setNewFieldForm(f => ({ ...f, fieldType: e.target.value }))}>
                            {['TEXT','NUMBER','CURRENCY','DATE','SELECT','MULTI_SELECT','USER','URL','CHECKBOX','FILE','JSON','TEXTAREA','EMAIL','PHONE','RATING','PROGRESS'].map(t => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-neutral-600 uppercase tracking-wider block mb-1">Description</label>
                          <input className="input text-sm w-full" placeholder="What is this field for?" value={newFieldForm.description}
                            onChange={e => setNewFieldForm(f => ({ ...f, description: e.target.value }))} />
                        </div>
                        <div className="flex items-center gap-3 pt-5">
                          <input type="checkbox" id="req" checked={newFieldForm.required}
                            onChange={e => setNewFieldForm(f => ({ ...f, required: e.target.checked }))} className="w-4 h-4 accent-brand-navy" />
                          <label htmlFor="req" className="text-sm text-neutral-700 dark:text-neutral-200">Required field</label>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="action" onClick={createFieldDef}>Create Field</Button>
                        <Button variant="ghost" onClick={() => setShowFieldForm(false)}>Cancel</Button>
                      </div>
                    </div>
                  )}

                  {fieldDefs.length === 0
                    ? <EmptyState icon={FileText} title="No custom fields" subtitle="Create custom fields to capture domain-specific data on work items." />
                    : <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700">
                            <tr>
                              {['Field Name', 'Type', 'Key', 'Required', ''].map(h => (
                                <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
                            {fieldDefs.map(fd => (
                              <tr key={fd.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700">
                                <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">
                                  {fd.name}
                                  {fd.description && <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">{fd.description}</p>}
                                </td>
                                <td className="px-4 py-3"><span className="text-xs bg-brand-navy/10 dark:bg-brand-navy/20 text-brand-navy dark:text-blue-300 px-2 py-0.5 rounded font-mono">{fd.fieldType}</span></td>
                                <td className="px-4 py-3 font-mono text-xs text-neutral-600 dark:text-neutral-400">{fd.fieldKey}</td>
                                <td className="px-4 py-3"><span className={`text-xs font-semibold ${fd.required ? 'text-semantic-danger' : 'text-neutral-300'}`}>{fd.required ? <span className="inline-flex items-center gap-1"><Check className="h-3.5 w-3.5" aria-hidden="true" />Required</span> : 'Optional'}</span></td>
                                <td className="px-4 py-3">
                                  <button onClick={() => api.raw(`/field-defs/${fd.id}`, { method: 'DELETE' }).then(() => fetchFieldDefs())}
                                    className="text-xs text-semantic-danger hover:underline">Delete</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                  }
                </div>
              )}

              {/* FIELD LAYOUT TAB */}
              {settings3Tab === 'layout' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">Field Layout</h2>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">Control which custom fields appear on each work item type and in what order.</p>
                    </div>
                  </div>
                  {fieldDefs.length === 0 ? (
                    <EmptyState icon={LayoutDashboard} title="No custom fields defined" subtitle="Go to Custom Fields tab and create fields first, then configure layout here." />
                  ) : (
                    <div className="space-y-4">
                      {Object.keys(TYPES).map(itemType => {
                        const layoutForType = fieldLayouts.find(fl => fl.itemType === itemType);
                        const orderedFields = layoutForType?.layout || fieldDefs.map(fd => ({ fieldDefId: fd.id, visible: true }));
                        return (
                          <div key={itemType} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <TypeBadge type={itemType} compact />
                                <span className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">{itemType}</span>
                              </div>
                              <Button variant="secondary" onClick={() => {
                                const layout = fieldDefs.map(fd => ({ fieldDefId: fd.id, visible: true }));
                                api.send(`/field-layouts`, { method: 'PUT', body: JSON.stringify({ itemType, layout, workspaceId: activeWorkspaceId }) })
                                  .then(() => { showToast('Layout saved'); fetchFieldLayouts(); }).catch(() => showToast('Failed', 'error'));
                              }}>Save Layout</Button>
                            </div>
                            <div className="space-y-1">
                              {fieldDefs.map((fd, idx) => {
                                const entry = orderedFields.find(e => e.fieldDefId === fd.id);
                                const visible = entry ? entry.visible !== false : true;
                                return (
                                  <div key={fd.id} className="flex items-center gap-3 py-2 px-3 bg-neutral-50 dark:bg-neutral-700 rounded-lg">
                                    <span className="text-neutral-300 cursor-grab text-sm">⠿</span>
                                    <div className="flex-1">
                                      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{fd.name}</span>
                                      <span className="ml-2 text-xs font-mono text-neutral-600 dark:text-neutral-400">{fd.fieldType}</span>
                                    </div>
                                    <input type="checkbox" checked={visible} className="w-4 h-4 accent-brand-navy"
                                      onChange={() => showToast('Toggle field visibility in Field Visibility tab')}
                                      title="Toggle visibility" />
                                    <span className="text-xs text-neutral-600 dark:text-neutral-400">#{idx + 1}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* FIELD VISIBILITY TAB */}
              {settings3Tab === 'visibility' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">Field Visibility by Role</h2>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">Control who can see or edit each custom field. Default is EDITABLE for all roles.</p>
                    </div>
                  </div>

                  {/* Add visibility rule */}
                  <div className="bg-white dark:bg-neutral-800 border border-brand-navy/20 rounded-xl p-5 mb-5">
                    <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200 mb-3">Add Visibility Rule</p>
                    <div className="flex gap-3 flex-wrap items-end">
                      <div>
                        <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block mb-1">Field</label>
                        <select className="input text-sm" value={newFieldVisForm.fieldDefId}
                          onChange={e => setNewFieldVisForm(f => ({ ...f, fieldDefId: e.target.value }))}>
                          <option value="">— Select field —</option>
                          {fieldDefs.map(fd => <option key={fd.id} value={fd.id}>{fd.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block mb-1">Role</label>
                        <select className="input text-sm" value={newFieldVisForm.roleId}
                          onChange={e => setNewFieldVisForm(f => ({ ...f, roleId: e.target.value }))}>
                          <option value="">— Select role —</option>
                          {[{id:'VIEWER',name:'VIEWER'},{id:'MEMBER',name:'MEMBER'},{id:'LEAD',name:'LEAD'},{id:'ADMIN',name:'ADMIN'},{id:'OWNER',name:'OWNER'},...roles].map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block mb-1">Visibility</label>
                        <select className="input text-sm" value={newFieldVisForm.visibility}
                          onChange={e => setNewFieldVisForm(f => ({ ...f, visibility: e.target.value }))}>
                          <option value="EDITABLE">EDITABLE</option>
                          <option value="READONLY">READ ONLY</option>
                          <option value="HIDDEN">HIDDEN</option>
                        </select>
                      </div>
                      <Button variant="action" onClick={saveFieldVisibility}>Add Rule</Button>
                    </div>
                  </div>

                  {fieldVisibility.length === 0 ? (
                    <EmptyState icon={Eye} title="No visibility rules defined" subtitle="All fields are visible and editable by all roles by default. Add rules to restrict access." />
                  ) : (
                    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700">
                          <tr>
                            {['Field', 'Role', 'Visibility', ''].map(h => (
                              <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-neutral-500 uppercase tracking-wider">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
                          {fieldVisibility.map(fv => (
                            <tr key={fv.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700">
                              <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">
                                {fieldDefs.find(fd => fd.id === fv.fieldDefId)?.name || fv.fieldDefId}
                              </td>
                              <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{fv.roleId}</td>
                              <td className="px-4 py-3">
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${fv.visibility === 'HIDDEN' ? 'bg-semantic-danger-surface text-semantic-danger' : fv.visibility === 'READONLY' ? 'bg-semantic-warning-surface text-semantic-warning' : 'bg-semantic-success-surface text-semantic-success'}`}>
                                  {fv.visibility}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <button onClick={() => api.send(`/field-visibility/${fv.id}`, { method: 'DELETE' }).then(() => { showToast('Rule deleted'); fetchFieldVisibility(); }).catch(reportError)}
                                  className="text-xs text-semantic-danger hover:underline">Delete</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* PERMISSIONS MATRIX TAB */}
              {settings3Tab === 'permissions' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">Roles & Permissions Matrix</h2>
                    <Button variant="action" onClick={() => setShowRoleForm(f => !f)}>
                      {showRoleForm ? 'Cancel' : '+ New Role'}
                    </Button>
                  </div>

                  {/* Inline add role form */}
                  {showRoleForm && (
                    <div className="bg-white dark:bg-neutral-800 border border-brand-navy/20 rounded-xl p-5 mb-5">
                      <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200 mb-3">New Custom Role</p>
                      <div className="flex gap-4 items-end flex-wrap">
                        <div>
                          <label className="text-xs font-semibold text-neutral-600 uppercase tracking-wider block mb-1">Role Name *</label>
                          <input className="input text-sm w-44" placeholder="e.g. Support Agent" value={newRoleForm.name}
                            onChange={e => setNewRoleForm(f => ({ ...f, name: e.target.value }))} />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-neutral-600 uppercase tracking-wider block mb-1">Tier (1-5)</label>
                          <select className="input text-sm" value={newRoleForm.tier}
                            onChange={e => setNewRoleForm(f => ({ ...f, tier: Number(e.target.value) }))}>
                            {[1,2,3,4,5].map(t => <option key={t} value={t}>Tier {t} — {['Viewer','Member','Lead','Admin','Owner'][t-1]}</option>)}
                          </select>
                        </div>
                        <Button variant="action" onClick={createRole}>Create Role</Button>
                        <Button variant="ghost" onClick={() => setShowRoleForm(false)}>Cancel</Button>
                      </div>
                    </div>
                  )}

                  {!permMatrix
                    ? <div className="text-center py-12 text-neutral-600 dark:text-neutral-400">Loading permissions matrix...</div>
                    : (
                      <>
                        {/* System roles legend */}
                        <div className="mb-4 p-4 bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700">
                          <p className="text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-2">System Roles</p>
                          <div className="flex flex-wrap gap-3">
                            {[{id:'VIEWER',tier:1},{id:'MEMBER',tier:2},{id:'LEAD',tier:3},{id:'ADMIN',tier:4},{id:'OWNER',tier:5}].map(r => (
                              <div key={r.id} className="flex items-center gap-2 text-xs">
                                <span className="font-semibold text-neutral-700 dark:text-neutral-200">{r.id}</span>
                                <span className="text-neutral-600 dark:text-neutral-400">Tier {r.tier}</span>
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-2">System roles are tier-based. A role can do anything its tier permits. A check = permitted, — = not permitted.</p>
                        </div>
                        {permMatrix.matrix.length === 0
                          ? <EmptyState icon={Lock} title="No custom roles" subtitle="Create roles to define fine-grained access control for your team." />
                          : <div className="overflow-x-auto">
                              <table className="w-full text-xs border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden dark:text-neutral-300">
                                <thead className="bg-neutral-50 dark:bg-neutral-900">
                                  <tr>
                                    <th className="text-left px-4 py-2.5 font-semibold text-neutral-700 dark:text-neutral-300 sticky left-0 bg-neutral-50 dark:bg-neutral-900">Permission</th>
                                    {permMatrix.roles.map(r => (
                                      <th key={r.id} className="px-3 py-2.5 font-semibold text-neutral-700 dark:text-neutral-300 text-center min-w-24">
                                        <div>{r.name}</div>
                                        <div className="font-normal text-neutral-600 dark:text-neutral-400">Tier {r.tier}</div>
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
                                  {permMatrix.allPermissions.map(perm => (
                                    <tr key={perm} className="hover:bg-neutral-50 dark:hover:bg-neutral-800">
                                      <td className="px-4 py-2 font-mono sticky left-0 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200">{perm}</td>
                                      {permMatrix.matrix.map(row => (
                                        <td key={row.role.id} className="px-3 py-2 text-center">
                                          <button onClick={() => togglePermission(row.role.id, perm, row.permissions[perm])}
                                            className={`w-7 h-7 rounded transition-colors text-sm font-bold ${row.permissions[perm] ? 'bg-semantic-success text-white hover:opacity-80' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-brand-navy/10'}`}
                                            title={row.permissions[perm] ? 'Click to revoke' : 'Click to grant'}>
                                            {row.permissions[perm] ? <Check className="inline-block h-4 w-4 text-semantic-success" aria-label="Permitted" /> : <span aria-label="Not permitted">—</span>}
                                          </button>
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                        }
                      </>
                    )
                  }
                </div>
              )}

              {/* ITEM TYPES TAB */}
              {settings3Tab === 'types' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">Work Item Types</h2>
                    <Button variant="action" onClick={() => setShowTypeForm(f => !f)}>
                      {showTypeForm ? 'Cancel' : '+ Custom Type'}
                    </Button>
                  </div>

                  {/* Inline add type form */}
                  {showTypeForm && (
                    <div className="bg-white dark:bg-neutral-800 border border-brand-navy/20 rounded-xl p-5 mb-5">
                      <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200 mb-3">New Custom Type</p>
                      <div className="flex gap-4 items-end flex-wrap">
                        <div>
                          <label className="text-xs font-semibold text-neutral-600 uppercase tracking-wider block mb-1">Label *</label>
                          <input className="input text-sm w-44" placeholder="e.g. Meter Rollout" value={newTypeForm.label}
                            onChange={e => setNewTypeForm(f => ({ ...f, label: e.target.value, typeKey: e.target.value.toUpperCase().replace(/\s+/g,'_') }))} />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-neutral-600 uppercase tracking-wider block mb-1">Key</label>
                          <input className="input text-sm w-36 font-mono" placeholder="METER_ROLLOUT" value={newTypeForm.typeKey}
                            onChange={e => setNewTypeForm(f => ({ ...f, typeKey: e.target.value.toUpperCase() }))} />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-neutral-600 uppercase tracking-wider block mb-1">Icon</label>
                          <div className="flex flex-wrap gap-1 max-w-[240px]">
                            {TYPE_ICON_KEYS.map(key => {
                              const Ic = TYPE_ICON_SET[key];
                              const sel = newTypeForm.icon === key;
                              return (
                                <button key={key} type="button" onClick={() => setNewTypeForm(f => ({ ...f, icon: key }))}
                                  aria-label={key} aria-pressed={sel}
                                  className={`p-1.5 rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 ${sel ? 'border-brand-navy bg-brand-navy/10 text-brand-navy' : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-brand-navy/40'}`}>
                                  <Ic className="h-4 w-4" aria-hidden="true" />
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <Button variant="action" onClick={createWorkItemType}>Create Type</Button>
                        <Button variant="ghost" onClick={() => setShowTypeForm(false)}>Cancel</Button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-3">Built-in Types</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {(workItemTypes.builtIn || []).map(t => (
                          <div key={t.typeKey} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 flex items-center gap-3">
                            <TypeIcon value={t.icon} className="h-6 w-6 text-neutral-700 dark:text-neutral-300" />
                            <div>
                              <p className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">{t.label}</p>
                              <p className="text-xs text-neutral-600 dark:text-neutral-400 font-mono">{t.typeKey}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    {(workItemTypes.custom || []).length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-3">Custom Types</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {(workItemTypes.custom || []).map(t => (
                            <div key={t.id} className="bg-white dark:bg-neutral-800 border border-brand-navy/20 dark:border-brand-navy/30 rounded-xl p-4 flex items-center gap-3 relative group">
                              <TypeIcon value={t.icon} className="h-6 w-6 text-neutral-700 dark:text-neutral-300" />
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">{t.label}</p>
                                <p className="text-xs text-neutral-600 dark:text-neutral-400 font-mono truncate">{t.typeKey}</p>
                              </div>
                              <button onClick={() => api.raw(`/work-item-types/${t.id}`, { method: 'DELETE' }).then(() => fetchWorkItemTypes())}
                                className="opacity-0 group-hover:opacity-100 text-semantic-danger text-xs transition-opacity absolute top-2 right-2" aria-label="Remove"><X className="h-3.5 w-3.5" aria-hidden="true" /></button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {(workItemTypes.custom || []).length === 0 && !showTypeForm && (
                      <p className="text-sm text-neutral-600 italic">No custom types yet. Create utility-domain types like Meter Rollout, Tariff Change, or Substation Commission.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================
               ITERATION 3 — BQL QUERY
             ====================================================== */}
          {view === 'bql' && (
            <BqlView
              bqlQuery={bqlQuery}
              bqlError={bqlError}
              bqlFilterName={bqlFilterName}
              bqlFilters={bqlFilters}
              bqlResults={bqlResults}
              workItems={workItems}
              setBqlQuery={setBqlQuery}
              setBqlFilterName={setBqlFilterName}
              setSelectedItem={setSelectedItem}
              runBql={runBql}
              saveBqlFilter={saveBqlFilter}
              fetchBqlFilters={fetchBqlFilters}
            />
          )}

          {/* ======================================================
               ITERATION 4 — PM ARTIFACTS
             ====================================================== */}
          {view === 'pm' && (
            <div className="p-6 max-w-6xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-brand-navy">Project Management</h1>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-0.5">RAID logs, decisions, meetings, action items</p>
                </div>
                {/* Project selector */}
                <select className="input text-sm w-48" value={pmProjectId} onChange={e => {
                  const pid = e.target.value;
                  setPmProjectId(pid);
                  if (pid) { fetchRaidDashboard(pid); fetchRisks(pid); fetchAssumptions(pid); fetchPmIssues(pid); fetchDependencies(pid); fetchDecisions(pid); fetchMeetings(pid); fetchActionItems(pid); fetchStakeholders(pid); fetchLessons(pid); }
                }}>
                  <option value="">— Select project —</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              {!pmProjectId ? (
                <EmptyState icon={ClipboardList} title="Select a project" subtitle="Choose a project above to view its PM artifacts." />
              ) : (
                <>
                  {/* Sub-tabs */}
                  <div className="flex gap-1 mb-5 border-b border-neutral-200 dark:border-neutral-700 overflow-x-auto">
                    {[
                      { key: 'raid',         Icon: Target,       label: 'RAID Dashboard' },
                      { key: 'risks',        Icon: AlertTriangle, label: `Risks (${risks.length})` },
                      { key: 'assumptions',  Icon: Lightbulb,    label: `Assumptions (${assumptions.length})` },
                      { key: 'issues',       Icon: AlertCircle,  label: `Issues (${pmIssues.length})` },
                      { key: 'deps',         Icon: Link,         label: `Dependencies (${dependencies.length})` },
                      { key: 'decisions',    Icon: Scale,        label: `Decisions (${decisions.length})` },
                      { key: 'meetings',     Icon: Calendar,     label: `Meetings (${meetings.length})` },
                      { key: 'actions',      Icon: CheckCircle2, label: `Actions (${actionItems.length})` },
                      { key: 'stakeholders', Icon: Users,        label: `Stakeholders (${stakeholders.length})` },
                      { key: 'lessons',      Icon: BookOpen,     label: `Lessons (${lessonsLearned.length})` },
                      { key: 'cross-deps',   Icon: Globe,        label: `Cross-Project (${crossProjectDeps.length})` },
                    ].map(t => (
                      <button key={t.key} onClick={() => { setPmTab(t.key); if (t.key === 'cross-deps') fetchCrossProjectDeps(); }}
                        className={`text-xs font-medium px-3 py-2 border-b-2 whitespace-nowrap transition-colors ${pmTab === t.key ? 'border-brand-navy text-brand-navy' : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}>
                        {t.Icon && <t.Icon className="inline-block h-3.5 w-3.5 mr-1 align-text-bottom" aria-hidden="true" />}{t.label}
                      </button>
                    ))}
                  </div>

                  {/* RAID DASHBOARD */}
                  {pmTab === 'raid' && raidDashboard && (
                    <div>
                      {/* Health score */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                        <StatCard label="Health Score" value={`${raidDashboard.healthScore}%`} sub="Overall project health" color={raidDashboard.healthScore > 70 ? 'text-semantic-success' : raidDashboard.healthScore > 40 ? 'text-semantic-warning' : 'text-semantic-danger'} icon={Heart} />
                        <StatCard label="Open Risks" value={raidDashboard.riskSummary?.open || 0} sub={`${raidDashboard.riskSummary?.total || 0} total`} color="text-semantic-warning" icon={AlertTriangle} onClick={() => setPmTab('risks')} />
                        <StatCard label="Open Issues" value={raidDashboard.issueSummary?.open || 0} sub={`${raidDashboard.issueSummary?.total || 0} total`} color="text-semantic-danger" icon={AlertCircle} onClick={() => setPmTab('issues')} />
                        <StatCard label="Blockers" value={raidDashboard.dependencySummary?.blockers || 0} sub={`${raidDashboard.dependencySummary?.total || 0} deps`} color="text-brand-orange" icon={Link} onClick={() => setPmTab('deps')} />
                        <StatCard label="Overdue Actions" value={raidDashboard.actionSummary?.overdue || 0} sub={`${raidDashboard.actionSummary?.open || 0} open`} color="text-semantic-danger" icon={Clock} onClick={() => setPmTab('actions')} />
                      </div>

                      {/* Risk heatmap */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
                          <h3 className="font-semibold text-neutral-900 mb-3">Risk Heat Matrix</h3>
                          {(() => {
                            const probs = ['VERY_HIGH', 'HIGH', 'MEDIUM', 'LOW'];
                            const impacts = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
                            return (
                              <div>
                                <div className="flex gap-1 mb-1">
                                  <div className="w-16 flex-shrink-0"></div>
                                  {impacts.map(i => <div key={i} className="flex-1 text-xs text-neutral-600 dark:text-neutral-400 text-center uppercase">{i}</div>)}
                                </div>
                                {probs.map(p => (
                                  <div key={p} className="flex gap-1 mb-1">
                                    <div className="w-16 text-xs text-neutral-600 dark:text-neutral-400 flex items-center flex-shrink-0">{p}</div>
                                    {impacts.map(imp => {
                                      const count = (raidDashboard.risks || []).filter(r => r.probability === p && r.impact === imp && r.status === 'OPEN').length;
                                      const heat = (probs.indexOf(p) + impacts.indexOf(imp));
                                      const bg = count === 0 ? 'bg-neutral-100 dark:bg-neutral-700' : heat >= 5 ? 'bg-semantic-danger' : heat >= 3 ? 'bg-semantic-warning' : 'bg-semantic-success';
                                      return (
                                        <div key={imp} className={`flex-1 h-8 rounded flex items-center justify-center text-xs font-bold ${bg} ${count > 0 ? 'text-white' : 'text-neutral-300'}`}>
                                          {count > 0 ? count : ''}
                                        </div>
                                      );
                                    })}
                                  </div>
                                ))}
                                <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-2">Rows = Probability, Columns = Impact. Color = severity.</p>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Open action items */}
                        <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
                          <h3 className="font-semibold text-neutral-900 mb-3">Overdue & High-Priority Actions</h3>
                          {(raidDashboard.actionItems || []).filter(a => a.status !== 'DONE').slice(0, 5).map(a => (
                            <div key={a.id} className="flex items-center gap-3 py-2 border-b border-neutral-50 last:border-0">
                              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${a.dueDate && new Date(a.dueDate) < new Date() ? 'bg-semantic-danger' : 'bg-semantic-warning'}`}></span>
                              <span className="flex-1 text-sm text-neutral-900 truncate">{a.title}</span>
                              {a.dueDate && <span className="text-xs text-neutral-600 dark:text-neutral-400">{a.dueDate}</span>}
                            </div>
                          ))}
                          {(raidDashboard.actionItems || []).filter(a => a.status !== 'DONE').length === 0 && <p className="text-sm text-neutral-600 text-center py-4">No open action items</p>}
                        </div>
                      </div>
                    </div>
                  )}
                  {pmTab === 'raid' && !raidDashboard && <div className="text-center py-12 text-neutral-600 dark:text-neutral-400">Loading RAID dashboard...</div>}

                  {/* RISKS */}
                  {pmTab === 'risks' && (
                    <PmArtifactList
                      title="Risks Register" icon={AlertTriangle}
                      items={risks}
                      columns={['Title', 'Category', 'Probability', 'Impact', 'Status', 'Owner']}
                      renderRow={r => [r.title, r.category || '—', r.probability, r.impact, r.status, users.find(u => u.id === r.ownerId)?.fullName || '—']}
                      onDelete={id => pmDelete('risk', id)}
                      onAdd={() => { setPmFormOpen('risk'); setPmForm({ probability: 'MEDIUM', impact: 'MEDIUM', status: 'OPEN' }); }}
                    />
                  )}

                  {/* ASSUMPTIONS */}
                  {pmTab === 'assumptions' && (
                    <PmArtifactList
                      title="Assumptions Log" icon={Lightbulb}
                      items={assumptions}
                      columns={['Title', 'Validation', 'Owner', 'Expiry']}
                      renderRow={a => [a.title, a.validationStatus, users.find(u => u.id === a.ownerId)?.fullName || '—', a.expiryDate || '—']}
                      onDelete={id => pmDelete('assumption', id)}
                      onAdd={() => { setPmFormOpen('assumption'); setPmForm({ validationStatus: 'UNVALIDATED' }); }}
                    />
                  )}

                  {/* PM ISSUES */}
                  {pmTab === 'issues' && (
                    <PmArtifactList
                      title="Issues Log" icon={AlertCircle}
                      items={pmIssues}
                      columns={['Title', 'Priority', 'Status', 'Owner']}
                      renderRow={i => [i.title, i.priority, i.status, users.find(u => u.id === i.ownerId)?.fullName || '—']}
                      onDelete={id => pmDelete('issue', id)}
                      onAdd={() => { setPmFormOpen('issue'); setPmForm({ priority: 'MEDIUM', status: 'OPEN' }); }}
                    />
                  )}

                  {/* DEPENDENCIES */}
                  {pmTab === 'deps' && (
                    <PmArtifactList
                      title="Dependencies Tracker" icon={Link}
                      items={dependencies}
                      columns={['Title', 'From', 'To', 'Status', 'Deadline', 'Blocker']}
                      renderRow={d => [d.title, d.dependentTeam || '—', d.providingTeam || '—', d.status, d.deadline || '—', d.isBlocker ? <span className="inline-flex items-center gap-1 text-semantic-danger font-semibold"><Ban className="h-3.5 w-3.5" aria-hidden="true" />Yes</span> : 'No']}
                      onDelete={id => pmDelete('dependency', id)}
                      onAdd={() => { setPmFormOpen('dependency'); setPmForm({ status: 'PENDING', isBlocker: false }); }}
                    />
                  )}

                  {/* DECISIONS */}
                  {pmTab === 'decisions' && (
                    <PmArtifactList
                      title="Decisions Register" icon={Scale}
                      items={decisions}
                      columns={['Title', 'Status', 'Decision Date', 'Owner']}
                      renderRow={d => [d.title, d.status, d.decisionDate || '—', users.find(u => u.id === d.ownerId)?.fullName || '—']}
                      onDelete={id => pmDelete('decision', id)}
                      onAdd={() => { setPmFormOpen('decision'); setPmForm({ status: 'PROPOSED' }); }}
                    />
                  )}

                  {/* MEETINGS */}
                  {pmTab === 'meetings' && (
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="font-semibold text-neutral-900 flex items-center gap-2"><Calendar className="h-5 w-5 text-neutral-500" aria-hidden="true" /> Meeting Notes</h2>
                        <Button variant="action" onClick={() => { setPmFormOpen('meeting'); setPmForm({ meetingType: 'GENERAL', status: 'SCHEDULED' }); }}>+ New Meeting</Button>
                      </div>
                      {meetings.length === 0
                        ? <EmptyState icon={Calendar} title="No meetings yet" subtitle="Log meeting notes with structured agenda, notes, decisions, and action items." />
                        : <div className="space-y-3">
                            {meetings.map(m => (
                              <div key={m.id} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5 cursor-pointer hover:shadow-sm transition-shadow"
                                onClick={() => { setSelectedMeeting(m); setPmTab('meeting-detail'); api.raw(`/meetings/${m.id}`).then(r => r.json()).then(d => setMeetingNotes(d.notes || [])); }}>
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-xs bg-brand-navy/10 text-brand-navy px-2 py-0.5 rounded font-medium">{m.meetingType}</span>
                                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${m.status === 'COMPLETED' ? 'bg-semantic-success/10 text-semantic-success' : m.status === 'CANCELLED' ? 'bg-neutral-100 text-neutral-600 dark:text-neutral-400' : 'bg-semantic-warning/10 text-semantic-warning'}`}>{m.status}</span>
                                    </div>
                                    <p className="font-semibold text-neutral-900">{m.title}</p>
                                    {m.scheduledAt && <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1"><Calendar className="inline-block h-3.5 w-3.5 mr-1 align-text-bottom" aria-hidden="true" />{new Date(m.scheduledAt).toLocaleString()}{m.durationMins ? ` · ${m.durationMins}min` : ''}</p>}
                                    {m.location && <p className="text-xs text-neutral-600 dark:text-neutral-400"><MapPin className="inline-block h-3.5 w-3.5 mr-1 align-text-bottom" aria-hidden="true" />{m.location}</p>}
                                  </div>
                                  <button onClick={e => { e.stopPropagation(); pmDelete('meeting', m.id); }} className="text-neutral-300 hover:text-semantic-danger text-xs ml-3" aria-label="Delete meeting"><X className="h-3.5 w-3.5" aria-hidden="true" /></button>
                                </div>
                              </div>
                            ))}
                          </div>
                      }
                    </div>
                  )}

                  {/* MEETING DETAIL */}
                  {pmTab === 'meeting-detail' && selectedMeeting && (
                    <div>
                      <div className="flex items-center gap-3 mb-5">
                        <button onClick={() => { setPmTab('meetings'); setSelectedMeeting(null); }} className="text-neutral-600 dark:text-neutral-400 hover:text-brand-navy text-sm" aria-label="Back"><ArrowLeft className="inline-block h-4 w-4 mr-1 align-text-bottom" aria-hidden="true" />Back</button>
                        <h2 className="font-bold text-brand-navy text-lg">{selectedMeeting.title}</h2>
                        <span className="text-xs bg-brand-navy/10 text-brand-navy px-2 py-0.5 rounded">{selectedMeeting.meetingType}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {['AGENDA', 'NOTES', 'DECISIONS', 'ACTIONS'].map(section => {
                          const note = Array.isArray(meetingNotes) ? meetingNotes.find(n => n.section === section) : null;
                          return (
                            <div key={section} className="bg-white border border-neutral-200 rounded-xl p-4">
                              <p className="text-xs font-bold text-neutral-600 uppercase tracking-wider mb-2">{section}</p>
                              <textarea
                                className="w-full text-sm text-neutral-900 dark:text-neutral-100 border-none outline-none resize-none min-h-[100px] bg-transparent"
                                placeholder={`Enter ${section.toLowerCase()}...`}
                                defaultValue={note?.content || ''}
                                onBlur={e => {
                                  api.raw(`/meetings/${selectedMeeting.id}/notes/${section}`, {
                                    method: 'PUT',
                                    body: JSON.stringify({ content: e.target.value })
                                  }).catch(reportError);
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ACTION ITEMS */}
                  {pmTab === 'actions' && (
                    <PmArtifactList
                      title="Action Items" icon={CheckCircle2}
                      items={actionItems}
                      columns={['Title', 'Owner', 'Due Date', 'Status', 'Priority']}
                      renderRow={a => [a.title, users.find(u => u.id === a.ownerId)?.fullName || '—', a.dueDate || '—', a.status, a.priority]}
                      onDelete={id => pmDelete('action', id)}
                      onAdd={() => { setPmFormOpen('action'); setPmForm({ status: 'OPEN', priority: 'MEDIUM' }); }}
                      statusColors={{ OPEN: 'text-semantic-warning', IN_PROGRESS: 'text-brand-navy', DONE: 'text-semantic-success', CANCELLED: 'text-neutral-600 dark:text-neutral-400' }}
                    />
                  )}

                  {/* STAKEHOLDERS */}
                  {pmTab === 'stakeholders' && (
                    <div>
                      <PmArtifactList
                        title="Stakeholder Register" icon={Users}
                        items={stakeholders}
                        columns={['Name', 'Role', 'Org', 'Influence', 'Interest', 'Strategy']}
                        renderRow={s => [s.name, s.role || '—', s.organization || '—', s.influence || '—', s.interest || '—', s.engagementStrategy || '—']}
                        onDelete={id => pmDelete('stakeholder', id)}
                        onAdd={() => { setPmFormOpen('stakeholder'); setPmForm({ influence: 'MEDIUM', interest: 'MEDIUM', engagementStrategy: 'INFORM', communicationFreq: 'MONTHLY' }); }}
                      />
                      {stakeholders.length > 0 && (
                        <div className="mt-6 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
                          <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Influence / Interest Matrix</h3>
                          <div className="grid grid-cols-2 gap-2 max-w-lg">
                            {[
                              { label: 'High Influence, High Interest', key: 'HH', desc: 'Manage Closely', color: 'bg-semantic-danger-surface border-semantic-danger/30' },
                              { label: 'High Influence, Low Interest', key: 'HL', desc: 'Keep Satisfied', color: 'bg-semantic-warning-surface border-semantic-warning/30' },
                              { label: 'Low Influence, High Interest', key: 'LH', desc: 'Keep Informed', color: 'bg-semantic-info-surface border-semantic-info/30' },
                              { label: 'Low Influence, Low Interest', key: 'LL', desc: 'Monitor', color: 'bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700' },
                            ].map(q => {
                              const quadrantStakeholders = stakeholders.filter(s => {
                                const inf = (s.influence || '').toUpperCase();
                                const int = (s.interest || '').toUpperCase();
                                const highInf = inf === 'HIGH';
                                const highInt = int === 'HIGH';
                                if (q.key === 'HH') return highInf && highInt;
                                if (q.key === 'HL') return highInf && !highInt;
                                if (q.key === 'LH') return !highInf && highInt;
                                return !highInf && !highInt;
                              });
                              return (
                                <div key={q.key} className={`p-4 rounded-xl border ${q.color} min-h-[100px]`}>
                                  <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">{q.desc}</p>
                                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-2">{q.label}</p>
                                  <div className="space-y-1">
                                    {quadrantStakeholders.length === 0 && <p className="text-xs text-neutral-300 italic">None</p>}
                                    {quadrantStakeholders.map(s => (
                                      <div key={s.id} className="flex items-center gap-1.5">
                                        <Avatar name={s.name} size={5} />
                                        <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100">{s.name}</span>
                                        <span className="text-xs text-neutral-600 dark:text-neutral-400">{s.role}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-3">Based on Influence (HIGH/MEDIUM/LOW) and Interest (HIGH/MEDIUM/LOW) fields. HIGH means above MEDIUM.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* LESSONS LEARNED */}
                  {pmTab === 'lessons' && (
                    <PmArtifactList
                      title="Lessons Learned" icon={BookOpen}
                      items={lessonsLearned}
                      columns={['Title', 'Category', 'Created']}
                      renderRow={ll => [ll.title, ll.category || '—', ll.createdAt ? new Date(ll.createdAt).toLocaleDateString() : '—']}
                      onDelete={id => pmDelete('lesson', id)}
                      onAdd={() => { setPmFormOpen('lesson'); setPmForm({ category: 'PROCESS' }); }}
                    />
                  )}

                  {pmTab === 'cross-deps' && (
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">Cross-Project Dependencies</h2>
                        <Button variant="action" onClick={() => setIsCrossProjOpen(true)}>+ Add Dependency</Button>
                      </div>
                      {crossProjectDeps.length === 0 ? (
                        <EmptyState icon={Globe} title="No cross-project dependencies" subtitle="Track dependencies between this project and other projects or teams." />
                      ) : (
                        <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700">
                              <tr>
                                {['Title', 'Target Project', 'Deadline', 'Blocker', 'Status', ''].map(h => (
                                  <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-neutral-500 uppercase tracking-wider">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
                              {crossProjectDeps.map(dep => (
                                <tr key={dep.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800">
                                  <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">
                                    {dep.title}
                                    {dep.description && <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">{dep.description}</p>}
                                  </td>
                                  <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">
                                    {projects.find(p => p.id === dep.targetProjectId)?.name || dep.targetProjectId || '—'}
                                  </td>
                                  <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">
                                    {dep.deadline ? new Date(dep.deadline).toLocaleDateString() : '—'}
                                  </td>
                                  <td className="px-4 py-3">
                                    {dep.isBlocker ? (
                                      <span className="text-xs font-bold text-semantic-danger bg-semantic-danger-surface px-2 py-0.5 rounded">BLOCKER</span>
                                    ) : (
                                      <span className="text-xs text-neutral-600 dark:text-neutral-400">—</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${dep.status === 'RESOLVED' ? 'bg-semantic-success-surface text-semantic-success' : dep.status === 'AT_RISK' ? 'bg-semantic-danger-surface text-semantic-danger' : 'bg-semantic-warning-surface text-semantic-warning'}`}>
                                      {dep.status || 'OPEN'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <button onClick={() => api.send(`/cross-project-dependencies/${dep.id}`, { method: 'DELETE' }).then(() => { showToast('Deleted'); fetchCrossProjectDeps(); }).catch(reportError)}
                                      className="text-xs text-semantic-danger hover:underline">Delete</button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Create cross-project dep modal */}
                      {isCrossProjOpen && (
                        <Modal title="New Cross-Project Dependency" onClose={() => setIsCrossProjOpen(false)} size="lg">
                            <div className="space-y-3">
                              <Field label="Title *">
                                <input className="input" placeholder="What does this project depend on?" value={crossProjForm.title}
                                  onChange={e => setCrossProjForm(f => ({ ...f, title: e.target.value }))} autoFocus />
                              </Field>
                              <Field label="Description">
                                <textarea className="input" rows={2} placeholder="Details of the dependency..."
                                  value={crossProjForm.description} onChange={e => setCrossProjForm(f => ({ ...f, description: e.target.value }))} />
                              </Field>
                              <Field label="Target Project">
                                <select className="input" value={crossProjForm.targetProjectId}
                                  onChange={e => setCrossProjForm(f => ({ ...f, targetProjectId: e.target.value }))}>
                                  <option value="">— Select project —</option>
                                  {projects.filter(p => p.id !== pmProjectId).map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                  ))}
                                </select>
                              </Field>
                              <Field label="Deadline">
                                <input type="date" className="input" value={crossProjForm.deadline}
                                  onChange={e => setCrossProjForm(f => ({ ...f, deadline: e.target.value }))} />
                              </Field>
                              <div className="flex items-center gap-2">
                                <input type="checkbox" id="blocker" className="w-4 h-4 accent-brand-navy"
                                  checked={crossProjForm.isBlocker}
                                  onChange={e => setCrossProjForm(f => ({ ...f, isBlocker: e.target.checked }))} />
                                <label htmlFor="blocker" className="text-sm text-neutral-700 dark:text-neutral-200">This is a blocker (blocks our delivery)</label>
                              </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-5">
                              <Button variant="ghost" onClick={() => setIsCrossProjOpen(false)}>Cancel</Button>
                              <Button variant="action" onClick={createCrossProjectDep}>Create Dependency</Button>
                            </div>
                        </Modal>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* PM CREATE MODAL */}
              {pmFormOpen && (
                <Modal title={<span className="capitalize">New {pmFormOpen.replace('issue','PM Issue').replace('lesson','Lesson Learned').replace('action','Action Item').replace('dependency','Dependency')}</span>} onClose={() => { setPmFormOpen(null); setPmForm({}); }} size="lg">
                    <div className="space-y-3">
                      <Field label="Title">
                        <input className="input" placeholder="Brief title" value={pmForm.title || ''} onChange={e => setPmForm(p => ({ ...p, title: e.target.value }))} autoFocus />
                      </Field>
                      <Field label="Description">
                        <textarea className="input" rows={2} placeholder="Details..." value={pmForm.description || ''} onChange={e => setPmForm(p => ({ ...p, description: e.target.value }))} />
                      </Field>

                      {pmFormOpen === 'risk' && <>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Probability">
                            <select className="input" value={pmForm.probability || 'MEDIUM'} onChange={e => setPmForm(p => ({ ...p, probability: e.target.value }))}>
                              {['LOW','MEDIUM','HIGH','VERY_HIGH'].map(v => <option key={v}>{v}</option>)}
                            </select>
                          </Field>
                          <Field label="Impact">
                            <select className="input" value={pmForm.impact || 'MEDIUM'} onChange={e => setPmForm(p => ({ ...p, impact: e.target.value }))}>
                              {['LOW','MEDIUM','HIGH','CRITICAL'].map(v => <option key={v}>{v}</option>)}
                            </select>
                          </Field>
                        </div>
                        <Field label="Mitigation Plan">
                          <textarea className="input" rows={2} placeholder="How will you mitigate this risk?" value={pmForm.mitigationPlan || ''} onChange={e => setPmForm(p => ({ ...p, mitigationPlan: e.target.value }))} />
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Owner"><select className="input" value={pmForm.ownerId || ''} onChange={e => setPmForm(p => ({ ...p, ownerId: e.target.value || null }))}><option value="">Unassigned</option>{users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}</select></Field>
                          <Field label="Review Date"><input type="date" className="input" value={pmForm.reviewDate || ''} onChange={e => setPmForm(p => ({ ...p, reviewDate: e.target.value || null }))} /></Field>
                        </div>
                      </>}

                      {pmFormOpen === 'assumption' && <>
                        <Field label="Rationale"><textarea className="input" rows={2} placeholder="Why was this assumption made?" value={pmForm.rationale || ''} onChange={e => setPmForm(p => ({ ...p, rationale: e.target.value }))} /></Field>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Owner"><select className="input" value={pmForm.ownerId || ''} onChange={e => setPmForm(p => ({ ...p, ownerId: e.target.value || null }))}><option value="">Unassigned</option>{users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}</select></Field>
                          <Field label="Expiry Date"><input type="date" className="input" value={pmForm.expiryDate || ''} onChange={e => setPmForm(p => ({ ...p, expiryDate: e.target.value || null }))} /></Field>
                        </div>
                      </>}

                      {pmFormOpen === 'issue' && <>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Priority"><select className="input" value={pmForm.priority || 'MEDIUM'} onChange={e => setPmForm(p => ({ ...p, priority: e.target.value }))}>{['CRITICAL','HIGH','MEDIUM','LOW'].map(v => <option key={v}>{v}</option>)}</select></Field>
                          <Field label="Owner"><select className="input" value={pmForm.ownerId || ''} onChange={e => setPmForm(p => ({ ...p, ownerId: e.target.value || null }))}><option value="">Unassigned</option>{users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}</select></Field>
                        </div>
                        <Field label="Impact"><textarea className="input" rows={2} placeholder="Impact of this issue..." value={pmForm.impact || ''} onChange={e => setPmForm(p => ({ ...p, impact: e.target.value }))} /></Field>
                      </>}

                      {pmFormOpen === 'dependency' && <>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Dependent Team"><input className="input" placeholder="Team that needs this" value={pmForm.dependentTeam || ''} onChange={e => setPmForm(p => ({ ...p, dependentTeam: e.target.value }))} /></Field>
                          <Field label="Providing Team"><input className="input" placeholder="Team that provides this" value={pmForm.providingTeam || ''} onChange={e => setPmForm(p => ({ ...p, providingTeam: e.target.value }))} /></Field>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Deadline"><input type="date" className="input" value={pmForm.deadline || ''} onChange={e => setPmForm(p => ({ ...p, deadline: e.target.value || null }))} /></Field>
                          <Field label="Status"><select className="input" value={pmForm.status || 'PENDING'} onChange={e => setPmForm(p => ({ ...p, status: e.target.value }))}>{['PENDING','IN_PROGRESS','RESOLVED','BLOCKED'].map(v => <option key={v}>{v}</option>)}</select></Field>
                        </div>
                        <label className="flex items-center gap-2 text-sm text-neutral-700"><input type="checkbox" checked={!!pmForm.isBlocker} onChange={e => setPmForm(p => ({ ...p, isBlocker: e.target.checked }))} /> <span>This is a blocker</span></label>
                      </>}

                      {pmFormOpen === 'decision' && <>
                        <Field label="Alternatives Considered"><textarea className="input" rows={2} placeholder="What other options were considered?" value={pmForm.alternatives || ''} onChange={e => setPmForm(p => ({ ...p, alternatives: e.target.value }))} /></Field>
                        <Field label="Rationale"><textarea className="input" rows={2} placeholder="Why was this decision made?" value={pmForm.rationale || ''} onChange={e => setPmForm(p => ({ ...p, rationale: e.target.value }))} /></Field>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Owner"><select className="input" value={pmForm.ownerId || ''} onChange={e => setPmForm(p => ({ ...p, ownerId: e.target.value || null }))}><option value="">Unassigned</option>{users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}</select></Field>
                          <Field label="Decision Date"><input type="date" className="input" value={pmForm.decisionDate || ''} onChange={e => setPmForm(p => ({ ...p, decisionDate: e.target.value || null }))} /></Field>
                        </div>
                      </>}

                      {pmFormOpen === 'meeting' && <>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Type"><select className="input" value={pmForm.meetingType || 'GENERAL'} onChange={e => setPmForm(p => ({ ...p, meetingType: e.target.value }))}>{['GENERAL','STANDUP','PLANNING','RETRO','REVIEW','STEERING'].map(v => <option key={v}>{v}</option>)}</select></Field>
                          <Field label="Scheduled"><input type="datetime-local" className="input" value={pmForm.scheduledAt || ''} onChange={e => setPmForm(p => ({ ...p, scheduledAt: e.target.value || null }))} /></Field>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Duration (min)"><input type="number" className="input" value={pmForm.durationMins || ''} onChange={e => setPmForm(p => ({ ...p, durationMins: parseInt(e.target.value) || null }))} /></Field>
                          <Field label="Location"><input className="input" placeholder="Room / URL" value={pmForm.location || ''} onChange={e => setPmForm(p => ({ ...p, location: e.target.value }))} /></Field>
                        </div>
                      </>}

                      {pmFormOpen === 'action' && <>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Owner"><select className="input" value={pmForm.ownerId || ''} onChange={e => setPmForm(p => ({ ...p, ownerId: e.target.value || null }))}><option value="">Unassigned</option>{users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}</select></Field>
                          <Field label="Due Date"><input type="date" className="input" value={pmForm.dueDate || ''} onChange={e => setPmForm(p => ({ ...p, dueDate: e.target.value || null }))} /></Field>
                        </div>
                        <Field label="Priority"><select className="input" value={pmForm.priority || 'MEDIUM'} onChange={e => setPmForm(p => ({ ...p, priority: e.target.value }))}>{['CRITICAL','HIGH','MEDIUM','LOW'].map(v => <option key={v}>{v}</option>)}</select></Field>
                      </>}

                      {pmFormOpen === 'stakeholder' && <>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Role"><input className="input" placeholder="PM / Sponsor / Customer..." value={pmForm.role || ''} onChange={e => setPmForm(p => ({ ...p, role: e.target.value }))} /></Field>
                          <Field label="Organisation"><input className="input" placeholder="Company name" value={pmForm.organization || ''} onChange={e => setPmForm(p => ({ ...p, organization: e.target.value }))} /></Field>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Influence"><select className="input" value={pmForm.influence || 'MEDIUM'} onChange={e => setPmForm(p => ({ ...p, influence: e.target.value }))}>{['LOW','MEDIUM','HIGH'].map(v => <option key={v}>{v}</option>)}</select></Field>
                          <Field label="Interest"><select className="input" value={pmForm.interest || 'MEDIUM'} onChange={e => setPmForm(p => ({ ...p, interest: e.target.value }))}>{['LOW','MEDIUM','HIGH'].map(v => <option key={v}>{v}</option>)}</select></Field>
                        </div>
                        <Field label="Strategy"><select className="input" value={pmForm.engagementStrategy || 'INFORM'} onChange={e => setPmForm(p => ({ ...p, engagementStrategy: e.target.value }))}>{['INFORM','CONSULT','INVOLVE','COLLABORATE','EMPOWER'].map(v => <option key={v}>{v}</option>)}</select></Field>
                      </>}

                      {pmFormOpen === 'lesson' && <>
                        <Field label="Category"><select className="input" value={pmForm.category || 'PROCESS'} onChange={e => setPmForm(p => ({ ...p, category: e.target.value }))}>{['PROCESS','TECHNICAL','COMMUNICATION','RISK','OTHER'].map(v => <option key={v}>{v}</option>)}</select></Field>
                        <Field label="What Worked"><textarea className="input" rows={2} value={pmForm.whatWorked || ''} onChange={e => setPmForm(p => ({ ...p, whatWorked: e.target.value }))} /></Field>
                        <Field label="What Didn't Work"><textarea className="input" rows={2} value={pmForm.whatDidntWork || ''} onChange={e => setPmForm(p => ({ ...p, whatDidntWork: e.target.value }))} /></Field>
                        <Field label="Recommendation"><textarea className="input" rows={2} value={pmForm.recommendation || ''} onChange={e => setPmForm(p => ({ ...p, recommendation: e.target.value }))} /></Field>
                      </>}
                    </div>
                    <div className="flex gap-3 mt-5">
                      <Button variant="action" onClick={() => pmCreate(pmFormOpen, pmForm)} disabled={!pmForm.title}>Create</Button>
                      <Button variant="secondary" onClick={() => { setPmFormOpen(null); setPmForm({}); }}>Cancel</Button>
                    </div>
                </Modal>
              )}
            </div>
          )}

          {/* ITERATION 12 — Performance (KPI framework with privacy guardrails) */}
          {view === 'performance' && (
            <PerformancePanel workspaceId={activeWorkspaceId} can={can} onToast={showToast} />
          )}

          {/* ITERATION 11 — AI Control (AI Control Plane settings; mockup 09) */}
          {view === 'aicontrol' && (
            <AiSettingsPanel workspaceId={activeWorkspaceId} can={can} onToast={showToast} />
          )}

          {/* ITERATION 13 — Automation engine */}
          {view === 'automations' && (
            <AutomationsPanel workspaceId={activeWorkspaceId} can={can} onToast={showToast} />
          )}

          {/* ITERATION 13 — Integrations (connectors, webhooks, API tokens) */}
          {view === 'integrations' && (
            <IntegrationsPanel workspaceId={activeWorkspaceId} can={can} onToast={showToast} />
          )}

          {/* TRASH VIEW */}
          {view === 'trash' && (
            <TrashView
              trashItems={trashItems}
              restoreFromTrash={restoreFromTrash}
              permanentDelete={permanentDelete}
            />
          )}

          {/* ======================================================
               ITERATION 6 — CUSTOM DASHBOARDS (designer + persistence)
             ====================================================== */}
          {view === 'dashboards' && (
            <div className="p-6 overflow-y-auto h-full">
              {!selectedDashboard ? (
                <>
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">Dashboards</h1>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">Build your own views — add widgets, arrange the grid, save.</p>
                    </div>
                    <Button variant="action" onClick={createDashboard}>New dashboard</Button>
                  </div>
                  {customDashboards.length === 0 ? (
                    <EmptyState icon={LayoutDashboard} title="No dashboards yet"
                      subtitle="Create a dashboard and drop in widgets to track what matters to you."
                      action={<Button variant="action" onClick={createDashboard}>New dashboard</Button>} />
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {customDashboards.map(d => (
                        <div key={d.id} onClick={() => openDashboard(d.id)} role="button" tabIndex={0} onKeyDown={onPressKey}
                          className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 cursor-pointer hover:border-brand-navy/40 hover:shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-navy-tint/40">
                          <div className="flex items-start justify-between">
                            <LayoutDashboard className="h-6 w-6 text-neutral-600 dark:text-neutral-400" aria-hidden="true" />
                            <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-700 rounded-full px-2 py-0.5">{d.scope || 'PERSONAL'}</span>
                          </div>
                          <p className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 mt-2 truncate">{d.name}</p>
                          <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
                            {d.updatedAt ? `Updated ${new Date(d.updatedAt).toLocaleDateString()}` : '—'}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3 min-w-0">
                      <button onClick={() => setSelectedDashboard(null)} className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-brand-navy transition-colors flex-shrink-0"><ArrowLeft className="inline-block h-3.5 w-3.5 mr-1 align-text-bottom" aria-hidden="true" />Dashboards</button>
                      <h1 className="text-xl font-semibold text-neutral-900 dark:text-white truncate">{selectedDashboard.name}</h1>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!dashboardEditMode && <ExportButtons targetId="dashboard-export-area"
                        rows={workItems.map(i => ({ ID: i.id, Title: i.title, Type: i.type, Status: i.status, Priority: i.priority, Assignee: i.assigneeId }))}
                        filename={selectedDashboard.name || 'dashboard'} onError={() => showToast('Export failed — try again', 'error')} />}
                      {!dashboardEditMode && (
                        <button onClick={() => mintShare(selectedDashboard.id)}
                          className="text-xs px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-brand-navy transition-colors">Share</button>
                      )}
                      <Button variant={dashboardEditMode ? 'action' : 'secondary'} onClick={() => setDashboardEditMode(e => !e)}>
                        {dashboardEditMode ? 'Done' : 'Edit'}
                      </Button>
                      <button onClick={() => deleteDashboard(selectedDashboard.id)} className="text-xs text-semantic-danger hover:underline">Delete</button>
                    </div>
                  </div>

                  {shareInfo && shareInfo.id === selectedDashboard.id && shareInfo.token && (
                    <div className="flex items-center gap-2 mb-4 p-3 rounded-md bg-semantic-info-surface border border-neutral-200 dark:border-neutral-700">
                      <span className="text-xs font-semibold text-neutral-700 flex-shrink-0">Public link</span>
                      <input readOnly aria-label="Public embed link"
                        value={`${window.location.origin}${window.location.pathname}?share=${shareInfo.token}`}
                        className="flex-1 min-w-0 text-xs font-mono rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-2 py-1" />
                      <button onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}${window.location.pathname}?share=${shareInfo.token}`); showToast('Link copied'); }}
                        className="text-xs px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-brand-navy transition-colors flex-shrink-0">Copy</button>
                      <button onClick={() => stopShare(selectedDashboard.id)} className="text-xs text-semantic-danger hover:underline flex-shrink-0">Stop sharing</button>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className="text-xs uppercase tracking-wide text-neutral-600 dark:text-neutral-400">Scope</span>
                    {['PROJECT', 'TEAM', 'ORG'].map(s => (
                      <button key={s} type="button"
                        onClick={() => { setDashboardScope(s); fetchDashboardAggregate(s, dashboardTeamId); }}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${dashboardScope === s ? 'bg-brand-navy text-white border-brand-navy' : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-brand-navy'}`}>
                        {s === 'PROJECT' ? 'Project' : s === 'TEAM' ? 'Team' : 'Organization'}
                      </button>
                    ))}
                    {dashboardScope === 'TEAM' && (
                      <select value={dashboardTeamId || ''} aria-label="Team"
                        onChange={e => { setDashboardTeamId(e.target.value); fetchDashboardAggregate('TEAM', e.target.value); }}
                        className="text-xs rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-1.5 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40">
                        <option value="">Select a team…</option>
                        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    )}
                    {dashboardScope !== 'PROJECT' && (
                      <span className="text-xs text-neutral-600 dark:text-neutral-400">Aggregated across {dashboardScope === 'TEAM' ? "the team's projects" : 'the workspace'}</span>
                    )}
                  </div>

                  {dashboardEditMode && (
                    <div className="mb-4 p-3 rounded-md bg-neutral-100 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wide">Widget library</span>
                        <span className="text-xs text-neutral-600 dark:text-neutral-400">Drag widgets to reorder</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider w-20 flex-shrink-0">Basics</span>
                          <button onClick={() => addDashboardWidget('SCORECARD', { filter: { open: true } }, 'Open items')} className="text-xs px-2 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-brand-navy hover:bg-white dark:hover:bg-neutral-800 transition-colors">Scorecard</button>
                          <button onClick={() => addDashboardWidget('STATUS_BAR', {}, 'By status')} className="text-xs px-2 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-brand-navy hover:bg-white dark:hover:bg-neutral-800 transition-colors">Status breakdown</button>
                          <button onClick={() => addDashboardWidget('ITEM_LIST', { filter: { open: true }, limit: 6 }, 'Open work items')} className="text-xs px-2 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-brand-navy hover:bg-white dark:hover:bg-neutral-800 transition-colors">Item list</button>
                          <button onClick={() => addDashboardWidget('PIE', { dimension: 'status' }, 'Items by status')} className="text-xs px-2 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-brand-navy hover:bg-white dark:hover:bg-neutral-800 transition-colors">Pie chart</button>
                          <button onClick={() => addDashboardWidget('BAR', { dimension: 'priority' }, 'Items by priority')} className="text-xs px-2 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-brand-navy hover:bg-white dark:hover:bg-neutral-800 transition-colors">Bar chart</button>
                        </div>
                        {EXTRA_WIDGET_CATEGORIES.map(cat => (
                          <div key={cat} className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider w-20 flex-shrink-0">{cat}</span>
                            {EXTRA_WIDGET_PRESETS.filter(p => p.category === cat).map(p => (
                              <button key={p.title} onClick={() => addDashboardWidget(p.type, p.config, p.title, p.w)}
                                className="text-xs px-2 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-brand-navy hover:bg-white dark:hover:bg-neutral-800 transition-colors">
                                {p.title}
                              </button>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(selectedDashboard.widgets || []).length === 0 ? (
                    <EmptyState icon={Puzzle} title="Empty dashboard"
                      subtitle="Turn on Edit and add your first widget to start tracking."
                      action={<Button variant="action" onClick={() => setDashboardEditMode(true)}>Edit dashboard</Button>} />
                  ) : (
                    <div id="dashboard-export-area" className="grid grid-cols-12 gap-4">
                      {selectedDashboard.widgets.map(w => (
                        <DashboardWidgetCard key={w.id} widget={w} workItems={workItems} aggregate={dashboardAggregate} editMode={dashboardEditMode}
                          sprints={sprints} velocity={velocityData} currentUserId={currentUser?.id}
                          onRemove={() => removeDashboardWidget(w.id)}
                          onResize={gridW => resizeDashboardWidget(w, gridW)}
                          onConfigChange={cfg => updateDashboardWidgetConfig(w, cfg)}
                          onDrill={setDashboardDrill}
                          onDragStart={() => setDragWidgetId(w.id)}
                          onDrop={() => reorderDashboardWidgets(w.id)} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {view === 'dashboards' && dashboardDrill && (
            <DashboardDrillModal drill={dashboardDrill} onClose={() => setDashboardDrill(null)}
              onOpenItem={item => { setSelectedItem(item); setDashboardDrill(null); }} />
          )}

          {view === 'reportbuilder' && (
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
                      <button onClick={() => setSelectedReport(null)} className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-brand-navy transition-colors flex-shrink-0"><ArrowLeft className="inline-block h-3.5 w-3.5 mr-1 align-text-bottom" aria-hidden="true" />Reports</button>
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
                      <Button variant={reportEditMode ? 'secondary' : 'action'} onClick={() => { if (reportEditMode) { openReport(selectedReport.id); } else { setReportEditMode(true); } }}>{reportEditMode ? 'Cancel' : 'Edit'}</Button>
                      <button onClick={() => deleteReport(selectedReport.id)} className="text-xs text-semantic-danger hover:underline">Delete</button>
                    </div>
                  </div>

                  {reportEditMode && (
                    <div className="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-md bg-neutral-100 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700">
                      <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wide mr-1">Add section</span>
                      <button onClick={() => addReportSection('kpi')} className="text-xs px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-brand-navy transition-colors">+ KPI</button>
                      <button onClick={() => addReportSection('chart')} className="text-xs px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-brand-navy transition-colors">+ Chart</button>
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
                          workItems={workItems} editMode={reportEditMode}
                          onChange={s => updateReportSection(i, s)}
                          onMove={delta => moveReportSection(i, delta)}
                          onRemove={() => removeReportSection(i)} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Iteration 6 — scheduled report delivery (Cap J, S04) */}
          {scheduleManagerOpen && selectedReport && (
            <Modal title="Scheduled delivery" onClose={() => setScheduleManagerOpen(false)} size="lg" className="max-h-[90vh] overflow-y-auto">
                <p className="text-xs text-neutral-500 mb-4 truncate">“{selectedReport.name}” — delivered on a cadence to recipients (in-app / email).</p>

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
                      <label className="block text-xs text-neutral-500 mb-1">Cadence</label>
                      <select className="input w-full" value={scheduleForm.cadence} onChange={e => setScheduleForm({ ...scheduleForm, cadence: e.target.value })}>
                        <option value="DAILY">Daily</option>
                        <option value="WEEKLY">Weekly</option>
                        <option value="MONTHLY">Monthly</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-500 mb-1">Channel</label>
                      <select className="input w-full" value={scheduleForm.channel} onChange={e => setScheduleForm({ ...scheduleForm, channel: e.target.value })}>
                        <option value="IN_APP">In-app</option>
                        <option value="EMAIL">Email</option>
                        <option value="BOTH">Both</option>
                      </select>
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="block text-xs text-neutral-500 mb-1">Recipients (comma-separated user ids — optional; owner always included)</label>
                    <input className="input w-full" value={scheduleForm.recipients} onChange={e => setScheduleForm({ ...scheduleForm, recipients: e.target.value })} placeholder="USR-123, USR-456" />
                  </div>
                  <div className="flex justify-end">
                    <Button variant="action" onClick={createReportSchedule}>Add schedule</Button>
                  </div>
                </div>
            </Modal>
          )}

          {/* ======================================================
               ITERATION 5 — KNOWLEDGE REPOSITORY
             ====================================================== */}
          {view === 'knowledge' && (
            <div className="flex h-full overflow-hidden">
              {/* Left sidebar — spaces */}
              <div className="w-64 flex-shrink-0 border-r border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 flex flex-col">
                <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">Knowledge Spaces</h2>
                    <button onClick={() => setIsSpaceFormOpen(true)} className="w-6 h-6 flex items-center justify-center rounded bg-brand-navy text-white text-sm hover:opacity-80 transition-opacity" title="New space">+</button>
                  </div>
                  {/* Search */}
                  <div className="relative">
                    <input type="text" placeholder="Search articles..." value={knowledgeSearch}
                      onChange={e => setKnowledgeSearch(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { searchKnowledge(); setKnowledgeTab('search'); } }}
                      className="input text-xs pl-6 py-1.5 w-full" />
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-600 dark:text-neutral-400"><Search className="h-3.5 w-3.5" aria-hidden="true" /></span>
                  </div>
                </div>
                {/* All articles shortcut */}
                <div className="px-2 py-1">
                  <button onClick={() => { setSelectedSpace(null); setSelectedArticle(null); setKnowledgeTab('all'); fetchKnowledgeArticles(null); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${knowledgeTab === 'all' && !selectedSpace ? 'bg-brand-navy/10 text-brand-navy' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}>
                    <FileText className="inline-block h-3.5 w-3.5 mr-1.5 align-text-bottom" aria-hidden="true" />All Articles
                  </button>
                </div>
                {/* Space list */}
                <div className="flex-1 overflow-y-auto px-2 pb-2">
                  {knowledgeSpaces.length === 0 && (
                    <p className="text-xs text-neutral-600 text-center py-6">No spaces yet. Create one to get started.</p>
                  )}
                  {knowledgeSpaces.map(space => (
                    <div key={space.id}>
                      <button onClick={() => { setSelectedSpace(space); setSelectedArticle(null); setEditingArticle(false); setKnowledgeTab('space'); fetchKnowledgeArticles(space.id); }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors group flex items-center justify-between ${selectedSpace?.id === space.id ? 'bg-brand-navy/10 text-brand-navy' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}>
                        <span className="flex items-center gap-1.5">
                          {space.icon ? <span>{space.icon}</span> : <Folder className="h-3.5 w-3.5" aria-hidden="true" />}
                          <span className="truncate">{space.name}</span>
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${space.visibility === 'PUBLIC' ? 'bg-semantic-success-surface text-semantic-success' : space.visibility === 'PRIVATE' ? 'bg-semantic-danger-surface text-semantic-danger' : 'bg-brand-navy/10 text-brand-navy'}`}>
                          {space.visibility || 'TEAM'}
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Main content area */}
              <div className="flex-1 flex overflow-hidden">
                {/* Article list panel */}
                {!selectedArticle && (
                  <div className="flex-1 overflow-y-auto p-6">
                    {knowledgeTab === 'search' ? (
                      <div>
                        <div className="flex items-center gap-3 mb-4">
                          <h1 className="text-xl font-bold text-brand-navy dark:text-white">Search Results</h1>
                          <span className="text-sm text-neutral-600 dark:text-neutral-400">{knowledgeSearchResults.length} results for "{knowledgeSearch}"</span>
                          <button onClick={() => { setKnowledgeTab('spaces'); setKnowledgeSearch(''); setKnowledgeSearchResults([]); }} className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-700 ml-auto">Clear</button>
                        </div>
                        {knowledgeSearchResults.length === 0 ? (
                          <EmptyState icon={Search} title="No results found" subtitle={`No articles match "${knowledgeSearch}". Try different keywords.`} />
                        ) : (
                          <div className="space-y-2">
                            {knowledgeSearchResults.map(art => (
                              <div key={art.id} onClick={() => { setSelectedArticle(art); setEditingArticle(false); setArticlePanel(null); }} role="button" tabIndex={0} onKeyDown={onPressKey}
                                className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 cursor-pointer hover:border-brand-navy/40 hover:shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-navy-tint/40">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">{art.title}</p>
                                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5 line-clamp-2">{(art.content || '').substring(0, 120)}{(art.content || '').length > 120 ? '...' : ''}</p>
                                  </div>
                                  <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${art.status === 'PUBLISHED' ? 'bg-semantic-success-surface text-semantic-success' : art.status === 'DRAFT' ? 'bg-neutral-100 dark:bg-neutral-700 text-neutral-500' : 'bg-semantic-warning-surface text-semantic-warning'}`}>{art.status || 'DRAFT'}</span>
                                    <span className="text-xs text-neutral-600 dark:text-neutral-400 font-mono">{art.templateType || 'KB'}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (selectedSpace || knowledgeTab === 'all') ? (
                      <div>
                        <div className="flex items-center justify-between mb-5">
                          <div className="flex items-center gap-3">
                            {selectedSpace && <button onClick={() => { setSelectedSpace(null); setKnowledgeTab('spaces'); }} className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-brand-navy transition-colors"><ArrowLeft className="inline-block h-3.5 w-3.5 mr-1 align-text-bottom" aria-hidden="true" />Spaces</button>}
                            <h1 className="text-xl font-bold text-brand-navy dark:text-white">{selectedSpace ? selectedSpace.name : 'All Articles'}</h1>
                            {selectedSpace?.description && <p className="text-xs text-neutral-600 dark:text-neutral-400">{selectedSpace.description}</p>}
                          </div>
                          <div className="flex items-center gap-2">
                            {selectedSpace && can('manage_projects') && (
                              <button onClick={() => deleteKnowledgeSpace(selectedSpace.id)} className="text-xs text-semantic-danger hover:underline">Delete Space</button>
                            )}
                            {selectedSpace && (
                              <Button variant="action" onClick={() => { setIsArticleFormOpen(true); setArticleForm({ title: '', content: '', templateType: 'KB', status: 'DRAFT' }); }}>+ New Article</Button>
                            )}
                          </div>
                        </div>
                        {knowledgeArticles.length === 0 ? (
                          <EmptyState icon={FileIcon} title={selectedSpace ? `No articles in ${selectedSpace.name}` : 'No articles'} subtitle="Create your first article to capture knowledge for the team."
                            action={selectedSpace && <Button variant="action" onClick={() => setIsArticleFormOpen(true)}>Write Article</Button>} />
                        ) : (
                          <div className="space-y-2">
                            {knowledgeArticles.map(art => (
                              <div key={art.id} onClick={() => { setSelectedArticle(art); setEditingArticle(false); setArticlePanel(null); }} role="button" tabIndex={0} onKeyDown={onPressKey}
                                className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 cursor-pointer hover:border-brand-navy/40 hover:shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-navy-tint/40">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <p className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 truncate">{art.title}</p>
                                    </div>
                                    <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2">{(art.content || '').substring(0, 120)}{(art.content || '').length > 120 ? '...' : ''}</p>
                                    <div className="flex items-center gap-3 mt-2">
                                      <span className="text-xs text-neutral-600 dark:text-neutral-400">v{art.versionNumber || 1} · {art.authorName || 'Unknown'}</span>
                                      {art.updatedAt && <span className="text-xs text-neutral-600 dark:text-neutral-400">{new Date(art.updatedAt).toLocaleDateString()}</span>}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${art.status === 'PUBLISHED' ? 'bg-semantic-success-surface text-semantic-success' : art.status === 'DRAFT' ? 'bg-neutral-100 dark:bg-neutral-700 text-neutral-500' : art.status === 'ARCHIVED' ? 'bg-neutral-200 dark:bg-neutral-600 text-neutral-500' : 'bg-semantic-warning-surface text-semantic-warning'}`}>{art.status || 'DRAFT'}</span>
                                    <span className="text-xs bg-brand-navy/10 text-brand-navy px-1.5 py-0.5 rounded font-mono">{art.templateType || 'KB'}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <EmptyState icon={BookOpen} title="Select a space" subtitle="Choose a knowledge space from the left sidebar to browse articles, or search for specific content." />
                    )}
                  </div>
                )}

                {/* Article detail / editor panel */}
                {selectedArticle && (
                  <div className="flex-1 overflow-y-auto flex flex-col">
                    {/* Article header */}
                    <div className="border-b border-neutral-200 dark:border-neutral-700 px-6 py-4 flex items-center justify-between bg-white dark:bg-neutral-800 flex-shrink-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <button onClick={() => { setSelectedArticle(null); setEditingArticle(false); setArticlePanel(null); }} className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-brand-navy transition-colors flex-shrink-0" aria-label="Back"><ArrowLeft className="h-4 w-4" aria-hidden="true" /></button>
                        <div className="min-w-0">
                          <h1 className="font-bold text-lg text-neutral-900 dark:text-white truncate">{selectedArticle.title}</h1>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${selectedArticle.status === 'PUBLISHED' ? 'bg-semantic-success-surface text-semantic-success' : selectedArticle.status === 'DRAFT' ? 'bg-neutral-100 dark:bg-neutral-700 text-neutral-500' : 'bg-neutral-200 dark:bg-neutral-600 text-neutral-500'}`}>{selectedArticle.status || 'DRAFT'}</span>
                            <span className="text-xs font-mono text-neutral-600 dark:text-neutral-400">{selectedArticle.templateType || 'KB'}</span>
                            <span className="text-xs text-neutral-600 dark:text-neutral-400">v{selectedArticle.versionNumber || 1}</span>
                            {selectedArticle.updatedAt && <span className="text-xs text-neutral-600 dark:text-neutral-400">Updated {new Date(selectedArticle.updatedAt).toLocaleDateString()}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {[
                          { key: 'history',   label: `History (${articleVersions.length})` },
                          { key: 'comments',  label: 'Comments' },
                          { key: 'analytics', label: 'Analytics' },
                        ].map(p => (
                          <button key={p.key} onClick={() => openArticlePanel(p.key)} aria-pressed={articlePanel === p.key}
                            className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${articlePanel === p.key ? 'bg-brand-navy text-white border-brand-navy' : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-brand-navy'}`}>
                            {p.label}
                          </button>
                        ))}
                        {/* Status-aware publishing workflow — single primary action per state */}
                        {selectedArticle.status === 'IN_REVIEW' && (
                          <button onClick={() => rejectArticle(selectedArticle.id)} className="text-xs text-semantic-warning hover:underline">Request changes</button>
                        )}
                        {(!selectedArticle.status || selectedArticle.status === 'DRAFT') && (
                          <Button variant="action" onClick={() => submitArticleForReview(selectedArticle.id)}>Submit for review</Button>
                        )}
                        {selectedArticle.status === 'IN_REVIEW' && (
                          <Button variant="action" onClick={() => publishArticle(selectedArticle.id)}>Publish</Button>
                        )}
                        {selectedArticle.status === 'PUBLISHED' && (
                          <Button variant="secondary" onClick={() => archiveArticle(selectedArticle.id)}>Archive</Button>
                        )}
                        {selectedArticle.status === 'ARCHIVED' && (
                          <Button variant="secondary" onClick={() => restoreArticle(selectedArticle.id)}>Restore</Button>
                        )}
                        <Button variant="secondary" onClick={() => setEditingArticle(e => !e)}>
                          {editingArticle ? 'View' : 'Edit'}
                        </Button>
                        <button onClick={() => deleteArticle(selectedArticle.id)} className="text-xs text-semantic-danger hover:underline">Delete</button>
                      </div>
                    </div>

                    <div className="flex flex-1 overflow-hidden">
                      {/* Content area */}
                      <div className="flex-1 overflow-y-auto p-6">
                        {editingArticle ? (
                          <div className="space-y-4">
                            <div>
                              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block mb-1">Title</label>
                              <input className="input text-lg font-bold w-full" value={selectedArticle.title || ''}
                                onChange={e => setSelectedArticle(a => ({ ...a, title: e.target.value }))}
                                onBlur={() => updateArticle(selectedArticle.id, { title: selectedArticle.title, content: selectedArticle.content })} />
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block mb-1">Template Type</label>
                              <select className="input text-sm w-48" value={selectedArticle.templateType || 'KB'}
                                onChange={e => { const t = e.target.value; setSelectedArticle(a => ({ ...a, templateType: t })); updateArticle(selectedArticle.id, { templateType: t }); }}>
                                {['KB','RUNBOOK','ADR','POSTMORTEM','ONBOARDING','TROUBLESHOOTING','CUSTOM'].map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block mb-1">Content (Markdown supported)</label>
                              <textarea rows={20} className="input resize-none font-mono text-sm w-full"
                                value={selectedArticle.content || ''}
                                onChange={e => setSelectedArticle(a => ({ ...a, content: e.target.value }))}
                                onBlur={() => updateArticle(selectedArticle.id, { title: selectedArticle.title, content: selectedArticle.content, templateType: selectedArticle.templateType })}
                                placeholder="Write your article content here... Supports Markdown formatting." />
                            </div>
                            <Button variant="action" onClick={() => updateArticle(selectedArticle.id, { title: selectedArticle.title, content: selectedArticle.content, templateType: selectedArticle.templateType })}>
                              Save Changes
                            </Button>
                          </div>
                        ) : (
                          <div className="prose prose-sm max-w-none dark:prose-invert">
                            {selectedArticle.content ? (
                              <div className="text-neutral-800 dark:text-neutral-200 leading-relaxed whitespace-pre-wrap text-sm"
                                dangerouslySetInnerHTML={{ __html: renderMd(selectedArticle.content) }} />
                            ) : (
                              <EmptyState icon={FileText} title="No content yet" subtitle="Click Edit to start writing." action={<Button variant="action" onClick={() => setEditingArticle(true)}>Start Writing</Button>} />
                            )}
                          </div>
                        )}
                      </div>

                      {/* Contextual side panel — history / comments / analytics */}
                      {articlePanel === 'history' && (
                        <div className="w-64 flex-shrink-0 border-l border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 overflow-y-auto p-4">
                          <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Version history</h3>
                          {articleVersions.length === 0 ? (
                            <p className="text-xs text-neutral-600">No versions saved yet.</p>
                          ) : (
                            <div className="space-y-2">
                              {articleVersions.map(v => (
                                <div key={v.id} className="bg-white dark:bg-neutral-800 rounded-lg p-3 border border-neutral-200 dark:border-neutral-700">
                                  <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">Version {v.versionNumber}</p>
                                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">{v.savedBy || 'Unknown'}</p>
                                  <p className="text-xs text-neutral-600 dark:text-neutral-400">{v.savedAt ? new Date(v.savedAt).toLocaleString() : '—'}</p>
                                  <button onClick={() => setSelectedArticle(a => ({ ...a, content: v.content }))}
                                    className="text-xs text-brand-navy hover:underline mt-1">Restore</button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {articlePanel === 'comments' && (
                        <div className="w-72 flex-shrink-0 border-l border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 overflow-y-auto p-4 flex flex-col">
                          <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Comments ({articleComments.length})</h3>
                          <div className="flex-1 space-y-2">
                            {articleComments.length === 0 && (
                              <p className="text-xs text-neutral-600">No comments yet. Start the discussion below.</p>
                            )}
                            {articleComments.map(c => (
                              <div key={c.id} className={`rounded-lg p-3 border ${c.resolved ? 'bg-semantic-success-surface border-semantic-success/30' : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700'}`}>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">{c.authorName || 'Unknown'}</span>
                                  <span className="text-xs text-neutral-600 dark:text-neutral-400">{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ''}</span>
                                </div>
                                <p className="text-xs text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">{c.body}</p>
                                <div className="flex items-center gap-3 mt-1.5">
                                  <button onClick={() => toggleArticleComment(selectedArticle.id, c.id, !c.resolved)}
                                    className="text-xs text-brand-navy hover:underline">{c.resolved ? 'Reopen' : 'Resolve'}</button>
                                  <button onClick={() => deleteArticleComment(selectedArticle.id, c.id)}
                                    className="text-xs text-semantic-danger hover:underline">Delete</button>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-700">
                            <textarea rows={3} value={newArticleComment} onChange={e => setNewArticleComment(e.target.value)}
                              placeholder="Add a comment…" className="input resize-none text-xs w-full" />
                            <Button variant="action" className="mt-2 w-full" onClick={() => addArticleComment(selectedArticle.id)}>Comment</Button>
                          </div>
                        </div>
                      )}

                      {articlePanel === 'analytics' && (
                        <div className="w-64 flex-shrink-0 border-l border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 overflow-y-auto p-4">
                          <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Analytics</h3>
                          {!articleAnalytics ? (
                            <p className="text-xs text-neutral-600 dark:text-neutral-400">Loading…</p>
                          ) : (
                            <div className="space-y-2">
                              {[
                                { label: 'Views', value: articleAnalytics.viewCount },
                                { label: 'Helpful votes', value: articleAnalytics.helpfulVotes },
                                { label: 'Work-item citations', value: articleAnalytics.citationCount },
                                { label: 'Open comments', value: articleAnalytics.openComments },
                                { label: 'Versions', value: articleAnalytics.versionCount },
                                { label: 'Days since update', value: articleAnalytics.daysSinceUpdate },
                              ].map(m => (
                                <div key={m.label} className="bg-white dark:bg-neutral-800 rounded-lg p-3 border border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
                                  <span className="text-xs text-neutral-600 dark:text-neutral-400">{m.label}</span>
                                  <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{m.value ?? '—'}</span>
                                </div>
                              ))}
                              {articleAnalytics.stale && (
                                <div className="bg-semantic-warning-surface border border-semantic-warning/30 rounded-lg p-3 flex items-center gap-2">
                                  <AlertTriangle className="h-4 w-4 text-semantic-warning flex-shrink-0" aria-hidden="true" />
                                  <span className="text-xs text-semantic-warning font-medium">Stale — published over {90} days ago without an update.</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================
               ITERATION 6 — RELEASES
             ====================================================== */}
          {view === 'releases' && (
            <ReleasesView
              releases={releases}
              releaseSearch={releaseSearch}
              selectedRelease={selectedRelease}
              releaseItems={releaseItems}
              projects={projects}
              workItems={workItems}
              setIsReleaseOpen={setIsReleaseOpen}
              setReleaseSearch={setReleaseSearch}
              setSelectedRelease={setSelectedRelease}
              setSelectedItem={setSelectedItem}
              fetchReleases={fetchReleases}
              fetchReleaseItems={fetchReleaseItems}
              updateRelease={updateRelease}
              deleteRelease={deleteRelease}
              removeItemFromRelease={removeItemFromRelease}
              addItemToRelease={addItemToRelease}
              onPressKey={onPressKey}
            />
          )}

          {view === 'sla' && (
            <SlaView workspaceId="WS-001" canManage={can('manage_sla')} onToast={showToast} />
          )}

          {view === 'smcockpit' && (
            <div className="flex flex-col h-full overflow-y-auto p-6 max-w-7xl mx-auto w-full">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h1 className="text-2xl font-bold text-brand-navy dark:text-white">Scrum Master Cockpit</h1>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Run the sprint — standup, impediments, risk, retro and review in one place.</p>
                </div>
                <select className="input text-sm py-1.5" value={i15ProjectId}
                  onChange={e => { setI15ProjectId(e.target.value); fetchImpediments(e.target.value); fetchStandups(e.target.value); fetchRetros(e.target.value); fetchSprints(e.target.value); }}>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div className="flex flex-wrap gap-2 mb-5">
                <Button variant="action" onClick={() => setSmTab('planning')}>Plan sprint</Button>
                <Button variant="secondary" onClick={() => setSmTab('standup')}>Start standup</Button>
                <Button variant="secondary" onClick={() => setSmTab('retro')}>Run retro</Button>
              </div>

              <div className="flex flex-wrap gap-1 border-b border-neutral-200 dark:border-neutral-700 mb-5">
                {[['impediments', 'Impediments'], ['standup', 'Standup'], ['risk', 'Risk panel'], ['planning', 'Planning'], ['retro', 'Retro'], ['review', 'Review prep'], ['patterns', 'Patterns']].map(([k, label]) => (
                  <button key={k} onClick={() => setSmTab(k)}
                    className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${smTab === k ? 'border-brand-navy text-brand-navy dark:text-white' : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'}`}>
                    {label}
                  </button>
                ))}
              </div>

              {smTab === 'impediments' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  <div className="lg:col-span-2 space-y-2">
                    {impediments.length === 0
                      ? <EmptyState icon={Construction} title="No impediments" subtitle="Blockers raised here are tracked with owner, severity and age — not buried in chat." />
                      : impediments.map(imp => (
                        <div key={imp.id} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${imp.severity === 'CRITICAL' ? 'bg-semantic-danger text-white' : imp.severity === 'HIGH' ? 'bg-brand-amber text-white' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'}`}>{imp.severity}</span>
                                <span className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 truncate">{imp.title}</span>
                              </div>
                              {imp.description && <p className="text-xs text-neutral-500 mb-1">{imp.description}</p>}
                              <p className="text-[11px] text-neutral-600 dark:text-neutral-400">{imp.category || 'Uncategorized'} · raised {imp.raisedAt ? new Date(imp.raisedAt).toLocaleDateString() : '—'}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${imp.status === 'RESOLVED' ? 'bg-semantic-success text-white' : imp.status === 'ESCALATED' ? 'bg-semantic-danger text-white' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-500'}`}>{imp.status}</span>
                              {imp.status !== 'RESOLVED' && (
                                <div className="flex gap-2">
                                  {imp.status !== 'ESCALATED' && <button onClick={() => updateImpediment(imp, { status: 'ESCALATED', escalated: true })} className="text-[11px] text-semantic-danger hover:underline">Escalate</button>}
                                  <button onClick={() => updateImpediment(imp, { status: 'RESOLVED' })} className="text-[11px] text-brand-navy hover:underline">Resolve</button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                  <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 h-fit">
                    <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 mb-3">Raise impediment</h3>
                    <div className="space-y-3">
                      <Field label="Title"><input className="input w-full text-sm" value={newImpediment.title} onChange={e => setNewImpediment({ ...newImpediment, title: e.target.value })} placeholder="What is blocked?" /></Field>
                      <Field label="Severity">
                        <select className="input w-full text-sm" value={newImpediment.severity} onChange={e => setNewImpediment({ ...newImpediment, severity: e.target.value })}>
                          {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </Field>
                      <Field label="Category"><input className="input w-full text-sm" value={newImpediment.category} onChange={e => setNewImpediment({ ...newImpediment, category: e.target.value })} placeholder="e.g. Environment, Dependency" /></Field>
                      <Field label="Detail"><textarea className="input w-full text-sm" rows={2} value={newImpediment.description} onChange={e => setNewImpediment({ ...newImpediment, description: e.target.value })} /></Field>
                      <Button variant="action" fullWidth onClick={createImpediment}>Raise impediment</Button>
                    </div>
                  </div>
                </div>
              )}

              {smTab === 'standup' && (
                <div>
                  {!activeStandup ? (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Standups</h3>
                        <Button variant="action" onClick={startStandup}>Start standup</Button>
                      </div>
                      {standups.length === 0
                        ? <EmptyState icon={MessageCircle} title="No standups yet" subtitle="Start a sequential, time-boxed standup — each member's turn is recorded." />
                        : <div className="space-y-2">{standups.map(s => (
                            <button key={s.id} onClick={() => openStandup(s.id)} className="w-full text-left bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-3 hover:border-brand-navy/40">
                              <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{s.sessionDate ? new Date(s.sessionDate).toLocaleDateString() : s.id}</span>
                              <span className={`ml-2 text-xs font-bold px-1.5 py-0.5 rounded ${s.status === 'COMPLETED' ? 'bg-semantic-success text-white' : 'bg-brand-navy text-white'}`}>{s.status}</span>
                            </button>))}</div>}
                    </div>
                  ) : (
                    <div className="max-w-[880px]">
                      <button onClick={() => setActiveStandup(null)} className="text-xs text-brand-navy hover:underline mb-3"><ArrowLeft className="inline-block h-3.5 w-3.5 mr-1 align-text-bottom" aria-hidden="true" />All standups</button>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Standup — {activeStandup.session.status}</h3>
                        {activeStandup.session.status !== 'COMPLETED' && (
                          <div className="flex gap-2">
                            <Button variant="secondary" onClick={advanceStandup}>Next member</Button>
                            <Button variant="action" onClick={completeStandup}>Complete</Button>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        {activeStandup.entries.map(e => {
                          const isCurrent = e.memberId === activeStandup.session.currentMemberId;
                          const name = (users.find(u => u.id === e.memberId) || {}).fullName || e.memberId;
                          return (
                            <div key={e.id} className={`rounded-xl p-3 border ${isCurrent ? 'border-brand-navy bg-brand-navy/5' : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800'}`}>
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{name}</span>
                                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${e.status === 'RECORDED' ? 'bg-semantic-success text-white' : e.status === 'MISSING' ? 'bg-semantic-danger text-white' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-500'}`}>{e.status}</span>
                              </div>
                              {e.status === 'RECORDED' && (
                                <div className="text-xs text-neutral-600 dark:text-neutral-300 mt-2 space-y-0.5">
                                  <p><span className="font-semibold">Yesterday:</span> {e.yesterday || '—'}</p>
                                  <p><span className="font-semibold">Today:</span> {e.today || '—'}</p>
                                  {e.blockers && <p className="text-semantic-danger"><span className="font-semibold">Blockers:</span> {e.blockers}</p>}
                                </div>
                              )}
                              {isCurrent && e.status !== 'RECORDED' && activeStandup.session.status !== 'COMPLETED' && (
                                <div className="mt-2 space-y-2">
                                  <input className="input w-full text-xs" placeholder="Yesterday" value={standupDraft.yesterday} onChange={ev => setStandupDraft({ ...standupDraft, yesterday: ev.target.value })} />
                                  <input className="input w-full text-xs" placeholder="Today" value={standupDraft.today} onChange={ev => setStandupDraft({ ...standupDraft, today: ev.target.value })} />
                                  <input className="input w-full text-xs" placeholder="Blockers (optional)" value={standupDraft.blockers} onChange={ev => setStandupDraft({ ...standupDraft, blockers: ev.target.value })} />
                                  <Button variant="action" onClick={() => recordStandup(e.id)}>Record & next</Button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {smTab === 'risk' && (
                <div>
                  <div className="flex items-end gap-2 mb-4">
                    <Field label="Sprint">
                      <select className="input text-sm" value={riskSprintId} onChange={e => setRiskSprintId(e.target.value)}>
                        <option value="">Select sprint…</option>
                        {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </Field>
                    <Button variant="action" onClick={runRiskPanel}>Analyze</Button>
                  </div>
                  {!riskPanel ? <EmptyState icon={AlertTriangle} title="Mid-sprint risk panel" subtitle="Live view of scope creep, stale items, unassigned work and breach predictions." />
                    : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[['Scope creep', riskPanel.scopeCreep, 'work_item_id'], ['Stale items', riskPanel.staleItems, 'id'], ['Unassigned', riskPanel.unassignedItems, 'id'], ['Breach risk', riskPanel.breachPredictions, 'id']].map(([label, rows]) => (
                          <div key={label} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">{label}</h4>
                              <span className="text-lg font-bold text-brand-navy dark:text-white">{(rows || []).length}</span>
                            </div>
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {(rows || []).map((r, idx) => <p key={idx} className="text-xs text-neutral-600 dark:text-neutral-300 truncate">{r.title || r.work_item_id || r.id}</p>)}
                              {(rows || []).length === 0 && <p className="text-xs text-neutral-600 dark:text-neutral-400">None — clear.</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              )}

              {smTab === 'planning' && (
                <div>
                  <div className="flex items-end gap-2 mb-4">
                    <Field label="Time off (points)"><input type="number" className="input text-sm w-28" value={planningTimeOff} onChange={e => setPlanningTimeOff(e.target.value)} /></Field>
                    <Button variant="action" onClick={runSprintPlanning}>Suggest commit</Button>
                  </div>
                  {!planningResult ? <EmptyState icon={LayoutDashboard} title="Sprint planning helper" subtitle="Capacity from rolling velocity, an AI-suggested commit, and the refined-item list." />
                    : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <StatCard label="Avg velocity" value={planningResult.averageVelocity} sub="last 3 sprints" color="text-brand-navy" icon={TrendingUp} />
                          <StatCard label="Capacity" value={planningResult.capacity} sub="velocity − time off" color="text-semantic-success" icon={Zap} />
                          <StatCard label="Suggested" value={planningResult.suggestedPoints} sub="points committed" color="text-brand-navy" icon={CheckCircle2} />
                          <StatCard label="Ready" value={planningResult.readyCount} sub="refined items" color="text-neutral-600" icon={ClipboardList} />
                        </div>
                        <AiMetaBadge meta={planningResult.meta} narrative={planningResult.narrative} />
                        <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
                          <h4 className="font-semibold text-sm mb-2 text-neutral-900 dark:text-neutral-100">Suggested commit</h4>
                          {(planningResult.suggestedItems || []).map(i => (
                            <div key={i.id} className="flex items-center gap-2 py-1.5 border-b border-neutral-100 dark:border-neutral-700 last:border-0">
                              <span className="flex-1 text-sm text-neutral-900 dark:text-neutral-100 truncate">{i.title}</span>
                              <span className="text-xs text-neutral-600 dark:text-neutral-400">{i.priority}</span>
                              <span className="text-xs font-mono text-brand-navy">{i.story_points} pts</span>
                            </div>
                          ))}
                          {(planningResult.suggestedItems || []).length === 0 && <p className="text-xs text-neutral-600">No ready items fit the capacity.</p>}
                        </div>
                      </div>
                    )}
                </div>
              )}

              {smTab === 'retro' && (
                <div>
                  {!activeRetro ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                      <div className="lg:col-span-2 space-y-2">
                        {retros.length === 0
                          ? <EmptyState icon={RefreshCw} title="No retros yet" subtitle="Pick a template, gather the team, and turn outcomes into tracked action items." />
                          : retros.map(r => (
                            <button key={r.id} onClick={() => openRetro(r.id)} className="w-full text-left bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-3 hover:border-brand-navy/40">
                              <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{r.title}</span>
                              <span className="ml-2 text-xs text-neutral-600 dark:text-neutral-400">{r.template}</span>
                              <span className={`ml-2 text-xs font-bold px-1.5 py-0.5 rounded ${r.status === 'COMPLETED' ? 'bg-semantic-success text-white' : 'bg-brand-navy text-white'}`}>{r.status}</span>
                            </button>))}
                      </div>
                      <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 h-fit">
                        <h3 className="font-semibold text-sm mb-3 text-neutral-900 dark:text-neutral-100">New retro</h3>
                        <div className="space-y-3">
                          <Field label="Title"><input className="input w-full text-sm" value={newRetro.title} onChange={e => setNewRetro({ ...newRetro, title: e.target.value })} /></Field>
                          <Field label="Template">
                            <select className="input w-full text-sm" value={newRetro.template} onChange={e => setNewRetro({ ...newRetro, template: e.target.value })}>
                              <option value="START_STOP_CONTINUE">Start / Stop / Continue</option>
                              <option value="FOUR_LS">4 Ls (Liked/Learned/Lacked/Longed for)</option>
                              <option value="MAD_SAD_GLAD">Mad / Sad / Glad</option>
                            </select>
                          </Field>
                          <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                            <input type="checkbox" checked={newRetro.anonymous} onChange={e => setNewRetro({ ...newRetro, anonymous: e.target.checked })} /> Anonymous
                          </label>
                          <Button variant="action" fullWidth onClick={createRetro}>Create retro</Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <button onClick={() => setActiveRetro(null)} className="text-xs text-brand-navy hover:underline mb-3"><ArrowLeft className="inline-block h-3.5 w-3.5 mr-1 align-text-bottom" aria-hidden="true" />All retros</button>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">{activeRetro.session.title}</h3>
                        {activeRetro.session.status !== 'COMPLETED' && <Button variant="secondary" onClick={() => { api.send(`/retros/${activeRetro.session.id}/complete`, { method: 'POST' }).then(() => openRetro(activeRetro.session.id)); }}>Complete</Button>}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {RETRO_COLUMNS[activeRetro.session.template].map(col => (
                          <div key={col.key} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-3">
                            <h4 className="font-semibold text-sm mb-2 text-neutral-900 dark:text-neutral-100">{col.label}</h4>
                            <div className="space-y-2 mb-2">
                              {activeRetro.notes.filter(n => n.columnKey === col.key).map(n => (
                                <div key={n.id} className="bg-neutral-50 dark:bg-neutral-700 rounded-md p-2">
                                  <p className="text-xs text-neutral-800 dark:text-neutral-100">{n.content}</p>
                                  <div className="flex items-center gap-3 mt-1">
                                    <button onClick={() => voteRetroNote(n.id)} className="text-[11px] text-brand-navy hover:underline" aria-label="Upvote"><ChevronUp className="inline-block h-3.5 w-3.5 align-text-bottom" aria-hidden="true" /> {n.votes}</button>
                                    {!n.convertedActionItemId && <button onClick={() => convertRetroNote(n.id)} className="text-[11px] text-semantic-success hover:underline" aria-label="Convert to action item"><ArrowRight className="inline-block h-3.5 w-3.5 align-text-bottom" aria-hidden="true" />Action</button>}
                                    {n.convertedActionItemId && <span className="text-xs text-neutral-600 dark:text-neutral-400"><Check className="inline-block h-3 w-3 align-text-bottom" aria-hidden="true" /> action</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                            {activeRetro.session.status !== 'COMPLETED' && (
                              <div className="flex gap-1">
                                <input className="input flex-1 text-xs" placeholder="Add…" value={retroNoteDraft[col.key] || ''} onChange={e => setRetroNoteDraft({ ...retroNoteDraft, [col.key]: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') addRetroNote(col.key); }} />
                                <button onClick={() => addRetroNote(col.key)} className="px-2 rounded-md bg-brand-navy text-white text-sm">+</button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {smTab === 'review' && (
                <div>
                  <div className="flex items-end gap-2 mb-4">
                    <Field label="Sprint">
                      <select className="input text-sm" value={reviewSprintId} onChange={e => setReviewSprintId(e.target.value)}>
                        <option value="">Select sprint…</option>
                        {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </Field>
                    <Button variant="action" onClick={runReviewPrep}>Draft review</Button>
                  </div>
                  {!reviewResult ? <EmptyState icon={Megaphone} title="Sprint review prep" subtitle="Auto-drafts the summary, demo list and metrics for stakeholders." />
                    : (
                      <div className="space-y-4">
                        <AiMetaBadge meta={reviewResult.meta} narrative={reviewResult.narrative} />
                        <div className="grid grid-cols-3 gap-3">
                          <StatCard label="Shipped" value={(reviewResult.shipped || []).length} sub={`${reviewResult.donePoints}/${reviewResult.totalPoints} pts`} color="text-semantic-success" icon={CheckCircle2} />
                          <StatCard label="Slipped" value={(reviewResult.slipped || []).length} sub="not done" color="text-semantic-warning" icon={Reply} />
                          <StatCard label="Completion" value={`${reviewResult.completionRate}%`} sub="of items" color="text-brand-navy" icon={BarChart2} />
                        </div>
                        <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
                          <h4 className="font-semibold text-sm mb-2 text-neutral-900 dark:text-neutral-100">Demo list</h4>
                          {(reviewResult.demoList || []).map(i => <p key={i.id} className="text-sm text-neutral-700 dark:text-neutral-200 py-0.5">• {i.title}</p>)}
                          {(reviewResult.demoList || []).length === 0 && <p className="text-xs text-neutral-600 dark:text-neutral-400">Nothing shipped yet.</p>}
                        </div>
                      </div>
                    )}
                </div>
              )}

              {smTab === 'patterns' && (
                <div>
                  <Button variant="action" onClick={runPatterns}>Detect patterns</Button>
                  {!patternsResult ? <div className="mt-4"><EmptyState icon={Repeat} title="Cross-sprint patterns" subtitle="Recurring impediments, repeated estimation misses, and common scope-creep sources." /></div>
                    : (
                      <div className="mt-4 space-y-4">
                        <AiMetaBadge meta={patternsResult.meta} narrative={patternsResult.narrative} />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
                            <h4 className="font-semibold text-sm mb-2 text-neutral-900 dark:text-neutral-100">Recurring impediments</h4>
                            {(patternsResult.recurringImpediments || []).map((r, i) => <p key={i} className="text-xs text-neutral-700 dark:text-neutral-200 py-0.5">{r.category} · {r.count}×</p>)}
                            {(patternsResult.recurringImpediments || []).length === 0 && <p className="text-xs text-neutral-600 dark:text-neutral-400">None.</p>}
                          </div>
                          <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
                            <h4 className="font-semibold text-sm mb-2 text-neutral-900 dark:text-neutral-100">Estimation misses</h4>
                            {(patternsResult.estimationMisses || []).map((r, i) => <p key={i} className="text-xs text-neutral-700 dark:text-neutral-200 py-0.5">{r.sprintName}: −{r.missedBy} pts</p>)}
                            {(patternsResult.estimationMisses || []).length === 0 && <p className="text-xs text-neutral-600 dark:text-neutral-400">None.</p>}
                          </div>
                          <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
                            <h4 className="font-semibold text-sm mb-2 text-neutral-900 dark:text-neutral-100">Scope-creep sources</h4>
                            {(patternsResult.scopeCreepSources || []).map((r, i) => <p key={i} className="text-xs text-neutral-700 dark:text-neutral-200 py-0.5">{r.actor || 'Unknown'} · {r.additions}×</p>)}
                            {(patternsResult.scopeCreepSources || []).length === 0 && <p className="text-xs text-neutral-600 dark:text-neutral-400">None.</p>}
                          </div>
                        </div>
                      </div>
                    )}
                </div>
              )}
            </div>
          )}

          {view === 'poworkspace' && (
            <PoWorkspaceView
              i15ProjectId={i15ProjectId}
              projects={projects}
              poTab={poTab}
              roadmapThemes={roadmapThemes}
              newTheme={newTheme}
              ideas={ideas}
              newIdea={newIdea}
              feedbackItems={feedbackItems}
              feedbackClusters={feedbackClusters}
              newFeedback={newFeedback}
              objectives={objectives}
              activeObjective={activeObjective}
              newObjective={newObjective}
              newKr={newKr}
              releaseNotesName={releaseNotesName}
              releaseNotesResult={releaseNotesResult}
              setI15ProjectId={setI15ProjectId}
              setPoTab={setPoTab}
              setNewTheme={setNewTheme}
              setNewIdea={setNewIdea}
              setNewFeedback={setNewFeedback}
              setNewObjective={setNewObjective}
              setNewKr={setNewKr}
              setReleaseNotesName={setReleaseNotesName}
              setView={setView}
              setPmProjectId={setPmProjectId}
              updateThemeStatus={updateThemeStatus}
              createTheme={createTheme}
              voteIdea={voteIdea}
              promoteIdea={promoteIdea}
              createIdea={createIdea}
              clusterFeedback={clusterFeedback}
              createFeedback={createFeedback}
              openObjective={openObjective}
              updateKrProgress={updateKrProgress}
              addKeyResult={addKeyResult}
              createObjective={createObjective}
              runReleaseNotes={runReleaseNotes}
              fetchStakeholders={fetchStakeholders}
            />
          )}
          {view === 'compliance' && (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Header + tabs */}
              <div className="px-6 pt-5 border-b border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h1 className="text-2xl font-bold text-brand-navy dark:text-white">Compliance</h1>
                    <p className="text-sm text-neutral-500">Native rules engine — define what compliance means, catch drift in hours not quarters.</p>
                  </div>
                  {complianceTab === 'rules' && can('manage_compliance') && (
                    <Button variant="action" onClick={newRuleBuilder}>New Rule</Button>
                  )}
                </div>
                <div className="flex gap-1">
                  {[
                    { key: 'dashboard',  label: 'Dashboard',  load: () => fetchComplianceDashboard() },
                    { key: 'rules',      label: 'Rules',      load: () => { fetchComplianceRules(); fetchComplianceTemplates(); } },
                    { key: 'violations', label: 'Violations', load: () => fetchComplianceViolations() },
                    { key: 'audit',      label: 'Audit log',  load: () => fetchComplianceAudit() },
                  ].map(t => (
                    <button key={t.key} onClick={() => { setComplianceTab(t.key); t.load(); }}
                      className={`text-sm font-medium px-3 py-2 border-b-2 transition-colors ${complianceTab === t.key ? 'border-brand-navy text-brand-navy' : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {/* ── DASHBOARD ── */}
                {complianceTab === 'dashboard' && (
                  !complianceDashboard ? <EmptyState icon={Shield} title="Loading compliance posture…" subtitle="Severity, trend and the rules × projects heatmap appear here." />
                  : (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                          { label: 'Active rules',  value: complianceDashboard.totals?.activeRules ?? 0,           tone: 'text-brand-navy' },
                          { label: 'Open',          value: complianceDashboard.totals?.openViolations ?? 0,        tone: 'text-semantic-danger' },
                          { label: 'Acknowledged',  value: complianceDashboard.totals?.acknowledgedViolations ?? 0, tone: 'text-semantic-warning' },
                          { label: 'Resolved',      value: complianceDashboard.totals?.resolvedViolations ?? 0,    tone: 'text-semantic-success' },
                        ].map(c => (
                          <div key={c.label} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
                            <p className="text-xs uppercase tracking-wide text-neutral-600 dark:text-neutral-400 font-semibold">{c.label}</p>
                            <p className={`text-3xl font-bold mt-1 ${c.tone}`}>{c.value}</p>
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
                          <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-3">Open by severity</h3>
                          {(complianceDashboard.severityBreakdown || []).length === 0
                            ? <p className="text-sm text-neutral-600 dark:text-neutral-400 py-4 text-center">No active violations. Clean posture.</p>
                            : (complianceDashboard.severityBreakdown || []).map(s => (
                              <div key={s.severity} className="flex items-center gap-3 py-1.5">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded w-20 text-center ${severityClass[s.severity] || severityClass.MEDIUM}`}>{s.severity}</span>
                                <div className="flex-1 h-2 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                                  <div className="h-full bg-brand-navy rounded-full" style={{ width: `${Math.min(100, Number(s.count) * 12)}%` }} />
                                </div>
                                <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-200 w-8 text-right">{s.count}</span>
                              </div>
                            ))}
                        </div>

                        <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
                          <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-3">Top rules by open violations</h3>
                          {(complianceDashboard.topRules || []).length === 0
                            ? <p className="text-sm text-neutral-600 dark:text-neutral-400 py-4 text-center">Nothing flagged.</p>
                            : (complianceDashboard.topRules || []).map(r => (
                              <div key={r.rule_id} className="flex items-center justify-between py-1.5 border-b border-neutral-100 dark:border-neutral-700 last:border-0">
                                <span className="text-sm text-neutral-700 dark:text-neutral-200 truncate">{r.rule_name}</span>
                                <span className="text-sm font-semibold text-semantic-danger ml-2">{r.count}</span>
                              </div>
                            ))}
                        </div>
                      </div>

                      <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
                        <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-1">30-day detection trend</h3>
                        {(complianceDashboard.trend || []).length === 0
                          ? <p className="text-sm text-neutral-600 dark:text-neutral-400 py-4 text-center">No violations detected in the last 30 days.</p>
                          : (
                            <div className="flex items-end gap-1 h-28 mt-3">
                              {(complianceDashboard.trend || []).map(d => {
                                const max = Math.max(...complianceDashboard.trend.map(x => Number(x.count)), 1);
                                return (
                                  <div key={d.day} className="flex-1 flex flex-col items-center justify-end" title={`${d.day}: ${d.count}`}>
                                    <div className="w-full bg-brand-navy-tint rounded-t" style={{ height: `${Math.max(4, Number(d.count) * 100 / max)}%` }} />
                                  </div>
                                );
                              })}
                            </div>
                          )}
                      </div>

                      <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
                        <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-3">Rules × projects heatmap</h3>
                        {(complianceDashboard.heatmap || []).length === 0
                          ? <p className="text-sm text-neutral-600 dark:text-neutral-400 py-4 text-center">No open violations to map.</p>
                          : (
                            <table className="w-full text-sm">
                              <thead><tr className="text-left text-xs uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
                                <th className="py-1">Rule</th><th className="py-1">Project</th><th className="py-1 text-right">Open</th></tr></thead>
                              <tbody>
                                {(complianceDashboard.heatmap || []).map((h, i) => (
                                  <tr key={i} className="border-t border-neutral-100 dark:border-neutral-700">
                                    <td className="py-1.5 text-neutral-700 dark:text-neutral-200">{h.rule_name}</td>
                                    <td className="py-1.5 font-mono text-xs text-neutral-600 dark:text-neutral-400">{h.project_id || '—'}</td>
                                    <td className="py-1.5 text-right font-semibold text-semantic-danger">{h.count}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                      </div>
                    </div>
                  )
                )}

                {/* ── RULES ── */}
                {complianceTab === 'rules' && (
                  <div className="space-y-6">
                    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
                      <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-3">Your rules ({complianceRules.length})</h3>
                      {complianceRules.length === 0
                        ? <EmptyState icon={ClipboardList} title="No rules yet" subtitle="Create a rule or start from a seeded template below." action={can('manage_compliance') ? <Button variant="action" onClick={newRuleBuilder}>New Rule</Button> : null} />
                        : complianceRules.map(r => (
                          <div key={r.id} className="flex items-center gap-3 py-2.5 border-b border-neutral-100 dark:border-neutral-700 last:border-0">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded w-20 text-center ${severityClass[r.severity] || severityClass.MEDIUM}`}>{r.severity}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{r.name}</p>
                              <p className="text-xs text-neutral-600 dark:text-neutral-400 truncate font-mono">{r.scopeBql ? `${r.scopeBql} ⟶ ` : ''}{r.assertionBql}</p>
                            </div>
                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${r.active ? 'bg-semantic-success text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500'}`}>{r.active ? 'ACTIVE' : 'INACTIVE'}</span>
                            {can('manage_compliance') && <>
                              <button onClick={() => testRule(r.id)} className="text-xs text-brand-navy hover:underline">Test</button>
                              {r.active
                                ? <button onClick={() => evaluateRule(r.id)} className="text-xs text-brand-navy hover:underline">Run</button>
                                : null}
                              <button onClick={() => setRuleActive(r.id, !r.active)} className="text-xs text-brand-navy hover:underline">{r.active ? 'Deactivate' : 'Activate'}</button>
                              <button onClick={() => editRuleBuilder(r)} className="text-xs text-neutral-500 hover:underline">Edit</button>
                              <button onClick={() => deleteRule(r.id)} className="text-xs text-semantic-danger hover:underline">Delete</button>
                            </>}
                          </div>
                        ))}
                      {ruleTestResult && ruleTestResult.valid && (
                        <p className="text-xs text-neutral-500 mt-3">Last test: would flag <b>{ruleTestResult.violations}</b> item(s){ruleTestResult.sample?.length ? ` — e.g. ${ruleTestResult.sample.slice(0, 3).map(s => s.id).join(', ')}` : ''}.</p>
                      )}
                    </div>

                    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
                      <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-1">Seeded template library</h3>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-3">Opinionated defaults — clone one, test it, then activate.</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {complianceTemplates.map(t => (
                          <div key={t.id} className="flex items-center gap-2 border border-neutral-200 dark:border-neutral-700 rounded-lg p-3">
                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${severityClass[t.severity] || severityClass.MEDIUM}`}>{t.severity}</span>
                            <span className="flex-1 text-sm text-neutral-700 dark:text-neutral-200 truncate" title={t.description}>{t.name}</span>
                            {can('manage_compliance') && <button onClick={() => cloneTemplate(t.id)} className="text-xs text-brand-navy hover:underline">+ Add</button>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── VIOLATIONS ── */}
                {complianceTab === 'violations' && (
                  <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <select value={violationFilter} onChange={e => { setViolationFilter(e.target.value); fetchComplianceViolations(e.target.value); }} className="input text-xs py-1">
                          <option value="">All statuses</option>
                          <option value="OPEN">Open</option>
                          <option value="ACKNOWLEDGED">Acknowledged</option>
                          <option value="RESOLVED">Resolved</option>
                          <option value="WONT_FIX">Won't fix</option>
                        </select>
                        <span className="text-xs text-neutral-600 dark:text-neutral-400">{complianceViolations.length} violation(s)</span>
                      </div>
                      {can('manage_compliance') && selectedViolations.length > 0 && (
                        <Button variant="secondary" onClick={bulkAcknowledge}>Acknowledge {selectedViolations.length}</Button>
                      )}
                    </div>
                    {complianceViolations.length === 0
                      ? <EmptyState icon={CheckCircle2} title="No violations" subtitle="Nothing is breaching the active rules for this filter." />
                      : complianceViolations.map(v => (
                        <div key={v.id} className="flex items-center gap-3 py-2.5 border-b border-neutral-100 dark:border-neutral-700 last:border-0">
                          {can('manage_compliance') && (v.status === 'OPEN' || v.status === 'ACKNOWLEDGED') && (
                            <input type="checkbox" checked={selectedViolations.includes(v.id)} onChange={() => toggleViolationSelect(v.id)} />
                          )}
                          <span className={`text-xs font-bold px-2 py-0.5 rounded w-20 text-center ${severityClass[v.severity] || severityClass.MEDIUM}`}>{v.severity}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-neutral-900 dark:text-neutral-100 truncate">{v.workItemTitle || v.workItemId}</p>
                            <p className="text-xs text-neutral-600 dark:text-neutral-400 font-mono">{v.workItemId}</p>
                          </div>
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${vStatusClass[v.status] || ''}`}>{v.status}{v.escalated ? <ArrowUp className="inline-block h-3 w-3 align-text-bottom" aria-label="Escalated" /> : ''}</span>
                          {can('manage_compliance') && (v.status === 'OPEN' || v.status === 'ACKNOWLEDGED') && <>
                            {v.status === 'OPEN' && <button onClick={() => actOnViolation(v.id, 'acknowledge')} className="text-xs text-brand-navy hover:underline">Ack</button>}
                            <button onClick={() => actOnViolation(v.id, 'resolve')} className="text-xs text-semantic-success hover:underline">Resolve</button>
                            <button onClick={() => actOnViolation(v.id, 'wont-fix')} className="text-xs text-neutral-500 hover:underline">Won't fix</button>
                          </>}
                        </div>
                      ))}
                  </div>
                )}

                {/* ── AUDIT LOG ── */}
                {complianceTab === 'audit' && (
                  <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Append-only audit log</h3>
                      <Button variant="secondary" onClick={exportComplianceAudit}>Export CSV</Button>
                    </div>
                    {complianceAudit.length === 0
                      ? <EmptyState icon={ScrollText} title="No audit entries yet" subtitle="Rule changes, violations, acknowledgements and resolutions are recorded here." />
                      : (
                        <table className="w-full text-sm">
                          <thead><tr className="text-left text-xs uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
                            <th className="py-1">When</th><th className="py-1">Event</th><th className="py-1">Subject</th><th className="py-1">Actor</th></tr></thead>
                          <tbody>
                            {complianceAudit.map((e, i) => (
                              <tr key={i} className="border-t border-neutral-100 dark:border-neutral-700">
                                <td className="py-1.5 text-neutral-600 dark:text-neutral-400 whitespace-nowrap">{e.occurred_at ? new Date(e.occurred_at).toLocaleString() : '—'}</td>
                                <td className="py-1.5 text-neutral-700 dark:text-neutral-200">{(e.event_type || '').replace(/^COMPLIANCE_/, '').replaceAll('_', ' ').toLowerCase()}</td>
                                <td className="py-1.5 font-mono text-xs text-neutral-600 dark:text-neutral-400">{e.aggregate_id}</td>
                                <td className="py-1.5 text-neutral-500">{e.actor_id}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                  </div>
                )}
              </div>

              {/* Rule builder (test-before-activate) */}
              {ruleBuilder && (
                <Modal title={ruleBuilder.id ? 'Edit rule' : 'New compliance rule'} onClose={() => setRuleBuilder(null)} size="xl" className="max-h-[90vh] overflow-y-auto">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-neutral-500 mb-1">Name</label>
                        <input className="input w-full" value={ruleBuilder.name} onChange={e => setRuleBuilder({ ...ruleBuilder, name: e.target.value })} placeholder="Stories need acceptance criteria before In Progress" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-500 mb-1">Description</label>
                        <input className="input w-full" value={ruleBuilder.description} onChange={e => setRuleBuilder({ ...ruleBuilder, description: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-500 mb-1">Scope (BQL) — which items the rule applies to</label>
                        <input className="input w-full font-mono text-sm" value={ruleBuilder.scopeBql} onChange={e => setRuleBuilder({ ...ruleBuilder, scopeBql: e.target.value })} placeholder="type = Story AND status = In Progress" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-500 mb-1">Assertion (BQL) — what scoped items must satisfy</label>
                        <input className="input w-full font-mono text-sm" value={ruleBuilder.assertionBql} onChange={e => setRuleBuilder({ ...ruleBuilder, assertionBql: e.target.value })} placeholder="acceptance_criteria != ''" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-neutral-500 mb-1">Severity</label>
                          <select className="input w-full" value={ruleBuilder.severity} onChange={e => setRuleBuilder({ ...ruleBuilder, severity: e.target.value })}>
                            {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'].map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-neutral-500 mb-1">Evaluation</label>
                          <select className="input w-full" value={ruleBuilder.evaluationMode} onChange={e => setRuleBuilder({ ...ruleBuilder, evaluationMode: e.target.value })}>
                            <option value="CONTINUOUS">Continuous</option>
                            <option value="SCHEDULED">Scheduled</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-500 mb-1">Notify</label>
                        <div className="flex gap-4 text-sm text-neutral-700 dark:text-neutral-200">
                          <label className="flex items-center gap-2"><input type="checkbox" checked={ruleBuilder.notifyOwner} onChange={e => setRuleBuilder({ ...ruleBuilder, notifyOwner: e.target.checked })} /> Item owner</label>
                          <label className="flex items-center gap-2"><input type="checkbox" checked={ruleBuilder.notifyAdmin} onChange={e => setRuleBuilder({ ...ruleBuilder, notifyAdmin: e.target.checked })} /> Project admins</label>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-500 mb-1">Escalate if unacknowledged after (hours) — optional</label>
                        <input type="number" min="0" className="input w-full" value={ruleBuilder.escalateAfterHours} onChange={e => setRuleBuilder({ ...ruleBuilder, escalateAfterHours: e.target.value })} placeholder="e.g. 24" />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-5">
                      <Button variant="secondary" onClick={() => setRuleBuilder(null)}>Cancel</Button>
                      <Button variant="action" onClick={saveRule}>{ruleBuilder.id ? 'Save rule' : 'Create rule (inactive)'}</Button>
                    </div>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-3">New rules are created inactive — test them, then activate from the rules list.</p>
                </Modal>
              )}
            </div>
          )}

          {view === 'service' && (
            <div className="flex flex-col h-full overflow-hidden">
              <div className="px-6 pt-5 border-b border-neutral-200 dark:border-neutral-700">
                <div className="mb-3">
                  <h1 className="text-2xl font-bold text-brand-navy dark:text-white">Service Desk</h1>
                  <p className="text-sm text-neutral-500">Customer requests, agent queues, SLAs and satisfaction — the external face of Works.</p>
                </div>
                <div className="flex gap-1">
                  {[
                    { key: 'queues', label: 'Queues', load: () => fetchServiceRequests(serviceQueue) },
                    { key: 'customers', label: 'Customers', load: () => fetchServiceCustomers() },
                    { key: 'types', label: 'Request types', load: () => fetchServiceTypes() },
                    { key: 'slas', label: 'SLA tiers', load: () => fetchServiceTiers() },
                    { key: 'csat', label: 'CSAT', load: () => fetchServiceCsat() },
                  ].map(t => (
                    <button key={t.key} onClick={() => { setServiceTab(t.key); t.load(); }}
                      className={`text-sm font-medium px-3 py-2 border-b-2 transition-colors ${serviceTab === t.key ? 'border-brand-navy text-brand-navy' : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-700'}`}>{t.label}</button>
                  ))}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                {serviceTab === 'queues' && (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      {['open', 'mine', 'unassigned', 'high'].map(q => (
                        <button key={q} onClick={() => { setServiceQueue(q); fetchServiceRequests(q); }}
                          className={`text-xs font-medium px-3 py-1.5 rounded-md border ${serviceQueue === q ? 'bg-brand-navy text-white border-brand-navy' : 'bg-white dark:bg-neutral-800 text-neutral-600 border-neutral-200 dark:border-neutral-700'}`}>
                          {q === 'open' ? 'All open' : q === 'mine' ? 'Mine' : q === 'unassigned' ? 'Unassigned' : 'High priority'}
                        </button>
                      ))}
                    </div>
                    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
                      {serviceRequests.length === 0
                        ? <EmptyState icon={Headset} title="Queue is clear" subtitle="No requests match this queue right now." />
                        : serviceRequests.map(({ request: r, sla }) => (
                          <div key={r.id} className="flex items-center gap-3 py-2.5 border-b border-neutral-100 dark:border-neutral-700 last:border-0">
                            <span className="text-xs font-bold px-2 py-0.5 rounded w-16 text-center bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-200">{r.priority}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{r.subject}</p>
                              <p className="text-xs text-neutral-600 dark:text-neutral-400 truncate">{r.typeKey} · {r.id}{r.assigneeId ? ` · ${r.assigneeId}` : ' · unassigned'}</p>
                            </div>
                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${sla.breached ? 'bg-semantic-danger text-white' : sla.state === 'AT_RISK' ? 'bg-semantic-warning text-white' : sla.state === 'NONE' ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-200' : 'bg-semantic-success text-white'}`}>{sla.state === 'NONE' ? 'No SLA' : sla.state}</span>
                            <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200">{(r.status || '').replace('_', ' ')}</span>
                            {can('work_service') && (
                              <>
                                {!r.assigneeId && <button onClick={() => assignServiceRequest(r.id)} className="text-xs text-brand-navy hover:underline">Pick up</button>}
                                {r.status !== 'RESOLVED' && r.status !== 'CLOSED' && <button onClick={() => transitionServiceRequest(r.id, 'RESOLVED')} className="text-xs text-semantic-success hover:underline">Resolve</button>}
                                {r.status === 'RESOLVED' && <button onClick={() => transitionServiceRequest(r.id, 'CLOSED')} className="text-xs text-neutral-500 hover:underline">Close</button>}
                              </>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {serviceTab === 'customers' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Customer accounts ({serviceCustomers.length})</h3>
                      {can('manage_service') && <Button variant="action" onClick={() => setNewCustomer({ name: '', tier: 'SILVER', primaryColor: '', subdomain: '' })}>New customer</Button>}
                    </div>
                    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
                      {serviceCustomers.length === 0
                        ? <EmptyState icon={Building2} title="No customers yet" subtitle="Add a customer organization to start serving them through the portal." />
                        : serviceCustomers.map(c => (
                          <div key={c.id} className="flex items-center gap-3 py-2.5 border-b border-neutral-100 dark:border-neutral-700 last:border-0">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{c.name}</p>
                              <p className="text-xs text-neutral-600 dark:text-neutral-400 truncate">{c.subdomain ? `${c.subdomain} · ` : ''}{c.id}</p>
                            </div>
                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-brand-navy text-white">{c.tier}</span>
                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${c.active ? 'bg-semantic-success text-white' : 'bg-neutral-200 text-neutral-600'}`}>{c.active ? 'ACTIVE' : 'INACTIVE'}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {serviceTab === 'types' && (
                  <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
                    {serviceTypes.length === 0
                      ? <EmptyState icon={Archive} title="No request types" subtitle="Incident, Change and Service types power the portal forms." />
                      : serviceTypes.map(t => (
                        <div key={t.id} className="flex items-center gap-3 py-2.5 border-b border-neutral-100 dark:border-neutral-700 last:border-0">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{t.name}</p>
                            <p className="text-xs text-neutral-600 dark:text-neutral-400 truncate">{t.typeKey} · default {t.defaultPriority}</p>
                          </div>
                          {t.isSystem && <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-200">SYSTEM</span>}
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${t.active ? 'bg-semantic-success text-white' : 'bg-neutral-200 text-neutral-600'}`}>{t.active ? 'ACTIVE' : 'INACTIVE'}</span>
                        </div>
                      ))}
                  </div>
                )}

                {serviceTab === 'slas' && (
                  <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
                    {serviceTiers.length === 0
                      ? <EmptyState icon={Timer} title="No SLA tiers" subtitle="Define response and resolution targets per customer tier." />
                      : serviceTiers.map(t => (
                        <div key={t.id} className="flex items-center gap-3 py-2.5 border-b border-neutral-100 dark:border-neutral-700 last:border-0">
                          <span className="text-xs font-bold px-2 py-0.5 rounded w-20 text-center bg-brand-navy text-white">{t.tier}</span>
                          <div className="flex-1 text-sm text-neutral-700 dark:text-neutral-200">
                            Respond in {t.responseMinutes}m · Resolve in {t.resolutionMinutes}m
                          </div>
                        </div>
                      ))}
                  </div>
                )}

                {serviceTab === 'csat' && (
                  <div className="space-y-4">
                    {!serviceCsat ? <EmptyState icon={Star} title="No CSAT yet" subtitle="Ratings appear here once customers rate resolved requests." />
                      : (
                        <>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {[
                              { label: 'Responses', value: serviceCsat.summary?.count ?? 0 },
                              { label: 'Average', value: serviceCsat.summary?.average ?? 0 },
                              { label: '% Satisfied', value: `${serviceCsat.summary?.percentSatisfied ?? 0}%` },
                            ].map(c => (
                              <div key={c.label} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
                                <p className="text-xs uppercase tracking-wide text-neutral-600 dark:text-neutral-400 font-semibold">{c.label}</p>
                                <p className="text-3xl font-bold mt-1 text-brand-navy">{c.value}</p>
                              </div>
                            ))}
                          </div>
                          <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
                            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-3">Recent feedback</h3>
                            {(serviceCsat.responses || []).length === 0
                              ? <p className="text-sm text-neutral-500">No comments yet.</p>
                              : serviceCsat.responses.slice(0, 10).map(r => (
                                <div key={r.id} className="flex items-center gap-3 py-2 border-b border-neutral-100 dark:border-neutral-700 last:border-0">
                                  <span className="text-brand-orange text-sm inline-flex items-center" aria-label={`Rated ${r.rating} of 5`}>{Array.from({ length: 5 }).map((_, si) => <Star key={si} className={`h-3.5 w-3.5 ${si < r.rating ? 'fill-current' : ''}`} aria-hidden="true" />)}</span>
                                  <span className="flex-1 text-sm text-neutral-700 dark:text-neutral-200 truncate">{r.comment || '—'}</span>
                                </div>
                              ))}
                          </div>
                        </>
                      )}
                  </div>
                )}
              </div>

              {newCustomer && (
                <Modal title="New customer" onClose={() => setNewCustomer(null)} size="lg">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-neutral-500 mb-1">Name</label>
                        <input className="input w-full" value={newCustomer.name} onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-neutral-500 mb-1">Tier</label>
                          <select className="input w-full" value={newCustomer.tier} onChange={e => setNewCustomer({ ...newCustomer, tier: e.target.value })}>
                            {['PLATINUM', 'GOLD', 'SILVER'].map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-neutral-500 mb-1">Subdomain</label>
                          <input className="input w-full" value={newCustomer.subdomain} onChange={e => setNewCustomer({ ...newCustomer, subdomain: e.target.value })} />
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-5">
                      <Button variant="secondary" onClick={() => setNewCustomer(null)}>Cancel</Button>
                      <Button variant="action" onClick={createServiceCustomer}>Create customer</Button>
                    </div>
                </Modal>
              )}
            </div>
          )}

        </div>
      </main>

      {/* DETAIL PANEL */}
      {selectedItem && (
        <div className="w-[500px] bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-700 flex flex-col h-screen overflow-hidden flex-shrink-0">
          <div className="h-14 flex items-center justify-between px-5 border-b border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center gap-2">
              <TypeBadge type={selectedItem.type} compact />
              <span className="font-mono text-xs text-neutral-600 dark:text-neutral-400">{selectedItem.id}</span>
            </div>
            <div className="flex gap-1">
              <button onClick={() => toggleStar(selectedItem)}
                title={selectedItem.starred ? 'Unstar' : 'Star this item'}
                className={`text-sm px-2 py-1 rounded transition-colors ${selectedItem.starred ? 'text-brand-orange' : 'text-neutral-300 hover:text-brand-orange'}`}>
                <Star className={`h-4 w-4 ${selectedItem.starred ? 'fill-current text-brand-orange' : ''}`} aria-hidden="true" />
              </button>
              <button onClick={() => setIsWorklogOpen(true)} className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-brand-navy transition-colors px-2 py-1 rounded border border-neutral-200 dark:border-neutral-600">⏱ Log Work</button>
              {can('delete_items') && (
                <button onClick={() => handleDelete(selectedItem.id)}
                  className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-semantic-danger px-2 py-1 rounded hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">Delete</button>
              )}
              <button onClick={() => setSelectedItem(null)}
                className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 p-1 rounded hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors" aria-label="Close detail panel"><X className="h-4 w-4" aria-hidden="true" /></button>
            </div>
          </div>
          {/* Detail panel tabs */}
          <div className="flex border-b border-neutral-200 dark:border-neutral-700 px-5">
            {[
              { key: 'details',      label: 'Details' },
              { key: 'custom-fields', label: 'Custom Fields' },
              { key: 'comments',     label: `Comments ${comments.length > 0 ? `(${comments.length})` : ''}` },
              { key: 'links',        label: `Links ${links.length > 0 ? `(${links.length})` : ''}` },
              { key: 'attachments',  label: `Files ${attachments.length > 0 ? `(${attachments.length})` : ''}` },
              { key: 'activity',     label: 'Activity' },
            ].map(t => (
              <button key={t.key} onClick={() => setDetailTab(t.key)}
                className={`text-xs font-medium px-3 py-2.5 border-b-2 transition-colors whitespace-nowrap ${detailTab === t.key ? 'border-brand-navy text-brand-navy' : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5 dark:bg-neutral-900">
            {/* DETAILS TAB */}
            {detailTab === 'details' && <>
            <input className="w-full text-lg font-bold text-neutral-900 dark:text-neutral-100 focus:outline-none border-b border-transparent focus:border-neutral-200 dark:focus:border-neutral-600 pb-1 bg-transparent"
              value={selectedItem.title}
              onChange={e => setSelectedItem({ ...selectedItem, title: e.target.value })}
              onBlur={() => handleUpdateItem(selectedItem)} />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1 font-medium">Status</label>
                <select value={selectedItem.status}
                  onChange={e => { const u = { ...selectedItem, status: e.target.value }; setSelectedItem(u); handleUpdateItem(u); }}
                  className="input">
                  <option>Todo</option><option>In Progress</option><option>Done</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1 font-medium">Type</label>
                <select value={selectedItem.type}
                  onChange={e => { const u = { ...selectedItem, type: e.target.value }; setSelectedItem(u); handleUpdateItem(u); }}
                  className="input">
                  {Object.keys(TYPES).map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1 font-medium">Priority</label>
                <select value={selectedItem.priority || 'MEDIUM'}
                  onChange={e => { const u = { ...selectedItem, priority: e.target.value }; setSelectedItem(u); handleUpdateItem(u); }}
                  className="input">
                  {['CRITICAL','HIGH','MEDIUM','LOW'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1 font-medium">Assignee</label>
                <select value={selectedItem.assigneeId || ''}
                  onChange={e => { const u = { ...selectedItem, assigneeId: e.target.value || null }; setSelectedItem(u); handleUpdateItem(u); }}
                  className="input">
                  <option value="">Unassigned</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1 font-medium">Due Date</label>
                <input type="date" value={selectedItem.dueDate || ''}
                  onChange={e => { const u = { ...selectedItem, dueDate: e.target.value || null }; setSelectedItem(u); handleUpdateItem(u); }}
                  className="input" />
              </div>
              <div>
                <label className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1 font-medium">Story Points</label>
                <input type="number" min={0} max={100} value={selectedItem.storyPoints || 0}
                  onChange={e => { const u = { ...selectedItem, storyPoints: parseInt(e.target.value) || 0 }; setSelectedItem(u); handleUpdateItem(u); }}
                  className="input" />
              </div>
            </div>

            {/* Parent item selector */}
            <div>
              <label className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1 font-medium">Parent Item</label>
              <select value={selectedItem.parentId || ''}
                onChange={e => { const u = { ...selectedItem, parentId: e.target.value || null }; setSelectedItem(u); handleUpdateItem(u); }}
                className="input">
                <option value="">No parent</option>
                {workItems.filter(i => i.id !== selectedItem.id && (i.type === 'Epic' || i.type === 'Story')).map(i => (
                  <option key={i.id} value={i.id}>{i.id} — {i.title}</option>
                ))}
              </select>
              {selectedItem.parentId && (() => {
                const parent = workItems.find(i => i.id === selectedItem.parentId);
                return parent ? (
                  <div className="mt-1.5 flex items-center gap-2 text-xs text-brand-navy cursor-pointer hover:underline"
                    onClick={() => setSelectedItem(parent)}>
                    <span aria-hidden="true"><ArrowUp className="inline-block h-3.5 w-3.5 align-text-bottom" /></span><TypeBadge type={parent.type} compact /><span>{parent.title}</span>
                  </div>
                ) : null;
              })()}
            </div>

            {/* Children items */}
            {itemChildren.length > 0 && (
              <div>
                <label className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1 font-medium">Sub-items ({itemChildren.length})</label>
                <div className="space-y-1">
                  {itemChildren.map(child => (
                    <div key={child.id} onClick={() => setSelectedItem(child)} role="button" tabIndex={0} onKeyDown={onPressKey}
                      className="flex items-center gap-2 p-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg border border-neutral-100 dark:border-neutral-700 cursor-pointer hover:border-brand-navy/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-navy-tint/40">
                      <span className="text-neutral-300"><CornerDownRight className="h-3.5 w-3.5" aria-hidden="true" /></span>
                      <TypeBadge type={child.type} compact />
                      <span className="font-mono text-xs text-neutral-600 dark:text-neutral-400">{child.id}</span>
                      <span className="flex-1 text-xs text-neutral-900 truncate">{child.title}</span>
                      <StatusBadge category={statusToCategory(child.status)}>{child.status}</StatusBadge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1 font-medium">Tags</label>
              <input type="text" value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onBlur={() => {
                  const tags = tagInput.split(',').map(t => t.trim()).filter(Boolean);
                  const updated = { ...selectedItem, tags };
                  setSelectedItem(updated);
                  handleUpdateItem(updated);
                }}
                placeholder="frontend, urgent, api"
                className="input" />
            </div>

            <div>
              <label className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1 font-medium">Description</label>
              <RichTextEditor
                value={selectedItem.description || ''}
                onChange={val => setSelectedItem({ ...selectedItem, description: val })}
                onBlur={() => handleUpdateItem(selectedItem)}
                placeholder="Add a description... (supports **bold**, *italic*, `code`, - bullets)"
              />
            </div>

            <div>
              <AcceptanceCriteria
                value={selectedItem.acceptanceCriteria || ''}
                onSave={val => { const u = { ...selectedItem, acceptanceCriteria: val }; setSelectedItem(u); handleUpdateItem(u); }}
              />
            </div>

            </> /* end details tab */}

            {/* CUSTOM FIELDS TAB */}
            {detailTab === 'custom-fields' && (
              <div>
                {fieldDefs.length === 0 ? (
                  <EmptyState icon={ClipboardList} title="No custom fields defined" subtitle="Go to Workflows & Fields settings to define custom fields for your work items." />
                ) : (
                  <div className="space-y-3">
                    <label className="block text-xs text-neutral-600 dark:text-neutral-400 mb-2 font-medium uppercase tracking-wider">Custom Fields</label>
                    {fieldDefs.map(fd => (
                      <div key={fd.id} className="flex items-center gap-2">
                        <label className="text-xs text-neutral-500 w-32 flex-shrink-0">{fd.name}{fd.required && <span className="text-semantic-danger ml-0.5">*</span>}</label>
                        {(fd.fieldType === 'TEXT' || fd.fieldType === 'EMAIL' || fd.fieldType === 'URL' || fd.fieldType === 'PHONE') && (
                          <input type={fd.fieldType === 'EMAIL' ? 'email' : fd.fieldType === 'URL' ? 'url' : 'text'}
                            className="input flex-1 text-sm py-1"
                            value={fieldValues[fd.id] || ''}
                            onChange={e => setFieldValues(v => ({ ...v, [fd.id]: e.target.value }))}
                            onBlur={e => saveFieldValue(selectedItem.id, fd.id, e.target.value)}
                            placeholder={fd.description || fd.name} />
                        )}
                        {fd.fieldType === 'TEXTAREA' && (
                          <textarea rows={2} className="input flex-1 text-sm resize-none"
                            value={fieldValues[fd.id] || ''}
                            onChange={e => setFieldValues(v => ({ ...v, [fd.id]: e.target.value }))}
                            onBlur={e => saveFieldValue(selectedItem.id, fd.id, e.target.value)}
                            placeholder={fd.description || fd.name} />
                        )}
                        {fd.fieldType === 'NUMBER' && (
                          <input type="number" className="input flex-1 text-sm py-1"
                            value={fieldValues[fd.id] || ''}
                            onChange={e => setFieldValues(v => ({ ...v, [fd.id]: e.target.value }))}
                            onBlur={e => saveFieldValue(selectedItem.id, fd.id, e.target.value)} />
                        )}
                        {fd.fieldType === 'DATE' && (
                          <input type="date" className="input flex-1 text-sm py-1"
                            value={fieldValues[fd.id] || ''}
                            onChange={e => { setFieldValues(v => ({ ...v, [fd.id]: e.target.value })); saveFieldValue(selectedItem.id, fd.id, e.target.value); }} />
                        )}
                        {fd.fieldType === 'CHECKBOX' && (
                          <input type="checkbox" className="w-4 h-4 accent-brand-navy"
                            checked={fieldValues[fd.id] === 'true' || fieldValues[fd.id] === true}
                            onChange={e => { const v = String(e.target.checked); setFieldValues(fv => ({ ...fv, [fd.id]: v })); saveFieldValue(selectedItem.id, fd.id, v); }} />
                        )}
                        {fd.fieldType === 'SELECT' && (
                          <select className="input flex-1 text-sm py-1"
                            value={fieldValues[fd.id] || ''}
                            onChange={e => { setFieldValues(v => ({ ...v, [fd.id]: e.target.value })); saveFieldValue(selectedItem.id, fd.id, e.target.value); }}>
                            <option value="">— Select —</option>
                            {(fd.options || fd.config?.options || []).map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        )}
                        {fd.fieldType === 'USER' && (
                          <select className="input flex-1 text-sm py-1"
                            value={fieldValues[fd.id] || ''}
                            onChange={e => { setFieldValues(v => ({ ...v, [fd.id]: e.target.value })); saveFieldValue(selectedItem.id, fd.id, e.target.value); }}>
                            <option value="">— Select user —</option>
                            {users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                          </select>
                        )}
                        {fd.fieldType === 'RATING' && (
                          <div className="flex gap-1">
                            {[1,2,3,4,5].map(n => (
                              <button key={n} onClick={() => { setFieldValues(v => ({ ...v, [fd.id]: String(n) })); saveFieldValue(selectedItem.id, fd.id, String(n)); }}
                                className={`w-6 h-6 rounded text-xs font-bold transition-colors ${Number(fieldValues[fd.id]) >= n ? 'bg-brand-amber text-white' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400'}`}>
                                {n}
                              </button>
                            ))}
                          </div>
                        )}
                        {fd.fieldType === 'PROGRESS' && (
                          <div className="flex items-center gap-2 flex-1">
                            <input type="range" min={0} max={100} className="flex-1"
                              value={fieldValues[fd.id] || 0}
                              onChange={e => setFieldValues(v => ({ ...v, [fd.id]: e.target.value }))}
                              onMouseUp={e => saveFieldValue(selectedItem.id, fd.id, e.target.value)} />
                            <span className="text-xs text-neutral-500 w-8">{fieldValues[fd.id] || 0}%</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* COMMENTS TAB */}
            {detailTab === 'comments' && (
              <div>
                {comments.length === 0 && (
                  <p className="text-xs text-neutral-600 text-center py-6">No comments yet. Be the first to comment.</p>
                )}
                <div className="space-y-3 mb-4">
                  {comments.map(c => (
                    <div key={c.id}>
                      {/* Top-level comment */}
                      <div className="flex gap-2.5">
                        <Avatar name={c.authorName || '?'} size={7} />
                        <div className={`flex-1 rounded-xl px-3 py-2.5 border ${c.isInternal ? 'bg-semantic-warning-surface border-semantic-warning/30' : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-100 dark:border-neutral-700'}`}>
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-xs font-semibold text-neutral-900">{c.authorName}</p>
                            {c.isInternal && <span className="text-xs bg-semantic-warning text-white px-1.5 py-0.5 rounded">Internal</span>}
                            <span className="text-xs text-neutral-600 dark:text-neutral-400 ml-auto">{c.createdAt ? new Date(c.createdAt).toLocaleString() : ''}</span>
                          </div>
                          <p className="text-sm text-neutral-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: renderMd(c.body) }} />
                          <button onClick={() => setReplyingTo(replyingTo === c.id ? null : c.id)}
                            className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-brand-navy mt-1.5 transition-colors">
                            <Reply className="inline-block h-3.5 w-3.5 mr-1 align-text-bottom" aria-hidden="true" />Reply {c.replies?.length > 0 && `(${c.replies.length})`}
                          </button>
                        </div>
                      </div>
                      {/* Threaded replies */}
                      {c.replies?.length > 0 && (
                        <div className="ml-9 mt-1.5 space-y-1.5 border-l-2 border-neutral-100 pl-3">
                          {c.replies.map(r => (
                            <div key={r.id} className="flex gap-2">
                              <Avatar name={r.authorName || '?'} size={6} />
                              <div className="flex-1 bg-white dark:bg-neutral-800 rounded-lg px-3 py-2 border border-neutral-100 dark:border-neutral-700">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <p className="text-xs font-semibold text-neutral-900">{r.authorName}</p>
                                  <span className="text-xs text-neutral-600 dark:text-neutral-400 ml-auto">{r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}</span>
                                </div>
                                <p className="text-xs text-neutral-700" dangerouslySetInnerHTML={{ __html: renderMd(r.body) }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Reply composer */}
                      {replyingTo === c.id && (
                        <div className="ml-9 mt-1.5 flex gap-2">
                          <Avatar name={currentUser.fullName} size={6} />
                          <div className="flex-1">
                            <textarea rows={2} value={replyBody} onChange={e => setReplyBody(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), addReply(selectedItem.id, c.id))}
                              placeholder="Write a reply... (Enter to send)"
                              className="w-full border border-neutral-200 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-brand-navy resize-none" />
                            <div className="flex gap-2 mt-1">
                              <Button size="sm" onClick={() => addReply(selectedItem.id, c.id)}>Reply</Button>
                              <button onClick={() => { setReplyingTo(null); setReplyBody(''); }} className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-700">Cancel</button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {/* Comment composer with @mention + internal flag */}
                <div className="relative">
                  <div className="flex gap-2.5">
                    <Avatar name={currentUser.fullName} size={7} />
                    <div className="flex-1">
                      <textarea rows={2} value={newComment} onChange={handleCommentInput}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleAddComment())}
                        placeholder="Write a comment... (@mention to notify, Enter to send)"
                        className="w-full border border-neutral-200 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-navy resize-none" />
                      <div className="flex items-center justify-between mt-1.5">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={commentInternal} onChange={e => setCommentInternal(e.target.checked)}
                            className="w-3 h-3 rounded accent-semantic-warning" />
                          <span className="text-xs text-neutral-600 dark:text-neutral-400">Internal only</span>
                        </label>
                        <Button size="sm" onClick={handleAddComment}>Send</Button>
                      </div>
                    </div>
                  </div>
                  {/* @mention dropdown */}
                  {mentionOpen && (
                    <div className="absolute bottom-full mb-1 left-9 w-56 bg-white dark:bg-neutral-800 rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-700 z-50 max-h-40 overflow-y-auto">
                      {users.filter(u => !mentionQuery || u.fullName.toLowerCase().includes(mentionQuery)).map(u => (
                        <button key={u.id} onClick={() => insertMention(u)}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-left">
                          <Avatar name={u.fullName} size={6} />
                          <span className="text-sm text-neutral-900">{u.fullName}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* LINKS TAB */}
            {detailTab === 'links' && (
              <div>
                {/* Visual Link Graph */}
                {links.length > 0 && (
                  <div className="mb-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl p-4 border border-neutral-100 dark:border-neutral-700">
                    <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-3">Link Graph</p>
                    <div className="flex flex-col items-center gap-2">
                      {/* Current item — center node */}
                      <div className="bg-brand-navy text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm max-w-full truncate">
                        {selectedItem.id}
                      </div>
                      {/* Link lines to related items */}
                      <div className="w-full space-y-1.5">
                        {links.map(l => {
                          const LINK_COLORS = {
                            BLOCKS: 'border-semantic-danger bg-semantic-danger-surface text-semantic-danger',
                            BLOCKED_BY: 'border-semantic-danger bg-semantic-danger-surface text-semantic-danger',
                            RELATES_TO: 'border-brand-navy-tint bg-brand-navy/5 text-brand-navy',
                            DUPLICATES: 'border-semantic-warning bg-semantic-warning-surface text-semantic-warning',
                            PARENT: 'border-neutral-300 bg-neutral-100 text-neutral-700',
                            CHILD: 'border-semantic-success bg-semantic-success/10 text-semantic-success',
                          };
                          const colorClass = LINK_COLORS[l.linkType] || LINK_COLORS.RELATES_TO;
                          return (
                            <div key={l.id} className="flex items-center gap-2">
                              <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-700"></div>
                              <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${colorClass} flex-shrink-0`}>
                                {l.linkType?.replace('_', ' ')}
                              </span>
                              <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-700"></div>
                              <div className={`text-xs font-semibold px-2 py-1 rounded-lg border ${colorClass} cursor-pointer hover:opacity-80 truncate max-w-32`}
                                onClick={() => { const t = workItems.find(i => i.id === l.targetId); if (t) setSelectedItem(t); }}
                                title={l.targetTitle || l.targetId}>
                                {l.targetId}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {links.length === 0 && <p className="text-xs text-neutral-600 text-center py-4">No links yet.</p>}
                <div className="space-y-2 mb-4">
                  {links.map(l => (
                    <div key={l.id} className="flex items-center gap-3 p-2.5 bg-neutral-50 dark:bg-neutral-800 rounded-lg border border-neutral-100 dark:border-neutral-700">
                      <span className="text-xs font-semibold bg-neutral-200 text-neutral-600 px-1.5 py-0.5 rounded uppercase">{l.linkType?.replace('_', ' ')}</span>
                      <span className="flex-1 text-sm text-neutral-900 font-mono">{l.targetId}</span>
                      {l.targetTitle && <span className="text-xs text-neutral-600 dark:text-neutral-400 truncate max-w-24">{l.targetTitle}</span>}
                      <button onClick={() => handleDeleteLink(l.id)} className="text-neutral-300 hover:text-semantic-danger text-xs" aria-label="Remove link"><X className="h-3.5 w-3.5" aria-hidden="true" /></button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <select value={newLink.linkType} onChange={e => setNewLink(p => ({ ...p, linkType: e.target.value }))} className="input w-36">
                    {['BLOCKS','BLOCKED_BY','RELATES_TO','DUPLICATES','PARENT','CHILD'].map(t => <option key={t} value={t}>{t.replace('_',' ')}</option>)}
                  </select>
                  <select value={newLink.targetId} onChange={e => setNewLink(p => ({ ...p, targetId: e.target.value }))} className="input flex-1">
                    <option value="">Select item...</option>
                    {workItems.filter(i => i.id !== selectedItem.id).map(i => (
                      <option key={i.id} value={i.id}>{i.id} — {i.title}</option>
                    ))}
                  </select>
                  <Button size="sm" onClick={handleAddLink}>Link</Button>
                </div>
              </div>
            )}

            {/* ATTACHMENTS TAB */}
            {detailTab === 'attachments' && (
              <div>
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleUploadFile} />
                <div className="flex items-center gap-3 mb-4">
                  <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="inline-block h-4 w-4 mr-1 align-text-bottom" aria-hidden="true" />Upload file
                  </Button>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-600 dark:text-neutral-400">Max {MAX_UPLOAD_MB} MB per file</span>
                    <span className="text-xs bg-semantic-success-surface text-semantic-success px-1.5 py-0.5 rounded flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />Virus scan active
                    </span>
                  </div>
                </div>
                {attachments.length === 0 && <p className="text-xs text-neutral-600 text-center py-4">No files attached yet.</p>}
                <div className="space-y-2">
                  {attachments.map(a => {
                    const mime = a.mime_type || a.mimeType || '';
                    const isImage = mime.startsWith('image/');
                    const fileName = a.file_name || a.fileName || '?';
                    const previewUrl = `${API}/work-items/${selectedItem.id}/attachments/${a.id}/content`;
                    const ext = fileName.split('.').pop().toUpperCase().slice(0, 3);
                    return (
                      <div key={a.id} className="bg-neutral-50 dark:bg-neutral-800 rounded-lg border border-neutral-100 dark:border-neutral-700 overflow-hidden">
                        {isImage && (
                          <div className="border-b border-neutral-100 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center p-2 max-h-48 overflow-hidden">
                            <img src={previewUrl} alt={fileName}
                              className="max-h-44 max-w-full object-contain rounded"
                              onError={e => { e.target.style.display = 'none'; }} />
                          </div>
                        )}
                        <div className="flex items-center gap-3 p-3">
                          <div className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold flex-shrink-0 ${isImage ? 'bg-brand-navy/10 text-brand-navy' : 'bg-neutral-200 text-neutral-600'}`}>
                            {isImage ? <ImageIcon className="h-4 w-4" aria-hidden="true" /> : ext}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-neutral-900 truncate">{fileName}</p>
                            <p className="text-xs text-neutral-600 dark:text-neutral-400">{a.uploaded_by_name || a.uploadedByName || 'You'} · {a.file_size ? `${Math.round(a.file_size / 1024)}KB` : ''}</p>
                          </div>
                          <a href={previewUrl} target="_blank" rel="noreferrer"
                            className="text-xs text-brand-navy hover:underline flex-shrink-0 mr-2">View</a>
                          <button onClick={() => handleDeleteAttachment(a.id)} className="text-neutral-300 hover:text-semantic-danger text-xs flex-shrink-0" aria-label="Remove attachment"><X className="h-3.5 w-3.5" aria-hidden="true" /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ACTIVITY TAB */}
            {detailTab === 'activity' && (
              <div>
                {/* Iteration 7 (Cap B) — auto time-in-status, projected from the event log */}
                {statusDurations.length > 0 && (
                  <div className="mb-4 rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800">
                    <WorkItemStatusTimeline durations={statusDurations} />
                  </div>
                )}
                {/* Event type filter */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  {['', 'WORK_ITEM_CREATED', 'WORK_ITEM_UPDATED', 'STATUS_CHANGED', 'ASSIGNED', 'COMMENT_ADDED', 'LINKED', 'ATTACHED'].map(et => (
                    <button key={et} onClick={() => {
                      setActivityEventFilter(et);
                      const url = `/work-items/${selectedItem.id}/activity${et ? `?eventType=${et}` : ''}`;
                      api.raw(url).then(r => r.json()).then(d => setActivity(Array.isArray(d) ? d : [])).catch(reportError);
                    }}
                      className={`text-xs px-2 py-1 rounded-full font-medium transition-colors ${activityEventFilter === et ? 'bg-brand-navy text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}>
                      {et ? et.replace(/_/g, ' ') : 'All'}
                    </button>
                  ))}
                </div>
                {activity.length === 0 && <p className="text-xs text-neutral-600 text-center py-4">No activity recorded yet.</p>}
                <div className="space-y-3">
                  {activity.map(a => (
                    <div key={a.id} className="flex gap-2.5">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                        a.event_type === 'WORK_ITEM_CREATED' ? 'bg-semantic-success' :
                        a.event_type === 'STATUS_CHANGED' ? 'bg-brand-navy-tint' :
                        a.event_type === 'COMMENT_ADDED' ? 'bg-brand-orange' :
                        'bg-neutral-300'
                      }`}></div>
                      <div className="flex-1">
                        <p className="text-xs text-neutral-700">
                          <span className="font-semibold">{a.actor_name || 'System'}</span>
                          {' '}{formatEventType(a.event_type)}
                        </p>
                        {/* Field diff display */}
                        {a.field_name && a.old_value !== null && a.new_value !== null && (
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="text-xs text-neutral-600 dark:text-neutral-400 font-medium capitalize">{String(a.field_name).replace(/_/g,' ')}:</span>
                            {a.old_value && <span className="text-xs bg-semantic-danger-surface text-semantic-danger px-1.5 py-0.5 rounded line-through">{a.old_value}</span>}
                            <span className="text-xs text-neutral-600 dark:text-neutral-400"><ArrowRight className="inline-block h-3.5 w-3.5 align-text-bottom" aria-hidden="true" /></span>
                            {a.new_value && <span className="text-xs bg-semantic-success-surface text-semantic-success px-1.5 py-0.5 rounded">{a.new_value}</span>}
                          </div>
                        )}
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">{a.occurred_at ? new Date(a.occurred_at).toLocaleString() : ''}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE KNOWLEDGE SPACE MODAL */}
      {isSpaceFormOpen && (
        <Modal title="New Knowledge Space" onClose={() => setIsSpaceFormOpen(false)}>
          <div className="space-y-3">
            <Field label="Space Name *">
              <input type="text" className="input" placeholder="e.g. Engineering, Support, Onboarding" value={spaceForm.name}
                onChange={e => setSpaceForm(f => ({ ...f, name: e.target.value }))} autoFocus />
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
                onChange={e => setArticleForm(f => ({ ...f, title: e.target.value }))} autoFocus />
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
              <input type="text" className="input" placeholder="e.g. Q2 Feature Release" value={newRelease.name} onChange={e => setNewRelease(r => ({ ...r, name: e.target.value }))} autoFocus />
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
              <input type="number" className="input" min={1} value={worklogForm.timeSpentMinutes} onChange={e => setWorklogForm(f => ({ ...f, timeSpentMinutes: parseInt(e.target.value) || 0 }))} autoFocus />
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

      {/* COMMAND PALETTE (Cmd/Ctrl-K) */}
      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} commands={paletteCommands} />}

      {/* TOAST NOTIFICATION — accessible live region (components/works/atoms/toast.jsx) */}
      <Toast toast={toast} canUndo={Boolean(deleteUndoItem)} onUndo={handleUndoDelete} />

      {/* CREATE SPRINT MODAL */}
      {isSprintOpen && (
        <Modal title="New Sprint" onClose={() => setIsSprintOpen(false)}>
          <div className="space-y-3">
            <Field label="Sprint Name *">
              <input type="text" value={newSprint.name} onChange={e => setNewSprint({ ...newSprint, name: e.target.value })}
                className="input" placeholder="e.g. Sprint 1" autoFocus />
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

      {/* CREATE WORK ITEM MODAL */}
      {isCreateOpen && (
        <Modal title="New Work Item" onClose={() => { setIsCreateOpen(false); setCreateError(''); }}>
          {createError && <div className="text-semantic-danger bg-semantic-danger-surface p-2 text-sm rounded mb-3">{createError}</div>}
          <div className="space-y-3">
            <Field label="Title *">
              <input type="text" value={newItem.title} onChange={e => setNewItem({ ...newItem, title: e.target.value })}
                className="input" placeholder="What needs to be done?" autoFocus />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type">
                <select value={newItem.type} onChange={e => setNewItem({ ...newItem, type: e.target.value })} className="input">
                  {Object.keys(TYPES).map(t => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Priority">
                <select value={newItem.priority} onChange={e => setNewItem({ ...newItem, priority: e.target.value })} className="input">
                  {['CRITICAL','HIGH','MEDIUM','LOW'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Assignee">
                <select value={newItem.assigneeId} onChange={e => setNewItem({ ...newItem, assigneeId: e.target.value })} className="input">
                  <option value="">Unassigned</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                </select>
              </Field>
              <Field label="Project">
                <select value={newItem.projectId} onChange={e => setNewItem({ ...newItem, projectId: e.target.value })} className="input">
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Parent Item (optional)">
              <select value={newItem.parentId} onChange={e => setNewItem({ ...newItem, parentId: e.target.value })} className="input">
                <option value="">No parent</option>
                {workItems.filter(i => i.type === 'Epic' || i.type === 'Story').map(i => (
                  <option key={i.id} value={i.id}>{i.id} — {i.title}</option>
                ))}
              </select>
            </Field>
            <Field label="Due Date">
              <input type="date" value={newItem.dueDate} onChange={e => setNewItem({ ...newItem, dueDate: e.target.value })} className="input" />
            </Field>
            <Field label="Tags (comma separated)">
              <input type="text" value={newItem.tags} onChange={e => setNewItem({ ...newItem, tags: e.target.value })}
                className="input" placeholder="frontend, urgent" />
            </Field>
            <Field label="Description">
              <textarea rows={3} value={newItem.description} onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                className="input resize-none" placeholder="Optional description... (supports **bold**, *italic*, - bullets)" />
            </Field>
          </div>
          <div className="flex justify-end gap-3 mt-5">
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button variant="action" onClick={handleCreate}>Create Item</Button>
          </div>
        </Modal>
      )}

      {/* CREATE PROJECT MODAL */}
      {isProjectOpen && (
        <Modal title="New Project" onClose={() => { setIsProjectOpen(false); setCreateError(''); }}>
          {createError && <div className="text-semantic-danger bg-semantic-danger-surface p-2 text-sm rounded mb-3">{createError}</div>}
          <div className="space-y-3">
            <Field label="Project Name *">
              <input type="text" value={newProject.name} onChange={e => setNewProject({ ...newProject, name: e.target.value })}
                className="input" placeholder="e.g. WEB Portal" autoFocus />
            </Field>
            <Field label="Key Prefix *">
              <input type="text" maxLength={5} value={newProject.keyPrefix}
                onChange={e => setNewProject({ ...newProject, keyPrefix: e.target.value.toUpperCase() })}
                className="input" placeholder="e.g. WEB" />
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">3–5 uppercase letters used as item prefix (e.g. WEB-1234)</p>
            </Field>
            <Field label="Description">
              <textarea rows={2} value={newProject.description} onChange={e => setNewProject({ ...newProject, description: e.target.value })}
                className="input resize-none" placeholder="What is this project about?" />
            </Field>
          </div>
          <div className="flex justify-end gap-3 mt-5">
            <Button variant="ghost" onClick={() => setIsProjectOpen(false)}>Cancel</Button>
            <Button variant="action" onClick={handleCreateProject}>Create Project</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Modal now lives in components/works/molecules/modal.jsx — accessible (role=dialog, aria-modal,
// focus trap, Escape, backdrop close, scroll lock, focus restoration). Imported at the top.

function renderMd(text) {
  if (!text) return '';
  // Article / comment / reply bodies are user-supplied, so the generated HTML is sanitised
  // (tight tag + attr allowlist) before any call site hands it to dangerouslySetInnerHTML.
  // RB-10 §8 / CLAUDE.md §17.3 — never inject unsanitised user content (closes stored XSS).
  const html = text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="prose-md-code">$1</code>')
    .replace(/^- (.+)$/gm, '• $1')
    .replace(/\n/g, '<br/>');
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['strong', 'em', 'code', 'br'],
    ALLOWED_ATTR: ['class'],
  });
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

// StatCard, RoleBadge, Field and the onPressKey keyboard helper now live in
// components/works/{stat-card,role-badge,field}.jsx and lib/utils.js (imported above).

// Iteration 6 — PNG/PDF/CSV export controls for a dashboard or report. PNG/PDF capture
// the element with id=targetId; CSV uses the supplied flat rows. Heavy libs are
// lazy-loaded inside the export helpers (CLAUDE.md §4.18).
function ExportButtons({ targetId, rows, filename, onError }) {
  const run = async (fn) => { try { await fn(); } catch { if (onError) onError(); } };
  const cls = 'text-xs px-1.5 py-0.5 rounded border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 transition-colors';
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs uppercase tracking-wide text-neutral-600 dark:text-neutral-400 mr-0.5">Export</span>
      <button type="button" className={cls} onClick={() => run(() => exportElementToPdf(document.getElementById(targetId), filename))}>PDF</button>
      <button type="button" className={cls} onClick={() => run(() => exportRowsToCsv(rows, filename))}>CSV</button>
      <button type="button" className={cls} onClick={() => run(() => exportElementToPng(document.getElementById(targetId), filename))}>PNG</button>
    </div>
  );
}

// Count work items grouped by one dimension (status/type/priority), sorted desc.
// Feeds the PIE and BAR dashboard widgets (iteration 6).
function aggregateByDimension(items, dimension) {
  const counts = {};
  (items || []).forEach(i => {
    const key = i[dimension] || 'None';
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

// Apply a report section's filter to the work-item set (mirrors the dashboard widget filter).
function filterReportItems(items, filter = {}) {
  return (items || []).filter(i => {
    if (filter.open && i.status === 'Done') return false;
    if (filter.status && i.status !== filter.status) return false;
    if (filter.priority && i.priority !== filter.priority) return false;
    if (filter.type && i.type !== filter.type) return false;
    return true;
  });
}

// Iteration 6 — edit controls for a report section's config (chart type/dimension,
// table limit, open-only filter). Shown only in edit mode.
function ReportSectionControls({ section, onChange }) {
  const config = section.config || {};
  const setConfig = (patch) => onChange({ ...section, config: { ...config, ...patch } });
  const setFilter = (patch) => setConfig({ filter: { ...(config.filter || {}), ...patch } });
  return (
    <div className="flex flex-wrap items-center gap-3 mb-3 p-2 rounded-md bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-700">
      {section.type === 'chart' && (
        <>
          <label className="text-xs text-neutral-600 dark:text-neutral-400 flex items-center gap-1">Chart
            <select value={config.chartType || 'bar'} onChange={e => setConfig({ chartType: e.target.value })}
              className="text-xs rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-1 py-0.5">
              <option value="bar">Bar</option>
              <option value="pie">Pie</option>
            </select>
          </label>
          <label className="text-xs text-neutral-600 dark:text-neutral-400 flex items-center gap-1">Group by
            <select value={config.dimension || 'status'} onChange={e => setConfig({ dimension: e.target.value })}
              className="text-xs rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-1 py-0.5">
              <option value="status">Status</option>
              <option value="type">Type</option>
              <option value="priority">Priority</option>
            </select>
          </label>
        </>
      )}
      {section.type === 'table' && (
        <label className="text-xs text-neutral-600 dark:text-neutral-400 flex items-center gap-1">Limit
          <input type="number" min="1" max="100" value={config.limit || 20}
            onChange={e => setConfig({ limit: Math.max(1, Math.min(100, Number(e.target.value) || 20)) })}
            className="w-16 text-xs rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-1 py-0.5" />
        </label>
      )}
      {section.type !== 'narrative' && (
        <label className="text-xs text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5">
          <input type="checkbox" checked={!!(config.filter && config.filter.open)}
            onChange={e => setFilter({ open: e.target.checked })} />
          Open items only
        </label>
      )}
    </div>
  );
}

// Iteration 6 — renders one section of a custom report from the live work-item set.
// type: kpi | chart | table | narrative. In edit mode it shows title + config controls.
function ReportSectionCard({ section, index, total, workItems, editMode, onChange, onMove, onRemove }) {
  const config = section.config || {};
  const items = filterReportItems(workItems, config.filter);

  return (
    <section className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        {editMode ? (
          <input value={section.title || ''} onChange={e => onChange({ ...section, title: e.target.value })}
            aria-label="Section title" placeholder="Section title"
            className="flex-1 text-sm font-semibold text-neutral-900 dark:text-white bg-transparent border-b border-neutral-200 dark:border-neutral-700 focus-visible:outline-none focus-visible:border-brand-navy" />
        ) : (
          <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wide">{section.title || section.type}</h3>
        )}
        {editMode && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={() => onMove(-1)} disabled={index === 0} aria-label="Move section up"
              className="text-xs px-1.5 py-0.5 rounded border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-brand-navy disabled:opacity-40 disabled:pointer-events-none"><ArrowUp className="h-3.5 w-3.5" aria-hidden="true" /></button>
            <button onClick={() => onMove(1)} disabled={index === total - 1} aria-label="Move section down"
              className="text-xs px-1.5 py-0.5 rounded border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-brand-navy disabled:opacity-40 disabled:pointer-events-none"><ArrowDown className="h-3.5 w-3.5" aria-hidden="true" /></button>
            <button onClick={onRemove} aria-label="Remove section" className="text-xs text-semantic-danger hover:underline ml-1">Remove</button>
          </div>
        )}
      </div>

      {editMode && <ReportSectionControls section={section} onChange={onChange} />}

      {section.type === 'kpi' && (
        <p className="text-3xl font-bold text-brand-navy dark:text-white">{items.length}</p>
      )}

      {section.type === 'chart' && (
        config.chartType === 'pie'
          ? <DonutChart data={aggregateByDimension(items, config.dimension || 'status')} />
          : <BarChart data={aggregateByDimension(items, config.dimension || 'status')} />
      )}

      {section.type === 'table' && (
        <div className="divide-y divide-neutral-100 dark:divide-neutral-700/50">
          {items.length === 0 && <p className="text-xs text-neutral-600 dark:text-neutral-600">No matching items.</p>}
          {items.slice(0, config.limit || 20).map(i => (
            <div key={i.id} className="flex items-center justify-between gap-2 py-1.5">
              <span className="min-w-0 flex-1 truncate text-sm text-neutral-800 dark:text-neutral-200">{i.title}</span>
              <span className="flex items-center gap-3 flex-shrink-0">
                <span className="text-xs text-neutral-600 dark:text-neutral-400">{i.priority || '—'}</span>
                <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">{i.status}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      {section.type === 'narrative' && (
        editMode
          ? <textarea value={config.text || ''} rows={3} placeholder="Write the narrative for this section…"
              onChange={e => onChange({ ...section, config: { ...config, text: e.target.value } })}
              className="w-full text-sm text-neutral-800 dark:text-neutral-200 bg-neutral-50 dark:bg-neutral-900 rounded-md border border-neutral-200 dark:border-neutral-700 p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40" />
          : (config.text
              ? <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">{config.text}</p>
              : <p className="text-sm text-neutral-600 dark:text-neutral-400">—</p>)
      )}
    </section>
  );
}

// Iteration 6 — public, read-only embed of a shared dashboard. Rendered before the auth
// gate from ?share=<token>; fetches the token-scoped public endpoint and renders the widgets
// from the server aggregate (no app shell, no auth, no drill).
function PublicDashboardEmbed({ token }) {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ok | error
  useEffect(() => {
    let alive = true;
    api.raw(`/public/dashboards/${encodeURIComponent(token)}`)
      .then(r => { if (!r.ok) throw new Error('not found'); return r.json(); })
      .then(d => { if (alive) { setData(d); setStatus('ok'); } })
      .catch(() => { if (alive) setStatus('error'); });
    return () => { alive = false; };
  }, [token]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 font-sans" aria-busy="true" aria-label="Loading dashboard">
        <header className="bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-7 w-7 rounded-md" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-5 w-20 rounded-full" />
        </header>
        <main className="p-6">
          <div className="grid grid-cols-12 gap-4 max-w-7xl mx-auto">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="col-span-12 sm:col-span-6 lg:col-span-4">
                <Skeleton className="h-40 w-full rounded-xl" />
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }
  if (status === 'error' || !data) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center font-sans p-6">
        <div className="text-center max-w-sm">
          <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Dashboard unavailable</p>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">This share link is invalid or has been revoked.</p>
        </div>
      </div>
    );
  }
  const widgets = data.widgets || [];
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 font-sans">
      <header className="bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Logo />
          <span className="text-sm font-semibold text-neutral-900 dark:text-white truncate">{data.name}</span>
        </div>
        <span className="text-xs uppercase tracking-wide text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-700 rounded-full px-2 py-0.5 flex-shrink-0">Read-only</span>
      </header>
      <main className="p-6">
        {widgets.length === 0 ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">This dashboard has no widgets.</p>
        ) : (
          <div className="grid grid-cols-12 gap-4 max-w-7xl mx-auto">
            {widgets.map(w => (
              <DashboardWidgetCard key={w.id} widget={w} workItems={[]} aggregate={data.aggregate} editMode={false} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// Iteration 6 — renders a single dashboard widget from the live work-item set.
// Widget data is computed client-side from the config (metric + filter) so the
// designer is fully functional without a per-widget query endpoint.
function DashboardWidgetCard({ widget, workItems, aggregate, editMode, onRemove, onResize, onConfigChange, onDrill, onDragStart, onDrop, sprints, velocity, currentUserId }) {
  let config = {};
  try { config = JSON.parse(widget.config || '{}'); } catch { config = {}; }
  const filter = config.filter || {};
  const items = filterWidgetItems(workItems, filter, { currentUserId });
  const isChart = widget.widgetType === 'PIE' || widget.widgetType === 'BAR';
  const dimension = config.dimension || 'status';
  // When a server scope aggregate is present (TEAM/ORG), it takes precedence over the
  // client-loaded items; its by-dimension series is already [{ label, value }].
  const aggKey = 'by' + dimension.charAt(0).toUpperCase() + dimension.slice(1);
  const chartData = aggregate ? (aggregate[aggKey] || []) : aggregateByDimension(items, dimension);
  const scorecardCount = aggregate ? (aggregate.total ?? 0) : items.length;
  const statusSeries = aggregate
    ? (aggregate.byStatus || [])
    : Object.entries(items.reduce((acc, i) => { const k = i.status || 'Unknown'; acc[k] = (acc[k] || 0) + 1; return acc; }, {}))
        .map(([label, value]) => ({ label, value }));
  const listItems = aggregate ? (aggregate.recent || []) : items;
  const span = Math.max(1, Math.min(widget.gridW || 4, 12));
  // Drill needs the underlying item set, which the aggregate doesn't carry — disable it then.
  const canDrill = !editMode && !!onDrill && !aggregate;
  const drillBy = (label) => items.filter(i => (i[dimension] || 'None') === label);

  return (
    <div
      style={{ gridColumn: `span ${span} / span ${span}` }}
      draggable={editMode}
      onDragStart={editMode ? onDragStart : undefined}
      onDragOver={editMode ? (e => e.preventDefault()) : undefined}
      onDrop={editMode ? onDrop : undefined}
      className={`bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 ${editMode ? 'cursor-move ring-1 ring-brand-navy/20' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wide truncate">{widget.title || widget.widgetType}</p>
        {editMode && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {[4, 6, 12].map(w => (
              <button key={w} onClick={() => onResize(w)} aria-label={`Set width ${w}`}
                className={`text-xs px-1.5 py-0.5 rounded border transition-colors ${span === w ? 'bg-brand-navy text-white border-brand-navy' : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-brand-navy'}`}>
                {w === 12 ? 'Full' : `${w}`}
              </button>
            ))}
            <button onClick={onRemove} aria-label="Remove widget" className="text-xs text-semantic-danger hover:underline ml-1">Remove</button>
          </div>
        )}
      </div>

      {editMode && isChart && (
        <div className="flex items-center gap-2 mb-2">
          <label htmlFor={`dim-${widget.id}`} className="text-xs uppercase tracking-wide text-neutral-600 dark:text-neutral-400">Group by</label>
          <select id={`dim-${widget.id}`} value={dimension}
            onChange={e => onConfigChange && onConfigChange({ ...config, dimension: e.target.value })}
            className="text-xs rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-1.5 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40">
            <option value="status">Status</option>
            <option value="type">Type</option>
            <option value="priority">Priority</option>
          </select>
        </div>
      )}

      {widget.widgetType === 'SCORECARD' && (
        canDrill ? (
          <button type="button" onClick={() => onDrill({ title: widget.title || 'Items', items })}
            className="text-3xl font-bold text-brand-navy dark:text-white rounded hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40">
            {scorecardCount}
          </button>
        ) : (
          <p className="text-3xl font-bold text-brand-navy dark:text-white">{scorecardCount}</p>
        )
      )}

      {widget.widgetType === 'STATUS_BAR' && (
        <div className="space-y-1.5 mt-1">
          {(() => {
            const entries = statusSeries;
            const max = Math.max(1, ...entries.map(e => e.value));
            if (entries.length === 0) return <p className="text-xs text-neutral-600 dark:text-neutral-600">No matching items.</p>;
            return entries.map(({ label: status, value: count }) => {
              const row = (
                <>
                  <span className="text-xs text-neutral-600 dark:text-neutral-400 w-24 truncate text-left">{status}</span>
                  <div className="flex-1 h-2 rounded-full bg-neutral-100 dark:bg-neutral-700 overflow-hidden">
                    <div className="h-full bg-brand-navy-tint rounded-full" style={{ width: `${(count / max) * 100}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 w-6 text-right">{count}</span>
                </>
              );
              return canDrill ? (
                <button key={status} type="button" aria-label={`${status}: ${count} — show items`}
                  onClick={() => onDrill({ title: `${widget.title || 'Items'} · Status: ${status}`, items: items.filter(i => (i.status || 'Unknown') === status) })}
                  className="flex w-full items-center gap-2 rounded px-1 -mx-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 transition-colors">
                  {row}
                </button>
              ) : (
                <div key={status} className="flex items-center gap-2">{row}</div>
              );
            });
          })()}
        </div>
      )}

      {widget.widgetType === 'ITEM_LIST' && (
        <div className="space-y-1 mt-1">
          {listItems.length === 0 && <p className="text-xs text-neutral-600 dark:text-neutral-600">No matching items.</p>}
          {listItems.slice(0, config.limit || 6).map(i => (
            <div key={i.id} className="flex items-center justify-between gap-2 py-1 border-b border-neutral-100 dark:border-neutral-700/50 last:border-0">
              <span className="text-xs text-neutral-700 dark:text-neutral-300 truncate">{i.title}</span>
              <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400 flex-shrink-0">{i.status}</span>
            </div>
          ))}
        </div>
      )}

      {widget.widgetType === 'PIE' && (
        <DonutChart data={chartData}
          onSelect={canDrill ? (e => onDrill({ title: `${widget.title || 'Items'} · ${dimension}: ${e.label}`, items: drillBy(e.label) })) : undefined} />
      )}

      {widget.widgetType === 'BAR' && (
        <BarChart data={chartData}
          onSelect={canDrill ? (e => onDrill({ title: `${widget.title || 'Items'} · ${dimension}: ${e.label}`, items: drillBy(e.label) })) : undefined} />
      )}

      {(widget.widgetType === 'SPRINT_HEALTH' || widget.widgetType === 'BURNDOWN') && (() => {
        const p = sprintProgress(sprints, config.mode || (widget.widgetType === 'BURNDOWN' ? 'burndown' : 'health'));
        const pct = p.max ? Math.round((p.value / p.max) * 100) : 0;
        return (
          <div className="mt-1">
            <div className="flex items-end justify-between mb-1">
              <span className="text-3xl font-bold text-brand-navy dark:text-white">{pct}%</span>
              <span className="text-xs text-neutral-600 dark:text-neutral-400">{p.value}/{p.max || 0} pt · {p.label}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-neutral-100 dark:bg-neutral-700 overflow-hidden">
              <div className="h-full bg-semantic-success rounded-full" style={{ width: `${p.max ? Math.min((p.value / p.max) * 100, 100) : 0}%` }} />
            </div>
            <p className="text-xs text-neutral-500 mt-1 truncate">{p.sprint?.name || 'No active sprint'}</p>
          </div>
        );
      })()}

      {widget.widgetType === 'VELOCITY_LINE' && (() => {
        const points = velocityPoints(velocity);
        if (points.length === 0) return <p className="text-xs text-neutral-600">No sprint history yet.</p>;
        const max = Math.max(1, ...points.map(p => p.value));
        const n = points.length;
        const path = points.map((p, i) => `${n <= 1 ? 0 : (i / (n - 1)) * 100},${30 - (p.value / max) * 28}`).join(' ');
        return (
          <div className="mt-1 text-brand-navy dark:text-brand-amber">
            <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-14" aria-hidden="true">
              <polyline points={path} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
            </svg>
            <div className="flex justify-between text-xs text-neutral-500 mt-1">
              <span>{points[0]?.label}</span><span>{points[points.length - 1]?.label}</span>
            </div>
          </div>
        );
      })()}

      {widget.widgetType === 'CUMULATIVE_FLOW' && (() => {
        const series = statusBreakdown(items);
        const total = series.reduce((a, b) => a + b.value, 0) || 1;
        if (series.length === 0) return <p className="text-xs text-neutral-600">No matching items.</p>;
        return (
          <div className="mt-1">
            <div className="flex w-full h-3 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-700">
              {series.map((s, idx) => (
                <div key={s.label} className={SERIES_BG[idx % SERIES_BG.length]} style={{ width: `${(s.value / total) * 100}%` }} title={`${s.label}: ${s.value}`} />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
              {series.map((s, idx) => (
                <span key={s.label} className="flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-400">
                  <span className={`w-2 h-2 rounded-full ${SERIES_BG[idx % SERIES_BG.length]}`} />
                  {s.label} <span className="font-semibold text-neutral-700 dark:text-neutral-300">{s.value}</span>
                </span>
              ))}
            </div>
          </div>
        );
      })()}

      {widget.widgetType === 'MATRIX' && (() => {
        const m = statusPriorityMatrix(items);
        return (
          <div className="mt-1 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-neutral-500">
                  <th className="text-left font-semibold py-1 pr-2">Status</th>
                  {m.cols.map(c => <th key={c} className="text-right font-semibold py-1 px-1">{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {m.rows.map(row => (
                  <tr key={row.label} className="border-t border-neutral-100 dark:border-neutral-700/50">
                    <td className="py-1 pr-2 text-neutral-700 dark:text-neutral-300 truncate">{row.label}</td>
                    {row.cells.map((c, idx) => (
                      <td key={idx} className={`text-right py-1 px-1 ${c > 0 ? 'text-neutral-900 dark:text-neutral-100 font-semibold' : 'text-neutral-600 dark:text-neutral-400'}`}>{c || '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })()}
    </div>
  );
}

// Iteration 6 — drill-down modal: lists the work items behind a clicked widget
// element. Each row opens that item's detail (no navigation away from the dashboard).
function DashboardDrillModal({ drill, onClose, onOpenItem }) {
  const items = drill.items || [];
  return (
    <div className="fixed inset-0 bg-neutral-900/50 dark:bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={e => { if (e.key === 'Escape') onClose(); }}
      role="dialog" aria-modal="true" aria-label={drill.title}>
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg border border-neutral-100 dark:border-neutral-700 w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-white truncate">{drill.title}</h2>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">{items.length} {items.length === 1 ? 'item' : 'items'}</p>
          </div>
          <button onClick={onClose} aria-label="Close" autoFocus
            className="flex-shrink-0 ml-2 text-lg leading-none text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="overflow-y-auto p-2">
          {items.length === 0 ? (
            <p className="text-xs text-neutral-600 dark:text-neutral-600 p-4 text-center">No matching items.</p>
          ) : items.map(i => (
            <button key={i.id} type="button" onClick={() => onOpenItem(i)}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 rounded-md text-left hover:bg-neutral-50 dark:hover:bg-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 transition-colors">
              <span className="min-w-0 flex-1 truncate text-sm text-neutral-800 dark:text-neutral-200">{i.title}</span>
              <span className="flex items-center gap-2 flex-shrink-0">
                {i.priority && <span className="text-xs text-neutral-600 dark:text-neutral-400">{i.priority}</span>}
                <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">{i.status}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function formatEventType(eventType) {
  const map = {
    WORK_ITEM_CREATED: 'created this item',
    WORK_ITEM_UPDATED: 'updated this item',
    WORK_ITEM_DELETED: 'deleted this item',
    COMMENT_ADDED:     'added a comment',
    STATUS_CHANGED:    'changed the status',
    ASSIGNED:          'changed the assignee',
    USER_LOGGED_IN:    'logged in',
    USER_SIGNED_UP:    'signed up',
  };
  return map[eventType] || (eventType || '').toLowerCase().replace(/_/g, ' ');
}

function PmArtifactList({ title, icon: Icon, items, columns, renderRow, onDelete, onAdd, statusColors = {} }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
          {isIconComponent(Icon) ? <Icon aria-hidden="true" className="h-4 w-4 text-neutral-600 dark:text-neutral-400" /> : <span>{Icon}</span>} {title}
        </h2>
        <Button variant="action" onClick={onAdd}>+ New</Button>
      </div>
      {items.length === 0
        ? <EmptyState icon={Icon} title={`No ${title.toLowerCase()} yet`} subtitle="Click + New to add your first entry." action={<Button variant="action" onClick={onAdd}>+ New</Button>} />
        : <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700">
                <tr>
                  {columns.map(c => <th key={c} className="text-left px-4 py-2.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">{c}</th>)}
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
                {items.map(item => {
                  const cells = renderRow(item);
                  return (
                    <tr key={item.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700">
                      {cells.map((cell, i) => (
                        <td key={i} className={`px-4 py-3 ${i === 0 ? 'font-medium text-neutral-900 dark:text-neutral-100 max-w-xs truncate' : 'text-neutral-600 dark:text-neutral-300 text-xs'}`}>
                          {i === 0 ? cell : (statusColors[cell]
                            ? <span className={`font-semibold ${statusColors[cell]}`}>{cell}</span>
                            : cell)}
                        </td>
                      ))}
                      <td className="px-4 py-3">
                        <button onClick={() => onDelete(item.id)} className="text-neutral-300 hover:text-semantic-danger text-xs transition-colors">Delete</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
      }
    </div>
  );
}

function SprintItemList({ sprintId, users, onMoveToBacklog, onSelect }) {
  const [items, setItems] = React.useState([]);
  React.useEffect(() => {
    api.raw(`/sprints/${sprintId}/items`)
      .then(r => r.json()).then(d => setItems(Array.isArray(d) ? d : [])).catch(reportError);
  }, [sprintId]);

  if (items.length === 0) return <div className="px-5 py-4 text-sm text-neutral-600 text-center">No items in this sprint yet.</div>;
  return (
    <div className="divide-y divide-neutral-50 dark:divide-neutral-700">
      {items.map(item => (
        <div key={item.id} className="flex items-center gap-3 px-5 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-700 group">
          <TypeBadge type={item.type} compact />
          <span className="font-mono text-xs text-neutral-600 dark:text-neutral-400 w-20 flex-shrink-0">{item.id}</span>
          <span role="button" tabIndex={0} onKeyDown={onPressKey} className="flex-1 text-sm text-neutral-900 cursor-pointer hover:text-brand-navy truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded" onClick={() => onSelect(item)}>{item.title}</span>
          <StatusBadge category={statusToCategory(item.status)}>{item.status}</StatusBadge>
          {(item.storyPoints > 0) && <span className="text-xs bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 px-1.5 py-0.5 rounded">{item.storyPoints}pt</span>}
          {item.assigneeId && <Avatar name={users.find(u => u.id === item.assigneeId)?.fullName || ''} size={6} />}
          <button onClick={() => { onMoveToBacklog(item.id); setItems(prev => prev.filter(i => i.id !== item.id)); }}
            className="opacity-0 group-hover:opacity-100 text-xs text-neutral-600 dark:text-neutral-400 hover:text-brand-navy transition-opacity" aria-label="Move to backlog"><ArrowDown className="inline-block h-3.5 w-3.5 mr-1 align-text-bottom" aria-hidden="true" />Backlog</button>
        </div>
      ))}
    </div>
  );
}

/**
 * WYSIWYG Rich Text Editor
 * Uses contentEditable + execCommand for true what-you-see-is-what-you-get editing.
 * Formatting (bold, italic, lists, headings, links) is applied and rendered immediately —
 * no separate "preview" mode needed. Stores and emits HTML.
 */
function RichTextEditor({ value, onChange, onBlur, placeholder }) {
  const editorRef = useRef(null);
  const isComposing = useRef(false);

  // Sync initial value into the editor DOM (only on mount or external value change)
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    // Only update DOM if it differs (avoids cursor jump on every keystroke)
    if (el.innerHTML !== (value || '')) {
      el.innerHTML = value || '';
    }
  }, []);  // mount-only; ongoing changes come from user input

  const exec = (cmd, arg = null) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, arg);
    // Emit updated HTML after command
    onChange(editorRef.current?.innerHTML || '');
  };

  const handleInput = () => {
    if (!isComposing.current) onChange(editorRef.current?.innerHTML || '');
  };

  const handleKeyDown = (e) => {
    // Ctrl/Cmd shortcuts
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b') { e.preventDefault(); exec('bold'); }
      if (e.key === 'i') { e.preventDefault(); exec('italic'); }
      if (e.key === 'u') { e.preventDefault(); exec('underline'); }
    }
  };

  const handleBlur = () => {
    onChange(editorRef.current?.innerHTML || '');
    onBlur?.();
  };

  const ToolBtn = ({ cmd, arg, title, children, active }) => (
    <button type="button" title={title}
      onMouseDown={e => { e.preventDefault(); exec(cmd, arg); }}
      className={`w-7 h-7 flex items-center justify-center rounded text-xs transition-colors
        ${active ? 'bg-brand-navy text-white' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'}`}>
      {children}
    </button>
  );

  return (
    <div className="border border-neutral-200 dark:border-neutral-600 rounded-lg overflow-hidden focus-within:border-brand-navy transition-colors dark:bg-neutral-800">
      {/* WYSIWYG Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700 flex-wrap">
        <ToolBtn cmd="bold"          title="Bold (Ctrl+B)"><strong>B</strong></ToolBtn>
        <ToolBtn cmd="italic"        title="Italic (Ctrl+I)"><em>I</em></ToolBtn>
        <ToolBtn cmd="underline"     title="Underline (Ctrl+U)"><u>U</u></ToolBtn>
        <ToolBtn cmd="strikeThrough" title="Strikethrough"><s>S</s></ToolBtn>
        <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-600 mx-1"/>
        <ToolBtn cmd="formatBlock" arg="h2"  title="Heading 2"><span className="font-bold text-xs">H2</span></ToolBtn>
        <ToolBtn cmd="formatBlock" arg="h3"  title="Heading 3"><span className="font-bold text-xs">H3</span></ToolBtn>
        <ToolBtn cmd="formatBlock" arg="p"   title="Paragraph"><span className="text-xs">¶</span></ToolBtn>
        <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-600 mx-1"/>
        <ToolBtn cmd="insertUnorderedList" title="Bullet list"><span className="text-[11px]">• —</span></ToolBtn>
        <ToolBtn cmd="insertOrderedList"   title="Numbered list"><span className="text-[11px]">1.</span></ToolBtn>
        <ToolBtn cmd="indent"              title="Indent"><IndentIncrease className="h-4 w-4" aria-hidden="true" /></ToolBtn>
        <ToolBtn cmd="outdent"             title="Outdent"><IndentDecrease className="h-4 w-4" aria-hidden="true" /></ToolBtn>
        <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-600 mx-1"/>
        <ToolBtn cmd="removeFormat" title="Clear formatting"><X className="h-4 w-4" aria-hidden="true" /></ToolBtn>
        <span className="ml-auto text-xs text-neutral-300 pr-1">WYSIWYG</span>
      </div>

      {/* Editable area — true WYSIWYG */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onCompositionStart={() => { isComposing.current = true; }}
        onCompositionEnd={() => { isComposing.current = false; handleInput(); }}
        data-placeholder={placeholder}
        className="min-h-[100px] max-h-64 overflow-y-auto px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none bg-white dark:bg-neutral-800
          [&_h2]:text-base [&_h2]:font-bold [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-1
          [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5
          [&_li]:mb-0.5 [&_strong]:font-semibold [&_em]:italic [&_u]:underline [&_s]:line-through
          empty:before:content-[attr(data-placeholder)] empty:before:text-neutral-300"
      />
    </div>
  );
}

function SprintBoard({ items, columns, users, swimlaneBy, onDragStart, onDragOver, onDrop, onSelect, onDelete, density, allItems = [] }) {
  const pad = { compact: 'p-2', comfortable: 'p-3', spacious: 'p-4' };

  const getSwimlanes = () => {
    if (swimlaneBy === 'none') return [{ key: 'all', label: null, items }];
    if (swimlaneBy === 'assignee') {
      const keys = [...new Set(items.map(i => i.assigneeId || 'unassigned'))];
      return keys.map(k => ({ key: k, label: k === 'unassigned' ? 'Unassigned' : users.find(u => u.id === k)?.fullName || k, items: items.filter(i => (i.assigneeId || 'unassigned') === k) }));
    }
    if (swimlaneBy === 'type') {
      const keys = [...new Set(items.map(i => i.type))];
      return keys.map(k => ({ key: k, label: k, items: items.filter(i => i.type === k) }));
    }
    if (swimlaneBy === 'priority') {
      return ['CRITICAL','HIGH','MEDIUM','LOW'].map(p => ({ key: p, label: p, items: items.filter(i => (i.priority || 'MEDIUM') === p) })).filter(s => s.items.length > 0);
    }
    if (swimlaneBy === 'epic') {
      // Group by parent Epic (or "No Epic" if no parent)
      const epicMap = {};
      items.forEach(item => {
        const epicId = item.parentId || 'no-epic';
        if (!epicMap[epicId]) epicMap[epicId] = [];
        epicMap[epicId].push(item);
      });
      return Object.entries(epicMap).map(([epicId, epicItems]) => {
        const epic = allItems.find(i => i.id === epicId && i.type === 'Epic');
        return {
          key: epicId,
          label: epic ? epic.title : epicId === 'no-epic' ? 'No Epic' : epicId,
          items: epicItems
        };
      }).sort((a, b) => {
        if (a.label === 'No Epic') return 1;
        if (b.label === 'No Epic') return -1;
        return a.label.localeCompare(b.label);
      });
    }
    if (swimlaneBy === 'tag') {
      const tagMap = { 'No Tags': [] };
      items.forEach(item => {
        if (!item.tags || item.tags.length === 0) {
          tagMap['No Tags'].push(item);
        } else {
          item.tags.forEach(tag => {
            if (!tagMap[tag]) tagMap[tag] = [];
            tagMap[tag].push(item);
          });
        }
      });
      return Object.entries(tagMap)
        .filter(([, tagItems]) => tagItems.length > 0)
        .map(([tag, tagItems]) => ({ key: tag, label: tag, items: tagItems }))
        .sort((a, b) => {
          if (a.label === 'No Tags') return 1;
          if (b.label === 'No Tags') return -1;
          return a.label.localeCompare(b.label);
        });
    }
    return [{ key: 'all', label: null, items }];
  };

  return (
    <div className="flex-1 overflow-auto dark:bg-neutral-900">
      {getSwimlanes().map(lane => (
        <div key={lane.key}>
          {lane.label && (
            <div className="flex items-center gap-2 mb-2 mt-4 px-1">
              <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700"></div>
              <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider px-2">{lane.label}</span>
              <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700"></div>
            </div>
          )}
          <div className="flex gap-4 min-h-40">
            {columns.map(col => {
              const colItems = lane.items.filter(i => i.status === col.name);
              return (
                <div key={col.name} className="flex-1 min-w-48 flex flex-col bg-neutral-100 dark:bg-neutral-800 rounded-xl p-3"
                  onDragOver={onDragOver} onDrop={(e) => onDrop(e, col.name)}>
                  {!lane.label && (
                    <div className="flex items-center justify-between mb-3 px-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${col.dot}`}></span>
                        <h3 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">{col.name}</h3>
                      </div>
                      <span className="text-xs bg-white dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 px-2 py-0.5 rounded-full shadow-sm">{colItems.length}</span>
                    </div>
                  )}
                  <div className="space-y-2 flex-1">
                    {colItems.length === 0 && <div className="flex items-center justify-center py-6 border-2 border-dashed border-neutral-200 rounded-lg"><p className="text-xs text-neutral-300">Drop here</p></div>}
                    {colItems.map(item => (
                      <div key={item.id} draggable onDragStart={(e) => onDragStart(e, item.id)}
                        className={`bg-white dark:bg-neutral-700 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-600 cursor-grab hover:shadow-md transition-shadow group ${pad[density]}`}>
                        <div className="flex items-start justify-between mb-1.5">
                          <span className="font-mono text-xs text-neutral-600 dark:text-neutral-400">{item.id}</span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => onSelect(item)} className="text-neutral-600 dark:text-neutral-400 hover:text-brand-navy text-xs p-0.5" aria-label="Edit"><SquarePen className="h-3.5 w-3.5" aria-hidden="true" /></button>
                            <button onClick={() => onDelete(item.id)} className="text-neutral-600 dark:text-neutral-400 hover:text-semantic-danger text-xs p-0.5" aria-label="Delete"><X className="h-3.5 w-3.5" aria-hidden="true" /></button>
                          </div>
                        </div>
                        <p className="text-sm font-medium text-neutral-900 leading-snug mb-2 cursor-pointer" onClick={() => onSelect(item)}>{item.title}</p>
                        <div className="flex items-center justify-between">
                          <TypeBadge type={item.type} compact={density === 'compact'} />
                          <div className="flex items-center gap-1.5">
                            {(item.storyPoints > 0) && <span className="text-xs text-neutral-600 dark:text-neutral-400 font-medium">{item.storyPoints}pt</span>}
                            {item.assigneeId && <Avatar name={users.find(u => u.id === item.assigneeId)?.fullName || ''} size={5} />}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
