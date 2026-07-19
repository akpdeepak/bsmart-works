---
status: historical
runtime_context: false
authority: source-material
---

# bSmart Works — Complete Implementation Blueprint & Epic Roadmap

This blueprint is based on the current uploaded repository snapshot (`bsmart-works-main (3)(3).zip`) plus the product direction discussed: a simple, minimal, premium, calm, visually engaging, reliable, accurate, habit-forming AI-native enterprise work operating system.

## Verified Current Codebase Snapshot

- Backend: Spring Boot / Java 21, `works-backend`
- Frontend: React 19 / Vite / Tailwind, `works-frontend`
- Backend main Java files: 657
- Backend test files: 219
- Frontend source files: 600
- Frontend tests: 219
- Flyway migrations: 107
- Backend controllers: 143
- Approximate endpoint mappings: 737
- Current largest frontend file: `works-frontend/src/App.jsx` (~4,569 lines)
- Current largest backend file: `works-backend/src/main/java/com/bcits/works/WorkItemController.java` (~940 lines)

The codebase is feature-rich, but the next stage should focus on security, simplification, product coherence, premium UX, accuracy, and reliability before major feature expansion.

## North Star

bSmart Works should become an AI-native enterprise work operating system that unifies:

- Today cockpit
- Smart Inbox
- Work-aware messaging
- Work items and projects
- DevSync engineering intelligence
- Knowledge and documents
- Service desk and customer resolution
- AI answer engine
- AI canvas and agents
- Reports, automation, governance, and integrations

The product should feel simple outside and powerful inside.

## Target Top-Level Navigation

Primary visible navigation:

1. Today
2. Inbox
3. Messages
4. Work
5. Projects
6. Knowledge
7. Reports
8. More

Under More:

- Service Desk
- Customers
- DevSync
- Automations
- Integrations
- AI Studio
- BQL
- Admin
- Security
- Marketplace
- Settings

---

# EPIC 0 — Current-State Hardening, Truth, and Delivery Baseline

## What
Establish a trustworthy baseline before any major redesign or feature expansion.

## Why
The current codebase already has broad functionality. The main risk is not lack of modules; it is inconsistency, security gaps, stale documentation, and unclear implementation sequencing.

## Where
- `README.md`
- `TECH-DEBT.md`
- `SECURITY.md`
- `DEPLOY-LOCAL.md`
- `CLAUDE.md`
- `AGENTS.md`
- `.github/workflows/*`
- `scripts/*`
- `works-backend/Dockerfile`
- `docker-compose.yml`
- `docker-compose.deploy.yml`

## How
- Create a current-state document listing implemented, partial, stubbed, and future features.
- Refresh stale technical debt notes.
- Define production readiness gates.
- Fix Docker jar copy mismatch.
- Define a single implementation order for coding agents.
- Add guardrails for tenant safety, `WS-001`, API contract drift, and unsafe auth patterns.

## Acceptance Criteria
- `README.md` reflects the actual current repo state.
- `TECH-DEBT.md` is updated and no longer contradicts implemented modules.
- Docker backend image builds using the actual `works-*.jar`, not `demo-*.jar`.
- A `CURRENT-STATE.md` or equivalent document exists.
- Every epic has a clear owner path and implementation priority.
- CI guardrails document what is blocking and what is warning-only.

---

# EPIC 1 — Multi-Tenant Security and RBAC Hardening

## What
Fix tenant isolation and permission consistency across risky surfaces.

## Why
The product is enterprise/multi-tenant. A premium product cannot leak data across workspaces or let users perform actions by guessing IDs.

## Where
- `works-backend/src/main/java/com/bcits/works/WorkItemController.java`
- `DashboardController.java`
- `DashboardService.java`
- `ScimController.java`
- `FieldLayoutController.java`
- `BqlController.java`
- `RbacController.java`
- `SecurityConfig.java`
- `AttachmentController.java`
- `works-frontend/src/App.jsx`
- `works-frontend/src/components/works/organisms/sla-view.jsx`

## How
- Fix starred work-item tenant leak.
- Add workspace-membership checks before star/unstar/fetch-starred.
- Remove arbitrary `userId` dashboard access; use authenticated user.
- Workspace-scope all dashboard queries.
- Require RBAC permission for SCIM token issuance.
- Fix `FieldLayoutController` project/workspace resolution.
- Remove production fallbacks to `WS-001`.
- Restrict `access_token` query-param authentication to realtime SSE only.
- Add tenant isolation regression tests.

## Acceptance Criteria
- User from workspace A cannot star, fetch, view, or infer work items from workspace B.
- Dashboard APIs reject unauthorized workspace/user access.
- SCIM token issuance requires `manage_security` or `manage_integrations`.
- No production controller defaults to `WS-001`.
- Frontend no longer hardcodes `WS-001` for live compliance/SLA/workspace surfaces.
- Query-param JWT is accepted only for `/api/v1/realtime/stream`.
- Tests cover cross-tenant denial for starred items, dashboard, SCIM, field layouts, BQL, and SLA.

