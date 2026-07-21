import { lazy } from 'react';

// Route-level code-split — each view loads on demand (WI-21). Vite emits one chunk per
// import(); AppShell's Suspense boundary shows a skeleton until the chunk is ready.
// Extracted from AppShell.jsx (Phase 2 / W2-c decomposition).

export const DashboardView = lazy(() => import('@/views/dashboard-view'));
export const BoardView = lazy(() => import('@/views/board-view'));
export const WorkspaceView = lazy(() => import('@/views/workspace-view'));
export const AccountView = lazy(() => import('@/views/account-view'));
export const PoWorkspaceView = lazy(() => import('@/views/po-workspace-view'));
export const LeadershipConsoleView = lazy(() => import('@/views/leadership-console-view'));
export const AdminOpsView = lazy(() => import('@/views/admin-ops-view'));
export const NotificationsView = lazy(() => import('@/views/notifications-view'));
export const TrashView = lazy(() => import('@/views/trash-view'));
export const ReleasesView = lazy(() => import('@/views/releases-view'));
export const BqlView = lazy(() => import('@/views/bql-view'));
export const MyWorksView = lazy(() => import('@/views/my-works-view'));
export const ScrumMasterCockpitView = lazy(() => import('@/views/scrum-master-cockpit-view'));
export const ProjectsView = lazy(() => import('@/views/projects-view'));
export const ReportsView = lazy(() => import('@/views/reports-view'));
export const AiStudioView = lazy(() => import('@/views/ai-studio-view'));
export const MarketplaceView = lazy(() => import('@/views/marketplace-view'));
export const DeveloperPortalView = lazy(() => import('@/views/developer-portal-view'));
export const KnowledgeTemplatesView = lazy(() => import('@/views/knowledge-templates-view'));
export const SupportInboxView = lazy(() => import('@/views/support-inbox-view'));
export const BacklogView = lazy(() => import('@/views/backlog-view'));
export const SprintView = lazy(() => import('@/views/sprint-view'));
export const DashboardsView = lazy(() => import('@/views/dashboards-view'));
export const ReportBuilderView = lazy(() => import('@/views/reportbuilder-view'));
export const ComplianceView = lazy(() => import('@/views/compliance-view'));
export const ServiceView = lazy(() => import('@/views/service-view'));
export const KnowledgeView = lazy(() => import('@/views/knowledge-view'));
export const PublicArticleView = lazy(() => import('@/views/public-article-view'));
export const EmbedArticleView = lazy(() => import('@/views/embed-article-view'));
export const PmView = lazy(() => import('@/views/pm-view'));
export const Settings3View = lazy(() => import('@/views/settings3-view'));
export const SearchView = lazy(() => import('@/views/search-view'));
