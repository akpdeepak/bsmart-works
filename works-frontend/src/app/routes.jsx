// routes.jsx — Route-level code-split (TD-003 Phase 2)
// Each view loads on demand via React.lazy. Vite emits one chunk per import();
// the Suspense boundary in AppShell shows a skeleton until the chunk is ready.
import React from 'react';

export const DashboardView              = React.lazy(() => import('@/views/dashboard-view'));
export const BoardView                  = React.lazy(() => import('@/views/board-view'));
export const WorkspaceView              = React.lazy(() => import('@/views/workspace-view'));
export const AccountView                = React.lazy(() => import('@/views/account-view'));
export const PoWorkspaceView            = React.lazy(() => import('@/views/po-workspace-view'));
export const LeadershipConsoleView      = React.lazy(() => import('@/views/leadership-console-view'));
export const AdminOpsView               = React.lazy(() => import('@/views/admin-ops-view'));
export const OperatingModelView         = React.lazy(() => import('@/views/operating-model-view'));
export const NotificationsView          = React.lazy(() => import('@/views/notifications-view'));
export const TrashView                  = React.lazy(() => import('@/views/trash-view'));
export const ReleasesView               = React.lazy(() => import('@/views/releases-view'));
export const BqlView                    = React.lazy(() => import('@/views/bql-view'));
export const MyWorksView                = React.lazy(() => import('@/views/my-works-view'));
export const ScrumMasterCockpitView     = React.lazy(() => import('@/views/scrum-master-cockpit-view'));
export const ProjectsView               = React.lazy(() => import('@/views/projects-view'));
export const ReportsView                = React.lazy(() => import('@/views/reports-view'));
export const AiStudioView               = React.lazy(() => import('@/views/ai-studio-view'));
export const MarketplaceView            = React.lazy(() => import('@/views/marketplace-view'));
export const DeveloperPortalView        = React.lazy(() => import('@/views/developer-portal-view'));
export const KnowledgeTemplatesView     = React.lazy(() => import('@/views/knowledge-templates-view'));
export const SupportInboxView           = React.lazy(() => import('@/views/support-inbox-view'));
export const MessengerView              = React.lazy(() => import('@/views/messenger-view'));
export const BacklogView                = React.lazy(() => import('@/views/backlog-view'));
export const SprintView                 = React.lazy(() => import('@/views/sprint-view'));
export const DashboardsView             = React.lazy(() => import('@/views/dashboards-view'));
export const ReportBuilderView          = React.lazy(() => import('@/views/reportbuilder-view'));
export const ComplianceView             = React.lazy(() => import('@/views/compliance-view'));
export const ServiceView                = React.lazy(() => import('@/views/service-view'));
export const KnowledgeView              = React.lazy(() => import('@/views/knowledge-view'));
// KR-066: public article share link — loaded on /p/:token with no auth.
export const PublicArticleView          = React.lazy(() => import('@/views/public-article-view'));
// KR-069: minimal-chrome article embed — loaded on /embed/article/:token with no auth.
export const EmbedArticleView           = React.lazy(() => import('@/views/embed-article-view'));
export const PmView                     = React.lazy(() => import('@/views/pm-view'));
export const Settings3View              = React.lazy(() => import('@/views/settings3-view'));
export const SearchView                 = React.lazy(() => import('@/views/search-view'));