---

# EPIC 2 — Production Configuration, Deployment, and Secrets Safety

## What
Make deployment safe and predictable.

## Why
A secure product fails if production can accidentally boot with dev secrets or dev-only behavior.

## Where
- `works-backend/src/main/resources/application.properties`
- `works-backend/Dockerfile`
- `docker-compose.deploy.yml`
- `.github/workflows/*`
- `DEPLOY-LOCAL.md`
- `SECURITY.md`

## How
- Fail startup in production/staging if JWT secret is absent or uses dev value.
- Default dev verification token exposure to false outside local dev.
- Create environment templates for local, staging, production.
- Add health/readiness/liveness checks.
- Validate Docker Compose deployment path.
- Add backup/restore runbook for Postgres/uploads.

## Acceptance Criteria
- Production profile refuses missing or dev JWT secret.
- Dev verification token exposure is disabled by default outside dev.
- Docker Compose deploy works with documented `.env` values.
- Health endpoint reports DB, migration, storage, AI, realtime status.
- Deployment docs identify local-only vs production-required secrets.
- CI includes deployment smoke validation.

---

# EPIC 3 — Backend Modularization and Service Boundaries

## What
Move from a mostly flat backend package into domain-aligned packages and services.

## Why
The backend has 657 Java files and several large controllers/services. This will become harder to maintain as messaging, DevSync, AI, and service desk expand.

## Where
Current flat package:
- `works-backend/src/main/java/com/bcits/works/*`

Target packages:
- `com.bcits.works.auth`
- `com.bcits.works.workspace`
- `com.bcits.works.workitem`
- `com.bcits.works.project`
- `com.bcits.works.messaging`
- `com.bcits.works.devsync`
- `com.bcits.works.ai`
- `com.bcits.works.knowledge`
- `com.bcits.works.service`
- `com.bcits.works.sla`
- `com.bcits.works.reporting`
- `com.bcits.works.automation`
- `com.bcits.works.security`
- `com.bcits.works.shared`

## How
- Split `WorkItemController` into query, command, hierarchy, starring, activity, and link controllers/services.
- Split `DashboardService` into role-specific scoped services.
- Split `AiAssistService` into command, summarization, answer engine, fallback, and provider services.
- Add ArchUnit package-boundary rules.
- Introduce DTOs for API contracts rather than ad hoc maps.

## Acceptance Criteria
- `WorkItemController.java` reduced below 400 lines.
- `DashboardService.java` reduced or split by role/domain.
- No controller contains complex business logic or SQL-heavy orchestration.
- ArchUnit rules prevent domain leakage.
- API DTOs are explicit and tested.
- Existing tests remain green after refactor.

---

# EPIC 4 — Frontend Architecture Refactor

## What
Break down `App.jsx` and create a clean frontend app architecture.

## Why
`App.jsx` is too large and controls too many responsibilities. This blocks premium UX, reliability, and feature development.

## Where
- `works-frontend/src/App.jsx`
- `works-frontend/src/lib/nav-model.js`
- `works-frontend/src/lib/routes.js`
- `works-frontend/src/components/works/organisms/mode-rail.jsx`
- `sub-rail.jsx`
- `command-palette.jsx`

Target additions:
- `works-frontend/src/app/AppShell.jsx`
- `AuthGate.jsx`
- `WorkspaceProvider.jsx`
- `RouteRenderer.jsx`
- `RightContextPanelProvider.jsx`
- `GlobalModalsProvider.jsx`
- `GlobalShortcutsProvider.jsx`
- `RealtimeProvider.jsx`

## How
- Extract auth/session logic.
- Extract workspace state.
- Extract route rendering.
- Extract global modal handling.
- Extract realtime/presence logic.
- Extract navigation state.
- Remove file-level ESLint disable.
- Move feature-specific state into feature modules.

## Acceptance Criteria
- `App.jsx` below 1,000 lines in phase 1, below 500 in phase 2.
- No `/* eslint-disable no-unused-vars, no-undef */` at file level.
- Global providers are independently testable.
- Routes are declared in one place.
- Feature modules do not depend on global mutable App state.
- Existing navigation and deep links still work.

---

# EPIC 5 — Premium Design System Refresh

## What
Make the app simple, minimal, premium, calm, professional, visually engaging, smooth, and pleasurable.

## Why
Feature breadth exists. Now the product needs emotional polish and visual maturity to feel premium.

## Where
- `works-frontend/tailwind.config.js`
- `works-frontend/src/index.css`
- `works-frontend/src/lib/brand-tokens.js`
- `works-frontend/src/components/works/atoms/*`
- `molecules/*`
- `organisms/*`
- Storybook files

## How
- Define final tokens for color, spacing, radius, elevation, typography, z-index, motion, density.
- Use one strong brand accent sparingly.
- Reduce visual noise: fewer borders, fewer cards, better spacing.
- Add premium empty/loading/error states.
- Add density modes: comfortable, standard, compact.
- Add motion tokens and respect reduced motion.
- Build a design QA checklist.

## Acceptance Criteria
- All production UI colors use tokens.
- Raw hex values only exist in approved token files, tests, or user-configurable color pickers.
- Core components have Storybook examples.
- Empty states include explanation and next action.
- Loading states use skeletons/shimmers consistently.
- Core screens pass accessibility checks.
- UI supports light, dark, and compact modes.
- Motion is subtle and disabled when reduced motion is preferred.

---

# EPIC 6 — Simplified Information Architecture and Navigation

## What
Reduce visible navigation complexity while keeping all existing functionality discoverable.

## Why
Users should not feel overwhelmed. The app should feel like one workspace, not many modules.

## Where
- `works-frontend/src/lib/nav-model.js`
- `works-frontend/src/components/works/organisms/mode-rail.jsx`
- `sub-rail.jsx`
- `sidebar-nav.jsx`
- `command-palette.jsx`

## How
- Replace current visible mode groups with user-first navigation: Today, Inbox, Messages, Work, Projects, Knowledge, Reports, More.
- Move admin/power tools under More and command palette.
- Add role-aware default landing pages.
- Keep command palette as universal access.
- Add breadcrumbs and contextual right panel.

## Acceptance Criteria
- Primary navigation has no more than 8 items.
- All existing views remain reachable by command palette or More.
- Role-based navigation hides irrelevant surfaces without replacing server RBAC.
- Navigation labels are clear and localized.
- Current deep links continue to resolve.
- User can reach any major feature in 2 clicks or via command palette.

---

# EPIC 7 — bSmart Today: Daily Clarity Surface

## What
Build the default landing page that tells each user what matters today.

## Why
This is the most important healthy habit-forming hook. Users return because the app reduces stress and gives clarity.

## Where
Existing:
- `works-frontend/src/views/dashboard-view.jsx`
- `works-frontend/src/components/works/organisms/today-canvas.jsx`
- `today-widget-picker.jsx`
- `works-backend/src/main/java/com/bcits/works/TodayLayoutController.java`
- `WidgetDataController.java`
- `CockpitContextController.java`

## How
Show:
- AI daily brief
- My priorities
- Approvals
- Blocked work
- SLA risks
- Customer escalations
- Important messages
- DevSync highlights
- Suggested actions

## Acceptance Criteria
- Today is the default authenticated landing page.
- User sees maximum 5 priority items by default.
- Every card has one clear action.
- Role-specific Today layouts exist for developer, team lead, PM, support agent, executive, admin.
- AI brief includes sources or deterministic fallback.
- Today does not leak cross-workspace data.
- Today loads under 2 seconds on seeded data.
- User can personalize widgets.

---

# EPIC 8 — Smart Inbox

## What
Create an action-first inbox for approvals, mentions, assignments, waits, alerts, customer replies, and code review requests.

## Why
Users do not need more notifications; they need one place for action.

## Where
- `works-frontend/src/views/notifications-view.jsx`
- `support-inbox-view.jsx`
- `works-backend/src/main/java/com/bcits/works/NotificationController.java`
- `NotificationPrefController.java`
- `CommentDigestController.java`
- `PushPreferenceController.java`

## How
Group inbox items by required action:
- Approve
- Reply
- Review
- Assign
- Escalate
- Snooze
- Mark done
- Convert to work

## Acceptance Criteria
- Inbox count reflects actionable items, not all activity.
- User can act directly from Inbox.
- Items link to source work item/project/message/customer/code event.
- User can snooze and configure quiet hours.
- AI missed-summary groups long activity with sources.
- Inbox respects RBAC/workspace membership.
- Notifications remain available separately as activity history.

---

# EPIC 9 — bSmart Connect: Work-Aware Messaging

## What
Implement integrated messaging inspired by WhatsApp, Instagram, Facebook, and LinkedIn, but enterprise-safe and work-aware.

## Why
A lot of real work is discussed in chat but not converted into tracked work, decisions, approvals, risks, or commitments.

## Where
Existing base:
- `works-backend/src/main/resources/db/migration/V57__customer_chat.sql`
- `SupportChatAgentController.java`
- `SupportChatPortalController.java`
- `SupportChatService.java`
- `works-frontend/src/views/support-inbox-view.jsx`
- `works-frontend/src/components/works/organisms/support-chat-widget.jsx`
- `works-frontend/src/lib/supportChat.js`

Target additions:
- `ConversationController.java`
- `MessageController.java`
- `MessageActionService.java`
- `message_*` tables or generalized conversation schema
- `works-frontend/src/views/messages-view.jsx`
- `conversation-list.jsx`
- `message-thread.jsx`
- `message-context-panel.jsx`

## How
Support conversation types:
- Direct message
- Group chat
- Project room
- Work item thread
- Customer conversation
- Community
- Incident room
- Release room
- Announcement

Add smart actions:
- Create task from message
- Create decision from message
- Create approval from message
- Create risk from message
- Create customer commitment from message
- Summarize conversation
- Extract action items
- Draft reply
- Translate/rewrite

## Acceptance Criteria
- Users can send direct and group messages.
- Every project has a project room.
- Every work item can have a thread.
- Messages support reactions, mentions, files, pins, read receipts.
- Internal and customer-visible messages are clearly separated.
- AI suggestions require approval before creating official records.
- External users cannot see internal messages.
- Conversation summaries cite message sources.
- Message retention/audit policy is configurable.

---

# EPIC 10 — Work Item Experience Redesign

## What
Redesign the work item detail experience into a calm, structured, AI-assisted execution page.

## Why
Work items are the atomic unit of execution. They need to feel simpler and richer at the same time.

## Where
- `works-frontend/src/components/works/organisms/work-item-detail-panel.jsx`
- `works-frontend/src/components/works/organisms/work-item-detail/*`
- `works-frontend/src/views/board-view.jsx`
- `backlog-view.jsx`
- `sprint-view.jsx`
- `works-backend/src/main/java/com/bcits/works/WorkItemController.java`
- `CommentController.java`
- `AttachmentController.java`
- `WorkItemLinkController.java`
- `DodChecklistController.java`

## How
Structure:
- Header: title, status, owner, priority, due date
- Main: description, checklist, subtasks, comments, files, linked docs
- Right panel: AI summary, properties, SLA, approvals, DevSync, activity, audit

## Acceptance Criteria
- Work item detail opens quickly and is usable on desktop/tablet/mobile.
- Inline updates for status, owner, priority, due date work reliably.
- Comments feel conversational.
- Activity is grouped by meaningful events.
- AI summary cites sources.
- DevSync panel appears when code is linked.
- SLA and customer visibility are clearly labeled.
- All updates are audited and tenant-scoped.

---

# EPIC 11 — Project Command Center

## What
Create a premium project page that makes project health, progress, risks, communication, and next actions obvious.

## Why
Managers and leadership need clarity, not dashboard noise.

## Where
- `works-frontend/src/views/projects-view.jsx`
- `pm-view.jsx`
- `scrum-master-cockpit-view.jsx`
- `po-workspace-view.jsx`
- `leadership-console-view.jsx`
- `works-backend/src/main/java/com/bcits/works/ProjectController.java`
- `KpiController.java`
- `RaidDashboardController.java`
- `ExecutiveBriefingController.java`
- `RiskController.java`
- `DecisionController.java`

## How
Project overview should show:
- Health
- Progress
- Milestones
- Timeline
- Risks
- Issues
- Decisions
- Dependencies
- SLA exposure
- Team workload
- DevSync summary
- Messages/project room
- Documents
- AI executive summary

## Acceptance Criteria
- A PM can understand project status within 10 seconds.
- Health score is explainable and source-backed.
- Risks, blockers, dependencies, and SLA exposure are visible.
- AI executive summary cites work, code, messages, and documents.
- Project room is accessible from project page.
- Customer update draft can be generated.
- No cross-workspace data appears.

---

# EPIC 12 — DevSync / Engineering Intelligence

## What
Sync GitHub, GitLab, and Azure DevOps activity into bSmart Works and link it to work progress.

## Why
Real engineering progress happens in commits, branches, PRs/MRs, reviews, CI/CD, deployments, and releases. This connects planned work with actual evidence.

## Where
Existing base:
- `works-backend/src/main/resources/db/migration/V47__iteration14_developer_workspace.sql`
- `DeveloperWorkspaceController.java`
- `DeveloperWorkspaceService.java`
- `CodeContextController.java`
- `works-frontend/src/components/works/organisms/developer-workspace.jsx`

Target additions:
- `works-backend/src/main/java/com/bcits/works/devsync/*`
- `code_activity_events`
- `code_repositories`
- `code_provider_connections`
- `code_work_item_links`
- `developer_identity_mappings`
- `works-frontend/src/views/devsync-view.jsx`
- `engineering-activity-panel.jsx`

## How
Sync:
- repositories
- branches
- commits
- PR/MR opened/updated/merged/closed
- reviews and comments
- CI pipelines and jobs
- deployments
- releases/tags
- security alerts

Map to work items via keys like `BSW-1421` in branch, commit, PR title/body.

## Acceptance Criteria
- Admin can connect GitHub/GitLab/Azure DevOps.
- Webhook signatures are verified.
- Raw provider events are stored before summarization.
- Duplicate events are deduplicated.
- Code activity links to work items by key.
- Unlinked activity is visible and manually linkable.
- Work item shows branch/PR/CI/deployment status.
- Project shows grouped engineering summary.
- Release readiness shows merged, pending review, failed CI, not deployed.
- AI engineering summaries cite raw events.
- No ranking by commit count or lines of code.

---

# EPIC 13 — Universal AI Command Layer

## What
Make `Ask bSmart` the universal command, search, creation, summarization, and action layer.

## Why
This is how a feature-rich product remains simple.

## Where
- `works-frontend/src/components/works/organisms/ai-command-bar.jsx`
- `command-palette.jsx`
- `works-backend/src/main/java/com/bcits/works/AiAssistController.java`
- `AiAssistService.java`
- `AiControlPlaneService.java`
- `AdvancedAiController.java`
- `Iteration15AiController.java`

## How
Support commands:
- Search work/docs/projects/messages/code
- Create tasks
- Summarize project/work item/conversation
- Draft customer updates
- Generate reports
- Identify risks
- Navigate to surfaces
- Propose automations

## Acceptance Criteria
- Ask bSmart is globally available.
- AI can search, summarize, draft, create, navigate, and propose actions.
- Destructive or external actions require review/approval.
- Important answers include sources.
- AI respects workspace/RBAC boundaries.
- AI fallback is logged and visible in AI admin health.
- Frontend AI endpoints match backend OpenAPI.

---

# EPIC 14 — bSmart Answer Engine

## What
Build a Perplexity/Rovo-style sourced answer engine across work, docs, messages, projects, service desk, SLA, and DevSync.

## Why
Enterprise users need answers they can trust and verify.

## Where
- `AiAssistController.java`
- `KnowledgeAiController.java`
- `ArticleSearchController.java`
- `BqlController.java`
- `WidgetDataController.java`
- `CommentDigestController.java`
- `CodeContextController.java`
- frontend search and AI command components

## How
Every answer should show:
- answer
- sources
- confidence
- permission boundary
- next actions
- audit record

## Acceptance Criteria
- User can ask why a project is delayed.
- User can ask what changed this week.
- User can ask which SLA items are at risk.
- User can ask what customer commitments exist.
- Answers cite source objects.
- User can open every cited source.
- Answers never use unauthorized data.
- Low-confidence answers say so clearly.

---

# EPIC 15 — bSmart Canvas and AI-Generated Work Artifacts

## What
Create a side-by-side AI canvas where AI-generated outputs become editable work artifacts.

## Why
AI responses should not remain trapped in chat. They should become reports, plans, RCA, checklists, release notes, and evidence bundles.

## Where
- `works-frontend/src/views/ai-studio-view.jsx`
- `works-frontend/src/components/BlockEditor.jsx`
- `works-frontend/src/views/reports-view.jsx`
- `reportbuilder-view.jsx`
- `works-backend/src/main/java/com/bcits/works/ArticleExportController.java`
- `ExportController.java`
- `ExecutiveBriefingController.java`

## How
Canvas layout:
- left: AI instruction/chat
- center: editable artifact
- right: sources, comments, approvals, version history

Artifacts:
- project plan
- RCA
- SLA report
- sprint plan
- customer update
- release note
- test checklist
- risk register
- compliance evidence bundle

## Acceptance Criteria
- AI can generate an editable artifact.
- User can edit and save artifact.
- Artifact has source references.
- Artifact can be approved/published/exported.
- Version history is retained.
- External/customer sharing requires explicit approval.

---

# EPIC 16 — Knowledge and Document Workspace

## What
Make Knowledge feel like Notion + Confluence + SharePoint + AI.

## Why
Enterprise delivery depends on SOPs, RCA, MOMs, decisions, project documents, evidence, templates, and customer documents.

## Where
- `works-frontend/src/views/knowledge-view.jsx`
- `knowledge-templates-view.jsx`
- `components/BlockEditor.jsx`
- `works-backend/src/main/java/com/bcits/works/ArticleController.java`
- `ArticleApprovalController.java`
- `ArticleExportController.java`
- `ArticleSearchController.java`
- `KnowledgeAiController.java`
- migrations `V95` to `V109`

## How
Improve:
- article pages
- document library
- templates
- version history
- review dates
- approvals
- full-text search
- `Ask this document`
- evidence bundles
- linked work/project/customer/release

## Acceptance Criteria
- Every article/document has owner, status, review date, version history.
- Articles link to work items/projects/customers/releases.
- Search works across title/body/tags/owner/status.
- AI Q&A cites exact source.
- Stale content is flagged.
- Approval/publishing flow works.
- Export to PDF/DOCX/Markdown works reliably.

---

# EPIC 17 — Service Desk and Customer Resolution

## What
Build a complete service desk/customer issue resolution experience connected to SLA, chat, knowledge, approvals, and work items.

## Why
For BCITS/utility clients, customer-facing service and SLA resolution can be a major differentiator.

## Where
- `works-frontend/src/views/service-view.jsx`
- `support-inbox-view.jsx`
- `CustomerPortal.jsx`
- `works-backend/src/main/java/com/bcits/works/ServiceRequestController.java`
- `CustomerPortalController.java`
- `SupportChatAgentController.java`
- `SupportChatPortalController.java`
- `SlaPolicyController.java`
- `SlaInstanceController.java`
- `ServiceCsatController.java`

## How
Add/strengthen:
- ticket intake
- customer portal
- SLA queues
- escalation
- incident/problem/change flow
- internal vs external conversation split
- RCA generation
- knowledge suggestions
- customer update approvals

## Acceptance Criteria
- Customer can raise and track requests.
- Agent can triage and assign.
- SLA timer is visible and accurate.
- Internal notes never show to customer.
- Customer-visible replies are explicit.
- Escalation rules trigger correctly.
- Knowledge suggestions appear.
- RCA can be created after incident closure.
- CSAT is captured.

---

# EPIC 18 — SLA, Compliance, Governance, and Evidence

## What
Strengthen governance modules so enterprise buyers trust the product.

## Why
Utility/enterprise work needs auditability, SLA discipline, compliance evidence, approvals, and privacy controls.

## Where
- `works-frontend/src/views/compliance-view.jsx`
- `components/works/organisms/sla-view.jsx`
- `security-center.jsx`
- `admin-ops-view.jsx`
- `works-backend/src/main/java/com/bcits/works/Sla*Controller.java`
- `Compliance*Controller.java`
- `EvidencePackageController.java`
- `AuditLogController.java`
- `SecurityAuditLogController.java`

## How
- Make SLA states visible on service requests, work items, and projects.
- Add evidence bundle generation.
- Add compliance rule health and violation workflows.
- Make audit trail accessible and filterable.
- Add admin controls for retention, DLP, external sharing, and data export.

## Acceptance Criteria
- SLA breach risk is calculated and visible.
- Compliance violations have owner/status/due date.
- Evidence package can be generated for selected project/customer/time range.
- Audit logs include actor, action, object, workspace, timestamp, source IP/session where available.
- External sharing is logged.
- Compliance/security views are tenant-scoped.

---

# EPIC 19 — Automation Builder and bSmart Agents

## What
Make bSmart proactive through no-code automations and safe AI agents.

## Why
A work OS should move work forward, not just store it.

## Where
- `works-frontend/src/components/works/organisms/automations-panel.jsx`
- `works-frontend/src/views/ai-studio-view.jsx`
- `works-backend/src/main/java/com/bcits/works/AutomationController.java`
- `AutomationService.java`
- `AdvancedAiController.java`
- `AiControlPlaneService.java`

## How
Automation model:
- Trigger → Condition → Action

Agents:
- SLA Risk Agent
- Project Status Agent
- RCA Agent
- Customer Update Agent
- Backlog Grooming Agent
- Release Readiness Agent
- DevSync Summary Agent
- Message Action Extraction Agent

Safe workflow:
- Draft → Review → Approve → Publish

## Acceptance Criteria
- Admin can create/test/enable/disable automation.
- Every automation run is logged.
- Failed runs are visible.
- Agents produce drafts by default.
- Agent output includes sources/confidence.
- Users can approve/reject/edit agent outputs.
- No automation bypasses RBAC.

---

# EPIC 20 — Reports, Dashboards, BQL, and Leadership Intelligence

## What
Make reporting executive-ready, accurate, and source-backed.

## Why
Leadership needs truthful status, not noisy dashboards.

## Where
- `works-frontend/src/views/reports-view.jsx`
- `dashboards-view.jsx`
- `reportbuilder-view.jsx`
- `bql-view.jsx`
- `leadership-console-view.jsx`
- `works-backend/src/main/java/com/bcits/works/ReportController.java`
- `ReportScheduleController.java`
- `DashboardController.java`
- `DashboardService.java`
- `BqlController.java`
- `BqlCompiler.java`
- `ExecutiveBriefingController.java`

## How
- Fix scoping first.
- Build source-backed executive summaries.
- Improve report builder UX.
- Use BQL as power-user layer, not normal-user dependency.
- Add scheduled report delivery.
- Add export quality improvements.

## Acceptance Criteria
- Dashboard data is workspace-scoped.
- Reports show data freshness.
- Executive summaries cite sources.
- BQL validates permissions and workspace scope.
- Report builder supports templates.
- Scheduled reports are logged and retryable.
- Exports render cleanly in PDF/DOCX/CSV.

---

# EPIC 21 — Integrations, Migration, and Platform APIs

## What
Connect bSmart with external tools and provide migration paths.

## Why
Users already have work in Jira, Azure DevOps, GitHub, GitLab, Confluence, SharePoint, Office, Excel, MS Project, email, and WhatsApp.

## Where
- `works-frontend/src/components/works/organisms/integrations-panel.jsx`
- `works-backend/src/main/java/com/bcits/works/IntegrationController.java`
- `SyncController.java`
- `WebhookController.java`
- `ApiTokenController.java`
- `OAuthCallbackController.java`
- `DeveloperPortalController.java`

## How
Prioritize:
1. GitHub/GitLab/Azure DevOps for DevSync
2. Jira/Azure DevOps work import/sync
3. Confluence/SharePoint/Office document search/import
4. Excel/MS Project import/export
5. Email/WhatsApp customer communication
6. MCP/API platform for external AI tools

## Acceptance Criteria
- Admin can connect/disconnect integrations.
- OAuth/token storage is encrypted and audited.
- Sync jobs are observable and retryable.
- Imported records keep source links.
- Users can map fields/statuses.
- Unmapped import errors are visible and fixable.
- API tokens have scope, expiry, audit, and revocation.

---

# EPIC 22 — People Graph, Skills, Stakeholders, and Customer Intelligence

## What
Build a professional people and stakeholder layer inspired by LinkedIn and enterprise CRM.

## Why
Work depends on knowing who owns what, who can help, who is overloaded, and who the customer stakeholders are.

## Where
- `works-backend/src/main/java/com/bcits/works/UserController.java`
- `TeamController.java`
- `StakeholderController.java`
- `StakeholderCommunicationController.java`
- `CustomerAccountController.java`
- `works-frontend/src/views/account-view.jsx`
- `projects-view.jsx`
- `workspace-view.jsx`

## How
Add:
- people profile
- role/team/project membership
- skills/expertise
- workload summary
- availability/presence
- customer stakeholder map
- escalation chain
- recent contributions

## Acceptance Criteria
- User profile shows role, team, projects, skills, availability.
- Customer account shows contacts, decision makers, commitments, escalations.
- Workload indicators are fair and not surveillance-based.
- Users can search by skill/expertise.
- Stakeholders link to projects, service requests, decisions, and communications.

---

# EPIC 23 — Onboarding, Templates, and Guided Adoption

## What
Make the product easy to adopt with guided setup and templates.

## Why
A powerful app can feel overwhelming unless onboarding creates fast value.

## Where
- `works-frontend/src/views/onboarding-wizard.jsx`
- `works-backend/src/main/java/com/bcits/works/OnboardingController.java`
- `WorkspaceSetupController.java`
- migration `V93__onboarding_wizard_templates.sql`
- `DocumentTemplateController.java`

## How
Add templates for:
- smart meter rollout
- billing integration
- outage/incident response
- regulatory compliance
- customer SLA desk
- software delivery
- data migration
- release management

## Acceptance Criteria
- New workspace setup can be completed in under 10 minutes.
- User can choose a template and get projects/workflows/SLA/docs preconfigured.
- Empty states guide users to next action.
- Sample data can be enabled/disabled.
- Onboarding progress is saved.
- Admin can customize templates.

---

# EPIC 24 — Mobile, PWA, Offline, Realtime, and Smoothness

## What
Make the app feel fast, live, and resilient.

## Why
Premium experience depends on smoothness and reliability, not only visual design.

## Where
- `works-frontend/src/lib/realtime.js`
- `works-frontend/src/lib/offline-*` if present
- `works-frontend/src/components/works/organisms/offline-banner.jsx`
- `presence-bar.jsx`
- `works-backend/src/main/java/com/bcits/works/RealtimeController.java`
- `PushSubscriptionController.java`
- `PushPreferenceController.java`

## How
- Stabilize SSE/realtime auth.
- Add reconnection/backoff.
- Improve offline drafts.
- Add optimistic updates where safe.
- Add push notifications with preferences.
- Improve mobile responsive layouts.

## Acceptance Criteria
- Realtime stream reconnects without duplicate events.
- Offline banner accurately reflects state.
- Offline drafts sync safely without data loss.
- Presence is visible and not noisy.
- Mobile layout supports Today, Inbox, Messages, Work item, Project.
- Push respects user notification preferences.

---

# EPIC 25 — Reliability, Testing, Accessibility, Performance, and Quality Gates

## What
Turn reliability into a product feature.

## Why
A premium product must be accurate, accessible, fast, and dependable.

## Where
- `works-backend/src/test/*`
- `works-frontend/src/**/*.test.*`
- `works-frontend/src/test/a11y.js`
- `.github/workflows/*`
- `scripts/*`
- `tests/*`

## How
Add gates for:
- tenant isolation
- RBAC
- API contract drift
- OpenAPI frontend endpoint matching
- frontend raw fetch usage
- raw design tokens
- a11y
- Playwright smoke flows
- performance budget
- AI fallback telemetry

## Acceptance Criteria
- CI fails on frontend calls to nonexistent backend endpoints.
- CI fails on new production `WS-001` fallbacks.
- CI fails on unsafe workspace-unscoped risky queries.
- Playwright covers login, Today, Inbox, Messages, Work item, Project, Service request.
- Core screens pass axe checks.
- Bundle budget is enforced.
- Error boundaries cover major routes.
- AI fallback rate is visible.

---

# EPIC 26 — Product Analytics, Feedback, and Healthy Engagement Hooks

## What
Add analytics that measure product value and healthy engagement.

## Why
The product should become habit-forming through clarity, speed, relief, and usefulness—not dark patterns.

## Where
- `FunnelMetricsController.java`
- `HeartMetricsController.java`
- `ObservabilityController.java`
- `works-frontend/src/components/works/organisms/performance-panel.jsx`
- dashboards/reporting modules

## How
Track:
- activation
- time to first project
- time to first work item
- Today usage
- Inbox completion
- message-to-task conversions
- AI summaries used
- DevSync linkage rate
- SLA risk reduction
- report generation
- customer response time

## Acceptance Criteria
- Product analytics respect privacy and tenant boundaries.
- Admin can view activation funnel.
- Team leads can see workflow bottlenecks.
- Users can submit contextual feedback.
- Analytics do not rank individuals unfairly.
- Metrics focus on outcomes and flow, not vanity counts.

---

# EPIC 27 — Developer Experience and Agent-Ready Implementation System

## What
Make the repo easier for Codex/Claude Code/developers to safely modify.

## Why
The project is large; agentic coding will work only if tasks, constraints, boundaries, and tests are explicit.

## Where
- `CLAUDE.md`
- `AGENTS.md`
- `ai-rules/*`
- `.cursor/*`
- `.claude/*`
- `scripts/*`
- `docs/*`

## How
- Add implementation playbooks per epic.
- Add file ownership map.
- Add safe refactor rules.
- Add API contract generation instructions.
- Add test commands per module.
- Add anti-pattern list: raw fetch, hardcoded workspace, unscoped query, silent AI fallback, inline active attachments.

## Acceptance Criteria
- Coding agents can pick an epic and know exact files, constraints, and tests.
- Repo has a `docs/implementation/` folder with epic task specs.
- Every major feature has acceptance tests or test plan.
- Guardrails block known dangerous regressions.
- Agent prompts do not rely on stale documentation.

---

# Recommended Implementation Sequence

## Phase 1 — Safety and Truth
- EPIC 0
- EPIC 1
- EPIC 2
- EPIC 25 partial

## Phase 2 — Architecture and Premium Shell
- EPIC 3
- EPIC 4
- EPIC 5
- EPIC 6

## Phase 3 — Daily Habit Core
- EPIC 7
- EPIC 8
- EPIC 9

## Phase 4 — Execution Core
- EPIC 10
- EPIC 11
- EPIC 12

## Phase 5 — Intelligence Layer
- EPIC 13
- EPIC 14
- EPIC 15

## Phase 6 — Enterprise Depth
- EPIC 16
- EPIC 17
- EPIC 18
- EPIC 19
- EPIC 20

## Phase 7 — Ecosystem, Adoption, and Scale
- EPIC 21
- EPIC 22
- EPIC 23
- EPIC 24
- EPIC 26
- EPIC 27

# Immediate Top 30 Tickets

1. Fix backend Dockerfile jar copy pattern.
2. Add production JWT secret validation.
3. Disable dev verification token exposure outside dev.
4. Restrict query-param JWT auth to realtime SSE.
5. Fix starred work-item tenant leak.
6. Add tests for starred cross-tenant protection.
7. Add RBAC to SCIM token issuance.
8. Add tests for SCIM permission enforcement.
9. Fix FieldLayoutController project/workspace bug.
10. Remove production `WS-001` fallbacks from controllers.
11. Replace frontend live `WS-001` usage with active workspace.
12. Workspace-scope DashboardController and DashboardService.
13. Remove dashboard `userId` trust; use authenticated user.
14. Add dashboard tenant isolation tests.
15. Align frontend `ai-assist.js` with backend AI endpoints.
16. Add OpenAPI/frontend endpoint contract check.
17. Harden attachment MIME detection.
18. Force attachment disposition for active content.
19. Make ClamAV production behavior fail closed or explicitly policy-controlled.
20. Refresh README and TECH-DEBT.
21. Split `App.jsx` into `AppShell`, `AuthGate`, `WorkspaceProvider`, `RouteRenderer`.
22. Simplify navigation to Today, Inbox, Messages, Work, Projects, Knowledge, Reports, More.
23. Establish premium design tokens and strict usage guardrails.
24. Build Today V1 with role-specific cards.
25. Build Smart Inbox V1.
26. Build Messages V1 using generalized conversations.
27. Redesign work item detail right context panel.
28. Build project command center V1.
29. Build DevSync raw event ingestion schema.
30. Build Answer Engine V1 with sourced answers.

# Final Product Principle

Do less on screen, but make every visible thing more useful, accurate, beautiful, and actionable.

The product should feel:

- simple like WhatsApp
- flexible like Notion
- intelligent like ChatGPT
- productive like Claude Canvas
- trustworthy like Perplexity
- execution-ready like Jira/Azure DevOps
- engineering-aware like GitHub/GitLab
- enterprise-ready like Microsoft 365/SharePoint
- professionally human like LinkedIn

The final direction: build the AI-native command center for how BCITS and enterprise teams actually work.
