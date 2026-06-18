# bSmart Works V1.6 — Claude Code / OpenAI Codex Execution Roadmap

**Roadmap name:** bSmart Works V1.6  
**Product:** bSmart Works  
**Source inputs:** Current MVP ZIP, bSmart Works V1.5 roadmap, and full conversation feedback.  
**Purpose:** Convert the broad MVP into a minimal, premium, simple yet powerful, team-first, framework-aware, BQL-filter-powered, work-conversation-native platform that is configurable from UI by Admin and Owner.  
**Execution mode:** This document is written for autonomous execution by Claude Code / OpenAI Codex. It must be implemented incrementally, with tests, migrations, docs, and guardrails.

---

## 0. Non-Negotiable Agent Contract

You are an implementation agent working inside the `bsmart-works-main` repository. Execute this roadmap safely and incrementally.

### 0.1 Before coding

```bash
git checkout main
git pull origin main
git checkout -b feature/bsmart-works-v1-6-roadmap
```

Read these files first:

```text
AGENTS.md
CLAUDE.md
.github/copilot-instructions.md
.github/instructions/backend.instructions.md
.github/instructions/frontend.instructions.md
.github/instructions/product.instructions.md
.github/instructions/governance.instructions.md
docs/brand/brand-and-identity.md
docs/BQL-IMPROVEMENTS.md
docs/UIUX-EXECUTION-PLAN.md
docs/UIUX-BENCHMARK-ROADMAP.md
docs/implementation/BSMART-TRANSFORMATION-ROADMAP.md
docs/architecture/ADR-0001-service-decomposition.md
```

Run baseline checks:

```bash
npm run guardrails
npm run ai-rules:check
npm run premium-bar
npm run uiux:e2e-scope
cd works-frontend && npm run lint && npm run test && npm run build
cd ../works-backend && ./mvnw test
```

If any command cannot run because of environment limitations, document the exact command, error, and reason in the roadmap state file. Do not hide failures.

### 0.2 Current baseline observed from uploaded ZIP

The reviewed ZIP contains:

```text
Backend: Java 21, Spring Boot 4.1.0, Maven, PostgreSQL/Flyway
Frontend: React 19.2, Vite 8, Tailwind 4, React Query, Vitest, Playwright, Storybook
Latest observed Flyway migration: V109__article_stale.sql
Backend Java files: 657
Frontend src files: 609
App.jsx size: ~4,590 lines
Guardrails: blocking checks pass; two baseline non-blocking frontend debts remain
```

Observed repo hygiene issues to address:

```text
Root node_modules/ exists in ZIP and should not be committed/distributed as source.
works-backend.zip exists inside repo ZIP and should not be committed/distributed as source.
ai-rules.zip exists inside repo ZIP and should not be committed/distributed as source.
backend-err.log exists and should be excluded from source artifacts.
README says Spring Boot 4.0.x while pom.xml uses Spring Boot 4.1.0.
README says Flyway high-water V65 while migrations go through V109.
```

### 0.3 Implementation rules

- Do not perform a premature microservices split. First build a clean modular monolith with API-first internal boundaries.
- Use additive Flyway migrations. New migrations should start at the next available version after checking the current branch. The uploaded baseline ends at `V109`, so likely start at `V110`.
- Do not hardcode framework behavior, permission models, work type policies, or critical rules directly into scattered UI/controller code.
- Seed defaults for Scrum, Kanban, Waterfall, Lean, DSDM, and XP, then make them configurable from Admin Studio by Admin and Owner.
- Backend must remain the final authority. Frontend hiding is not authorization.
- Every new API must enforce workspace/tenant scoping.
- Every new feature must handle loading, empty, error, success, and permission states.
- Use existing design-system components before adding new components.
- Avoid raw hex colors and arbitrary spacing. Use design tokens.
- Do not introduce broad lint suppressions.
- Do not reuse customer support chat as internal work messaging. bSmart Messenger must be a separate domain.
- Preserve existing behavior unless this roadmap explicitly replaces it.
- Ordinary users must see a minimal experience. Admin/Owner may access advanced configuration.

### 0.4 Definition of done for every epic

Each epic is done only when:

```text
Backend model/API/service changes are implemented.
Frontend UX is implemented with reusable components.
Tests are added or updated.
Migrations are safe.
Accessibility basics are covered.
Guardrails and relevant tests pass.
Docs are updated.
No tenant/workspace isolation regression is introduced.
No new broad lint or architecture debt is introduced.
```

---

# 1. Product North Star for V1.6

bSmart Works V1.6 must feel like:

> A minimal, premium work operating system where teams choose how they work, every work item has a meaningful team key, every user sees only the right capabilities, every board can be powered by BQL, every rule can be configured safely by Admin/Owner, and every work conversation can become action, decision, risk, or progress.

The product must be:

```text
Team-first
Framework-aware
BQL-filter-powered
Role-simplified
Admin/Owner-configurable
Work-conversation-native
AI-assisted but not AI-dependent
Minimal for users, powerful for admins
Premium in look, language, motion, and behavior
API-first and ready for future microservices
```

---

# 2. What Has Been Partially Implemented — Current State vs Target State

This section is mandatory. Claude Code/Codex must not skip it. Every implementation epic below is grounded in these observed partial implementations.

## 2.1 App shell, navigation, and role/lens system

### Current state

Observed files:

```text
works-frontend/src/App.jsx
works-frontend/src/lib/nav-model.js
works-frontend/src/components/works/organisms/mode-rail.jsx
works-frontend/src/components/works/organisms/sub-rail.jsx
works-frontend/src/components/works/organisms/command-palette.jsx
works-frontend/src/components/works/organisms/ai-command-bar.jsx
```

`App.jsx` is still a large orchestration file of around 4,590 lines. It starts with a baseline-debt lint suppression. The nav model already has modes such as Home, Deliver, Insight, Service, Know, Extend, and Setup. It also has role/lens concepts such as Developer, Sprint Cockpit, PO Workspace, Leadership, and Admin Ops.

### Gap

The shell is functional but too broad and heavy. It exposes too many surfaces and relies too much on App-level state. The product feels like a feature directory instead of a calm, role-aware workspace.

### Target function

The shell must become a focused product cockpit:

```text
Today — personal focus and next best actions
Work — team boards, work items, backlog/timebox/sprint where supported
Knowledge — articles, decisions, lessons, templates
Insights — reports, dashboards, executive brief, health
Admin Studio — operating model, permissions, fields, workflows, AI, integrations, security
Messages — bSmart Messenger, contextual and work-linked
```

### Target behavior

- Navigation adapts by user type, team, framework, and policy.
- Unsupported surfaces are not shown.
- Backend rejects unsupported actions even if the route is forced.
- Command palette becomes the power-user path.
- App shell should not own feature-specific data logic.

### Target feel and look

It should feel calm, minimal, premium, and guided. Users should see what matters now, not every possible module.

---

## 2.2 Logo and brand system

### Current state

Observed files:

```text
works-frontend/src/components/works/logo.jsx
works-frontend/public/logo-primary.svg
works-frontend/public/logo-reverse.svg
works-frontend/public/logo-icon.svg
docs/brand/brand-and-identity.md
```

The logo component already supports basic variants: icon, reverse, mono, and default composed lockup.

### Gap

Brand placement is not yet a complete design-system behavior. The logo is not yet governed by context-specific placement rules across login, onboarding, app shell, collapsed nav, customer portal, reports, PDFs, emails, PWA, and tenant-branded areas.

### Target function

Create a polished brand placement system:

```text
Full horizontal logo
Compact icon-only logo
Reverse logo
Monochrome export logo
Tenant-branded portal/logo zone
```

### Target behavior

- Logo variant is chosen by context, not manually guessed.
- Logo never stretches, crowds, or loses contrast.
- Customer portal can show tenant logo with “Powered by bSmart Works.”
- Reports and exports use print-safe mono logo.

### Target feel and look

Premium, enterprise-grade, clean, not playful, not cramped.

---

## 2.3 Profile and preference settings from user DP

### Current state

Observed file:

```text
works-frontend/src/components/works/organisms/user-menu.jsx
```

The user menu currently has avatar initials, identity, role, “My account,” theme toggle, and sign out. Notification preferences and push preferences exist partially in backend.

### Gap

Clicking the DP does not open a complete profile and preference center. Personal settings are scattered across account, theme, push preferences, local state, and settings areas.

### Target function

Clicking DP must open:

```text
Profile & Preferences
├── Account
├── Appearance
├── Locale & Time
├── Notifications
├── Work Preferences
├── AI Preferences
├── Security
├── Accessibility
└── Integrations
```

### Target behavior

- Opens as right-side drawer or focused modal.
- Preferences persist on backend.
- Workspace policy can lock or override specific preference fields.
- Security-sensitive settings require proper flows.
- All categories show clear saved/error/loading states.

### Target feel and look

The user should feel in control:

> “Everything about how bSmart Works feels and notifies me is in one clean place.”

---

## 2.4 Onboarding and team creation

### Current state

Observed files:

```text
works-frontend/src/views/onboarding-wizard.jsx
works-backend/src/main/java/com/bcits/works/OnboardingController.java
works-backend/src/main/java/com/bcits/works/OnboardingPlaybookService.java
works-backend/src/main/java/com/bcits/works/Team.java
works-backend/src/main/java/com/bcits/works/TeamController.java
works-backend/src/main/java/com/bcits/works/TeamService.java
```

The onboarding wizard currently focuses on selecting a workflow template and completing a checklist. Templates include Scrum, Kanban, Bug, and RAID style options. Team exists but is lightweight: name, description, workspaceId, and projectIds JSON.

### Gap

Onboarding does not create a team as the primary operating unit. It does not require a team key, does not assign framework behavior at team level, and does not create team-key-based work item IDs.

### Target function

Onboarding must create a team like Jira project creation:

```text
Create Team
Choose Team Key
Choose Framework
Choose Work Types
Invite Members
Create Default Board
Review Setup
Land on Team Workspace
```

### Target behavior

- Team key is validated live.
- Team key generates work item display IDs like `PLAT-1`.
- Framework selection controls actual product behavior.
- Onboarding creates default board, workflow, and team policy from seed defaults.
- Admin/Owner can later customize the operating model from UI.

### Target feel and look

Guided and confidence-building:

> “Great. Your team key will make every work item easy to recognize.”

> “This framework shapes the boards, metrics, and ceremonies your team sees.”

---

## 2.5 Framework behavior

### Current state

The repo has Scrum/Kanban concepts in docs and UI, sprint/backlog/board code, WIP limits, and role surfaces such as Sprint Cockpit. However, there is no central delivery framework policy engine for Scrum, Kanban, Waterfall, Lean, DSDM, and XP.

### Gap

Framework behavior is not centrally enforced. Kanban can still see sprint surfaces if navigation allows it. Waterfall does not have phase/gate behavior. DSDM and XP are not modeled as intelligent operating frameworks.

### Target function

A team’s selected framework must control:

```text
Navigation surfaces
Allowed work item types
Backlog behavior
Sprint/timebox/phase behavior
Board behavior
Metrics
Reports
Ceremonies
Workflows
Required fields
Automation triggers
Permission exceptions
```

### Target behavior

- Scrum enables sprint planning, active sprint, burndown, velocity.
- Kanban disables Scrum sprint behavior and enables WIP/flow/cycle time.
- Waterfall disables sprint behavior and enables phase/gate/milestone/baseline/approval flows.
- Lean emphasizes WIP, waste reduction, improvement, cycle time.
- DSDM enables timeboxes, MoSCoW, governance gates.
- XP enables iterations, stories, tests, engineering practice checklist.
- All framework rules are seed defaults and must be configurable from Admin Studio by Admin/Owner.

### Target feel and look

The product should feel intelligent:

> “This team uses Kanban, so sprint planning is not shown. Use WIP limits and flow metrics instead.”

---

## 2.6 User types and permission model

### Current state

Observed files:

```text
works-backend/src/main/java/com/bcits/works/RbacService.java
works-frontend/src/lib/nav-model.js
works-frontend/src/views/settings3/permissions-settings.jsx
```

The current RBAC model uses tier-style roles: VIEWER, MEMBER, LEAD, ADMIN, OWNER. Frontend nav mirrors tier visibility. Settings include permissions. Product lenses separately include developer, scrum master, product owner, leadership, and admin.

### Gap

User type, permission tier, team role, framework role, and experience lens are mixed. The requested product model needs only five user types.

### Target function

Expose only these five core user types:

```text
Individual
Team Lead
Management
Admin
Owner
```

### Target behavior

- User type drives permission responsibility.
- Team role and framework role are separate.
- Product lens is a UX preference, not a permission identity.
- Any user type can be assigned to work if policy allows it.
- Admin/Owner can configure permission policies from UI.

### Target feel and look

Simple, understandable, business-friendly:

> “You are Management in this workspace and Reviewer in this Waterfall team.”

---

## 2.7 Work item IDs and work type behavior

### Current state

Observed files:

```text
works-backend/src/main/java/com/bcits/works/WorkItem.java
works-backend/src/main/java/com/bcits/works/WorkItemController.java
works-backend/src/main/java/com/bcits/works/DefaultWorkItemTypes.java
works-backend/src/main/java/com/bcits/works/WorkItemTypeConfig.java
```

WorkItem has `autoId` and internally generates type-prefix IDs like `EP-0001` through `work_item_counters`. It also has a UUID-like internal ID based on project prefix and random suffix.

### Gap

The user-facing work item ID is not tied to Team key. Work type policy is not controlled by user type + framework + team policy.

### Target function

Add team-key-based display IDs:

```text
Team: Platform Engineering
Key: PLAT
Work items: PLAT-1, PLAT-2, PLAT-3
```

### Target behavior

- Keep internal ID for database stability.
- Add `teamId` and `displayKey` for user-facing identity.
- Use `displayKey` across cards, links, search, BQL, reports, messages, exports.
- Work type creation and assignment are controlled by operating model policy.

### Target feel and look

Work should become easy to reference in meetings and messages:

> “Let’s close PLAT-42 today.”

---

## 2.8 BQL and saved views

### Current state

Observed files:

```text
works-backend/src/main/java/com/bcits/works/BqlController.java
works-backend/src/main/java/com/bcits/works/BqlExecutionService.java
works-backend/src/main/java/com/bcits/works/BqlCompiler.java
works-backend/src/main/java/com/bcits/works/SavedView.java
works-backend/src/main/java/com/bcits/works/SavedViewController.java
works-frontend/src/views/bql-view.jsx
works-frontend/src/views/bql-results-table.jsx
```

The BQL engine is strong. It supports execute, validate, schema, group, saved views, audit, and natural language to BQL. However, the topbar BQL button still navigates to the BQL page.

### Gap

BQL is currently treated as a destination. It should behave like Jira filters applied to the current surface.

### Target function

BQL becomes an inline filter layer:

```text
Open BQL drawer
Type/build query
Apply to current board/list/backlog/dashboard
Save filter
Save as board
Share/pin/subscribe
```

### Target behavior

- Topbar BQL click opens a drawer/popover, not a page.
- Full BQL Lab remains for advanced usage.
- SavedView can be reused or extended rather than creating duplicate saved filter concepts.
- BQL-powered boards become dynamic query boards.

### Target feel and look

It should feel like:

> “Filter this view intelligently.”

Not:

> “Go to a technical query page.”

---

## 2.9 Boards

### Current state

Observed files:

```text
works-backend/src/main/java/com/bcits/works/BoardController.java
works-backend/src/main/java/com/bcits/works/BoardWipLimitService.java
works-frontend/src/views/board-view.jsx
```

BoardController mainly manages workspace-scoped WIP limits. BoardView renders kanban-style columns, filters, grouping, bulk edit, virtual card stack, WIP badges, and card field preferences.

### Gap

There is no persisted dynamic board model driven by BQL. Large teams cannot create multiple focused boards from query results.

### Target function

Add query-powered boards:

```text
Frontend Squad Board: component = Frontend AND team = PLAT
Backend Squad Board: component = Backend AND team = PLAT
Production Defects: type = Bug AND severity in (Critical, High)
Leadership Review: type in (Risk, Decision, Dependency) AND status != Closed
```

### Target behavior

- Board content updates dynamically as BQL results change.
- Board type, columns, swimlanes, visibility, and permissions are configurable.
- Framework determines sensible defaults.

### Target feel and look

Large teams can split work calmly without duplicating work items.

---

## 2.10 bSmart Messenger

### Current state

Observed files:

```text
works-backend/src/main/java/com/bcits/works/ChatConversation.java
works-backend/src/main/java/com/bcits/works/ChatMessage.java
works-backend/src/main/java/com/bcits/works/SupportChatService.java
works-backend/src/main/java/com/bcits/works/SupportChatAgentController.java
works-backend/src/main/java/com/bcits/works/SupportChatPortalController.java
works-frontend/src/components/works/organisms/support-chat-widget.jsx
```

Customer support chat exists and is explicitly customer-portal oriented with AI tier-1 support and escalation.

### Gap

There is no internal work-contextual messaging system like LinkedIn/WhatsApp/Telegram patterns adapted for work.

### Target function

Create **bSmart Messenger**, separate from customer support chat.

Supported thread types:

```text
Direct message
Team room
Work item thread
Board discussion
Decision thread
Risk thread
Incident/war room
Announcement
Approval discussion
Knowledge article discussion
```

### Target behavior

- Conversations are tied to work context wherever possible.
- Messages can convert to task, action item, decision, risk, or meeting note.
- Mentions generate notifications.
- Work item detail has discussion tab.
- Topbar shows unread badge.
- AI can summarize threads when enabled, but messenger works without AI.

### Target feel and look

Familiar but professional:

> “No discussion yet. Start a focused work conversation with your team.”

Not social/noisy. No vanity mechanics, stories, follower counts, reels, or gossip feed.

---

## 2.11 Admin Studio, customization, and configurability

### Current state

Observed files:

```text
works-frontend/src/views/settings3-view.jsx
works-frontend/src/views/settings3/*
works-backend/src/main/java/com/bcits/works/ConfigController.java
works-backend/src/main/java/com/bcits/works/ConfigSandboxController.java
works-backend/src/main/java/com/bcits/works/ConfigTemplateController.java
works-backend/src/main/java/com/bcits/works/StatusConfigController.java
works-backend/src/main/java/com/bcits/works/TypeFieldPrefController.java
works-backend/src/main/java/com/bcits/works/WorkflowController.java
```

Settings already include workflows, status management, custom fields, field layout, visibility, permissions, item types, type fields, and detail fields.

### Gap

Admin Studio is not yet a single operating model control center. Framework behavior, permission model, critical rules, work type policies, and board policies need UI-based configuration by Admin/Owner.

### Target function

Admin Studio must configure:

```text
Framework behavior matrix
Permission model
Critical operating rules
Work type policies
Fields and layouts
Workflows and statuses
BQL/board policies
Messenger policies
AI policies
Branding
Security
Integrations
Preview, publish, rollback, audit
```

### Target behavior

- Admin/Owner can configure and preview policy impact.
- Policy changes are versioned and audited.
- Ordinary users see only resulting behavior.
- Seed defaults are restorable.

### Target feel and look

Powerful but safe:

> “Preview as Team Lead before publishing.”

> “This change affects 3 teams and 2 workflows. Rollback is available.”

---

## 2.12 AI control plane and AI assistance

### Current state

Observed classes include AI control plane, AI assist, AI workspace settings, deterministic provider, Anthropic provider, AI budget, cache, memory, and policies.

### Gap

AI exists, but the product needs a consistent “work coach” layer across Today, work item detail, BQL, onboarding, dashboards, messenger, and executive brief.

### Target function

AI actions must be short, contextual, safe, and useful:

```text
Suggest next best action
Summarize work item
Draft acceptance criteria
Summarize messenger thread
Extract decisions/action items/risks
Generate executive brief
Explain blockers
Create BQL from plain English
Suggest framework-safe workflow improvements
```

### Target behavior

- AI must respect admin policy and budget.
- Deterministic fallback must always preserve workflow.
- AI suggestions should not become required to use product.

### Target feel and look

Encouraging, not robotic:

> “AI is currently offline, but your workflow still works. I’ll use the standard template for now.”

---

## 2.13 Knowledge, service desk, SLA, and reporting

### Current state

The MVP contains advanced knowledge base, service desk, SLA, customer portal, support inbox, dashboards, reports, report builder, compliance, and performance surfaces.

### Gap

These features are substantial but too broad for an MVP first impression. They need simplification, role-aware packaging, and clearer positive microcopy.

### Target function

- Knowledge should focus on create, find, trust, and refresh.
- Service portal should reassure customers with timelines and SLA expectations.
- Insights should produce practical summaries, not only charts.
- Executive brief should be one-click and factual.

### Target feel and look

Calm, trusted, clear:

> “This article helped 8 people this month.”

> “Expected first response: today by 4:00 PM.”

> “Workspace health: 82/100 — stable. Main opportunity: reduce aging in-progress work.”

---

# 3. V1.6 Roadmap Overview

Implement in this order:

```text
Epic 0  — Source cleanup, docs alignment, baseline tests
Epic 1  — App shell simplification and feature architecture
Epic 2  — Brand/logo placement system
Epic 3  — Profile & Preference Center
Epic 4  — Team-first onboarding and Team Workspace
Epic 5  — Five user types and configurable permission model
Epic 6  — Admin Studio Operating Model Center
Epic 7  — Framework policy engine and configurable behavior matrix
Epic 8  — Work type policy and assignment rules
Epic 9  — Team-key-based work item display IDs
Epic 10 — BQL inline filters like Jira filters
Epic 11 — BQL-powered dynamic boards
Epic 12 — bSmart Messenger MVP
Epic 13 — Messenger intelligence and work artifact conversion
Epic 14 — Premium UX, microcopy, positive states, next best actions
Epic 15 — AI work coach and executive brief
Epic 16 — Knowledge, service desk, SLA, and reporting refinement
Epic 17 — API-first modular monolith and future microservices path
Epic 18 — Performance, observability, and scalability
Epic 19 — Validation, E2E smoke tests, docs, and final hardening
```

---

# EPIC 0 — Source Cleanup, Docs Alignment, and Baseline Tests

## Goal

Make the repository safe for V1.6 implementation by cleaning source artifacts, aligning docs, and protecting existing behavior.

## Tasks

### 0.1 Add roadmap files

Create:

```text
docs/implementation/BSMART-WORKS-V1-6-ROADMAP.md
docs/implementation/BSMART-WORKS-V1-6-ROADMAP-STATE.md
```

State file template:

```markdown
# bSmart Works V1.6 Roadmap State

| Epic | Status | Branch/Commit | Tests | Notes |
|---|---|---|---|---|
| Epic 0 | Not Started | | | |
| Epic 1 | Not Started | | | |
```

### 0.2 Clean source package artifacts

Remove from source control if tracked:

```text
node_modules/
works-backend.zip
ai-rules.zip
backend-err.log
local logs
binary tools that should be downloaded by setup scripts
```

Update `.gitignore` where needed.

### 0.3 Update stale docs

Update README and docs to match baseline:

```text
Spring Boot 4.1.0, not 4.0.x
Flyway high-water V109 or current branch head, not V65
React 19.2 and Vite 8 baseline
```

Mark superseded documents clearly instead of deleting useful historical docs.

### 0.4 Add characterization tests before behavior changes

Add or verify tests for:

```text
User menu opens and calls settings callback
BQL page still executes query
Topbar BQL current behavior is captured before changing it
Team create/list works
Work item create works with existing autoId behavior
Board renders current columns and filters
Onboarding wizard renders template/checklist flow
Support chat customer flow remains separate
Settings3 permissions/status/workflow tabs render
Logo variants render
```

## Acceptance criteria

- Roadmap/state files exist.
- Stale README values are corrected.
- Generated artifacts are removed or ignored.
- Baseline tests exist or gaps are documented.
- No product behavior changed yet.

---

# EPIC 1 — App Shell Simplification and Feature Architecture

## Goal

Reduce product complexity by turning the app shell into a routing/provider/layout layer and moving feature logic into feature folders.

## Current issue

`App.jsx` is too large and owns too much state, navigation logic, BQL state, modal state, and feature data flow.

## Target structure

```text
works-frontend/src/
  app/
    app-shell.jsx
    routes.jsx
    providers.jsx
    global-overlays.jsx
  features/
    profile/
    onboarding/
    teams/
    framework/
    permissions/
    operating-model/
    bql/
    boards/
    messenger/
    work/
    knowledge/
    service/
    insights/
    ai/
  components/works/
  lib/
    api/
    auth/
    permissions/
    telemetry/
```

## Tasks

1. Extract global providers from `App.jsx`.
2. Extract topbar actions into a topbar feature module.
3. Extract BQL state from `App.jsx` into `features/bql`.
4. Extract create/edit work item orchestration into `features/work`.
5. Replace new feature state with React Query where appropriate.
6. Create shared shell primitives:

```text
Page
PageHeader
EntityDrawer
ContextPanel
ActionBar
InlineAlert
EmptyState
ErrorState
SuccessToast
PermissionState
FeatureUnavailableState
```

## Minimal navigation target

Primary product modes:

```text
Today
Work
Messages
Knowledge
Insights
Admin Studio
```

Secondary surfaces should be contextual or command-palette reachable.

## Acceptance criteria

- New V1.6 code is not added directly into the App.jsx monolith unless unavoidable.
- App shell starts shrinking through safe extractions.
- Navigation is simpler and grouped by user need.
- Existing routes still work.
- New feature folders are created for V1.6 features.

---

# EPIC 2 — Brand and Logo Placement System

## Goal

Make the bSmart Works brand feel premium and consistent everywhere.

## Required logo API

Upgrade `Logo` component to support:

```jsx
<Logo variant="primary" size="md" context="login" />
<Logo variant="reverse" size="sm" context="topbar" />
<Logo variant="icon" size="xs" context="collapsed-nav" />
<Logo variant="mono" size="sm" context="export" />
<Logo variant="tenant" size="md" context="customer-portal" tenantLogoUrl={...} />
```

## Required placements

| Surface | Logo behavior |
|---|---|
| Login | Full primary logo, premium spacing |
| Onboarding | Full primary logo at top |
| App topbar | Compact or reverse logo |
| Collapsed nav | Icon only |
| Customer portal | Tenant logo + Powered by bSmart Works |
| Reports/PDF/export | Monochrome safe logo |
| Email templates | Small horizontal logo |
| PWA/favicon | Icon only |

## Tasks

1. Add context-aware logo component props.
2. Add alt text and ARIA behavior.
3. Update login, onboarding, shell, portal, exports, report headers, and email templates.
4. Add component tests and Storybook stories.
5. Ensure no raw hex colors are introduced.

## Acceptance criteria

- Logo placement is consistent and not stretched or crowded.
- All critical entry points use correct logo variant.
- Customer portal respects tenant-first branding.
- Export/report logos remain print-safe.

---

# EPIC 3 — Profile & Preference Center from User DP

## Goal

Clicking the user DP/avatar opens a full category-wise Profile & Preference Center.

## Backend migration

Create next migration:

```sql
CREATE TABLE IF NOT EXISTS user_preferences (
  id VARCHAR(64) PRIMARY KEY,
  workspace_id VARCHAR(64),
  user_id VARCHAR(64) NOT NULL,
  category VARCHAR(80) NOT NULL,
  preferences_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_preferences_category UNIQUE (workspace_id, user_id, category)
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_workspace_user ON user_preferences(workspace_id, user_id);
```

Reuse existing profile/user fields and notification preference tables where appropriate. Do not duplicate canonical data.

## Backend classes

```text
UserPreference.java
UserPreferenceRepository.java
UserPreferenceService.java
UserPreferenceController.java
ProfileController.java, if needed
```

## APIs

```text
GET    /api/v1/users/me/profile
PATCH  /api/v1/users/me/profile
GET    /api/v1/users/me/preferences
GET    /api/v1/users/me/preferences/{category}
PATCH  /api/v1/users/me/preferences/{category}
```

## Frontend files

```text
works-frontend/src/features/profile/profile-preference-center.jsx
works-frontend/src/features/profile/profile-preference-drawer.jsx
works-frontend/src/features/profile/sections/account-section.jsx
works-frontend/src/features/profile/sections/appearance-section.jsx
works-frontend/src/features/profile/sections/locale-time-section.jsx
works-frontend/src/features/profile/sections/notification-section.jsx
works-frontend/src/features/profile/sections/work-preferences-section.jsx
works-frontend/src/features/profile/sections/ai-preferences-section.jsx
works-frontend/src/features/profile/sections/security-section.jsx
works-frontend/src/features/profile/sections/accessibility-section.jsx
works-frontend/src/features/profile/sections/integrations-section.jsx
works-frontend/src/features/profile/use-user-preferences.js
```

Modify:

```text
works-frontend/src/components/works/organisms/user-menu.jsx
```

## Preference categories

```text
Account: name, email, avatar, job title, contact
Appearance: theme, accent, density, motion
Locale & Time: language, timezone, date format, working hours
Notifications: in-app, email, push, mentions, assignments, approvals, SLA, quiet hours
Work Preferences: default landing page, default team, default board, default BQL filter, focus mode
AI Preferences: tone, summary length, suggestions, memory toggle where allowed
Security: password, MFA, passkeys, sessions, login history
Accessibility: font size, high contrast, reduced motion, keyboard shortcuts
Integrations: calendar, email, GitHub/GitLab, connected apps
```

## Microcopy

```text
Your preferences are saved. bSmart Works will use these settings to shape your daily workspace.
```

```text
This setting is managed by your workspace admin.
```

## Acceptance criteria

- DP click opens Profile & Preferences.
- Preferences are category-wise.
- Preferences persist through backend.
- Workspace policy can lock fields.
- Security settings are protected.
- Loading/error/success states are positive and clear.

---

# EPIC 4 — Team-First Onboarding and Team Workspace

## Goal

Onboarding must create a team first, with user-defined team key and selected framework.

## Backend migration

Add to teams:

```sql
ALTER TABLE teams ADD COLUMN IF NOT EXISTS team_key VARCHAR(20);
ALTER TABLE teams ADD COLUMN IF NOT EXISTS framework_key VARCHAR(40);
ALTER TABLE teams ADD COLUMN IF NOT EXISTS lead_user_id VARCHAR(64);
ALTER TABLE teams ADD COLUMN IF NOT EXISTS default_board_id VARCHAR(64);
ALTER TABLE teams ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_teams_workspace_team_key
ON teams(workspace_id, upper(team_key))
WHERE team_key IS NOT NULL;
```

## Required onboarding flow

```text
Step 1: Welcome and value promise
Step 2: Create team
Step 3: Choose team key
Step 4: Choose framework
Step 5: Choose recommended work types
Step 6: Invite team members
Step 7: Create default board
Step 8: Review operating model
Step 9: Finish and land on Team Workspace
```

## Team key rules

```text
Uppercase on save
Letters and numbers only initially
2-10 characters recommended
Unique inside workspace
Reserved words blocked: ADMIN, OWNER, API, BQL, NULL, SYSTEM, ROOT
```

## APIs

```text
GET    /api/v1/teams?workspaceId={workspaceId}
POST   /api/v1/teams
GET    /api/v1/teams/{teamId}
PATCH  /api/v1/teams/{teamId}
POST   /api/v1/teams/validate-key
GET    /api/v1/teams/{teamId}/operating-model
POST   /api/v1/onboarding/team-first
```

## Frontend files

```text
works-frontend/src/features/onboarding/team-first-onboarding.jsx
works-frontend/src/features/onboarding/steps/welcome-step.jsx
works-frontend/src/features/onboarding/steps/team-details-step.jsx
works-frontend/src/features/onboarding/steps/team-key-step.jsx
works-frontend/src/features/onboarding/steps/framework-step.jsx
works-frontend/src/features/onboarding/steps/work-types-step.jsx
works-frontend/src/features/onboarding/steps/invite-step.jsx
works-frontend/src/features/onboarding/steps/default-board-step.jsx
works-frontend/src/features/onboarding/steps/review-step.jsx
works-frontend/src/features/teams/team-workspace.jsx
```

## Acceptance criteria

- New workspace/team setup creates a team before work begins.
- Team key is validated and saved.
- Framework is selected and policy seeded.
- Default board is created.
- User lands on Team Workspace.
- Old onboarding remains compatible or is migrated cleanly.

---

# EPIC 5 — Five User Types and Configurable Permission Model

## Goal

Expose only five core user types and make permission behavior configurable by Admin/Owner.

## User types

```text
INDIVIDUAL
TEAM_LEAD
MANAGEMENT
ADMIN
OWNER
```

## Product meaning

| User Type | Meaning |
|---|---|
| Individual | Contributes to assigned work |
| Team Lead | Leads team/group execution |
| Management | Governance, compliance, approvals, decisions |
| Admin | Tenant-level configuration, automation, access management |
| Owner | Everything, including Admin power and ownership-level access |

## Migration approach

Do not destructively remove legacy role model yet.

1. Add `user_type` to membership tables after inspecting actual schema.
2. Backfill from legacy role/tier.
3. Update service logic to read user_type first, fallback to legacy role.
4. Update UI labels to show only new five types.
5. Keep role lenses separate.

Example migration pattern:

```sql
ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS user_type VARCHAR(40);

UPDATE workspace_members
SET user_type = CASE upper(role_id)
  WHEN 'OWNER' THEN 'OWNER'
  WHEN 'ADMIN' THEN 'ADMIN'
  WHEN 'LEAD' THEN 'TEAM_LEAD'
  WHEN 'MEMBER' THEN 'INDIVIDUAL'
  WHEN 'VIEWER' THEN 'INDIVIDUAL'
  ELSE 'INDIVIDUAL'
END
WHERE user_type IS NULL;
```

Adjust to actual schema before applying.

## Default permission seed

| Capability | Individual | Team Lead | Management | Admin | Owner |
|---|---:|---:|---:|---:|---:|
| Work on assigned items | Yes | Yes | Yes | Yes | Yes |
| Create own work | Yes | Yes | Optional | Optional | Yes |
| Assign team work | No | Yes | Optional | Optional | Yes |
| Manage team board | No | Yes | No | Optional | Yes |
| Approve decisions | No | Optional | Yes | No by default | Yes |
| Governance/compliance | No | Optional | Yes | Optional | Yes |
| Tenant configuration | No | No | No | Yes | Yes |
| User access management | No | No | No | Yes | Yes |
| Automation management | No | No | No | Yes | Yes |
| Billing/delete tenant/ownership | No | No | No | No | Yes |

## Critical rules

```text
Owner can access everything and cannot be locked out by Admin.
Admin can configure tenant/platform behavior but does not automatically own business decisions unless policy grants it.
Management owns governance/compliance/approvals/decisions by default.
Any user type can be assigned to work if policy allows that work type and context.
No user can self-elevate.
All permission changes are audited.
Preview-as-user-type is required before publish.
Backend enforces published policy.
```

## Admin/Owner configurability

Admin Studio must allow Admin and Owner to configure:

```text
Capability access by user type
Team-level overrides
Framework-specific permission behavior
Approval authority
Assignment authority
Board management authority
Governance authority
Automation/configuration authority
BQL filter and board creation authority
bSmart Messenger visibility and moderation authority
Work type creator/assignee rules
Critical exceptions where allowed
```

## Acceptance criteria

- UI exposes only five user types.
- Legacy roles remain compatible.
- Backend still enforces permissions.
- Owner cannot be locked out.
- Admin/Owner can configure permission policy through UI.
- Policy changes are previewable and audited.

---

# EPIC 6 — Admin Studio Operating Model Center

## Goal

Create a single Admin Studio area where Admin and Owner configure framework behaviors, permission model, critical rules, work type policies, and policy lifecycle.

## Backend migration

```sql
CREATE TABLE IF NOT EXISTS operating_model_policy_sets (
  id VARCHAR(64) PRIMARY KEY,
  workspace_id VARCHAR(64) NOT NULL,
  team_id VARCHAR(64),
  framework_key VARCHAR(40),
  policy_scope VARCHAR(40) NOT NULL,
  name VARCHAR(160) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'DRAFT',
  version BIGINT NOT NULL DEFAULT 1,
  policy_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by VARCHAR(64) NOT NULL,
  updated_by VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS operating_model_policy_audit (
  id VARCHAR(64) PRIMARY KEY,
  workspace_id VARCHAR(64) NOT NULL,
  policy_set_id VARCHAR(64),
  action VARCHAR(80) NOT NULL,
  actor_user_id VARCHAR(64) NOT NULL,
  before_json JSONB,
  after_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Backend classes

```text
OperatingModelPolicySet.java
OperatingModelPolicyAudit.java
OperatingModelPolicyRepository.java
OperatingModelPolicyAuditRepository.java
OperatingModelPolicyService.java
OperatingModelPolicyController.java
PolicyPreviewService.java
PolicyPublishService.java
PolicyRollbackService.java
```

## APIs

```text
GET    /api/v1/admin/operating-model/policies
POST   /api/v1/admin/operating-model/policies
GET    /api/v1/admin/operating-model/policies/{policySetId}
PATCH  /api/v1/admin/operating-model/policies/{policySetId}
POST   /api/v1/admin/operating-model/policies/{policySetId}/preview
POST   /api/v1/admin/operating-model/policies/{policySetId}/publish
POST   /api/v1/admin/operating-model/policies/{policySetId}/rollback
GET    /api/v1/admin/operating-model/policies/{policySetId}/audit
```

## Frontend files

```text
works-frontend/src/features/admin-studio/operating-model/operating-model-settings.jsx
works-frontend/src/features/admin-studio/operating-model/framework-policy-editor.jsx
works-frontend/src/features/admin-studio/operating-model/framework-capability-matrix.jsx
works-frontend/src/features/admin-studio/operating-model/permission-policy-editor.jsx
works-frontend/src/features/admin-studio/operating-model/work-type-policy-editor.jsx
works-frontend/src/features/admin-studio/operating-model/critical-rules-editor.jsx
works-frontend/src/features/admin-studio/operating-model/policy-preview-panel.jsx
works-frontend/src/features/admin-studio/operating-model/policy-publish-dialog.jsx
works-frontend/src/features/admin-studio/operating-model/policy-audit-log.jsx
```

## UX structure

```text
Admin Studio → Operating Model
├── Frameworks
├── Permissions
├── Work Types
├── Critical Rules
├── Navigation & Surfaces
├── Boards & BQL
├── Messenger
├── Preview
├── Publish / Rollback
└── Audit Log
```

## Acceptance criteria

- Only Admin/Owner can access Operating Model Center.
- Admin/Owner can edit draft policies.
- Admin/Owner can preview policy impact.
- Admin/Owner can publish and rollback.
- Audit log shows who changed what, before/after, and when.
- Ordinary users are not exposed to policy complexity.

---

# EPIC 7 — Framework Policy Engine and Configurable Behavior Matrix

## Goal

Scrum, Kanban, Waterfall, Lean, DSDM, and XP must behave accurately and intelligently, while remaining configurable from UI by Admin/Owner.

## Supported frameworks

```text
SCRUM
KANBAN
WATERFALL
LEAN
DSDM
XP
```

## Seed behavior matrix

| Framework | Sprint? | Backlog? | WIP limit? | Phases/gates? | Timebox? | Velocity? | Cycle time? | Core UI |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| Scrum | Yes | Yes | Optional | No | Sprint | Yes | Optional | Sprint Planning, Active Sprint, Burndown |
| Kanban | No | Optional | Yes | No | No | No | Yes | Board, WIP, Flow, Cycle Time |
| Waterfall | No | Requirements-based | No | Yes | Milestone/Phase | No | Optional | Phases, Gates, Approvals, Baselines |
| Lean | No by default | Optional | Yes | No | No | No | Yes | Flow, Waste Reduction, Continuous Improvement |
| DSDM | Timebox, not Scrum sprint | Prioritized backlog | Optional | Governance gates | Yes | Optional | Yes | Timeboxes, MoSCoW, Governance |
| XP | Iteration | Yes | Optional | No | Iteration | Optional | Yes | Iterations, Stories, Engineering Practices |

## Backend migration

```sql
CREATE TABLE IF NOT EXISTS delivery_frameworks (
  framework_key VARCHAR(40) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  description TEXT,
  default_config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS framework_capabilities (
  framework_key VARCHAR(40) NOT NULL,
  capability_key VARCHAR(80) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (framework_key, capability_key)
);
```

## Backend classes

```text
DeliveryFramework.java
FrameworkCapability.java
DeliveryFrameworkRepository.java
FrameworkCapabilityRepository.java
DeliveryFrameworkPolicyService.java
FrameworkController.java
FrameworkPolicyResponse.java
FrameworkViolationException.java
```

## Service API

```java
boolean supportsSprints(String teamId);
boolean supportsBacklog(String teamId);
boolean supportsWipLimits(String teamId);
boolean supportsPhaseGates(String teamId);
boolean supportsTimeboxes(String teamId);
boolean supportsVelocity(String teamId);
boolean supportsCycleTime(String teamId);
boolean supportsMoSCoW(String teamId);
boolean supportsEngineeringPractices(String teamId);
List<String> allowedWorkItemTypes(String teamId, String userType);
List<String> allowedNavigation(String teamId, String userType);
List<String> allowedMetrics(String teamId);
```

## Backend enforcement examples

```text
Kanban: reject sprint creation; enable WIP/flow metrics.
Waterfall: reject sprint operations; enable phase/gate/milestone/approval flows.
Scrum: enable sprint/backlog/velocity/burndown.
DSDM: enable timeboxes, MoSCoW, governance gates.
XP: enable iterations, stories, tests, CI/TDD/pairing checklist.
Lean: enable WIP, flow, cycle time, continuous improvement.
```

## Frontend tasks

Create:

```text
works-frontend/src/features/framework/use-framework-policy.js
works-frontend/src/features/framework/framework-capability-guard.jsx
works-frontend/src/features/framework/framework-unavailable-state.jsx
```

Example:

```jsx
<FrameworkCapabilityGuard capability="SPRINTS" fallback={<FrameworkUnavailableState />}>
  <SprintView />
</FrameworkCapabilityGuard>
```

## Acceptance criteria

- Framework policies are seeded.
- Kanban/Waterfall/Lean cannot create Scrum sprints.
- Scrum sees sprint behavior.
- DSDM sees timebox/MoSCoW/governance behavior.
- XP sees iteration and engineering-practice behavior.
- Admin/Owner can edit framework behavior from UI.
- Backend rejects unsupported actions.
- Policy changes are audited.

---

# EPIC 8 — Work Type Policy and Assignment Rules

## Goal

Work item types must map to framework, user type, team, creator permissions, assignee permissions, required fields, workflow, and layout.

## Backend migration

```sql
CREATE TABLE IF NOT EXISTS work_type_policies (
  id VARCHAR(64) PRIMARY KEY,
  workspace_id VARCHAR(64),
  team_id VARCHAR(64),
  framework_key VARCHAR(40) NOT NULL,
  work_type VARCHAR(80) NOT NULL,
  allowed_assignee_user_types JSONB NOT NULL DEFAULT '[]'::jsonb,
  allowed_creator_user_types JSONB NOT NULL DEFAULT '[]'::jsonb,
  required_fields_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  workflow_id VARCHAR(64),
  layout_id VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Default examples

### Scrum

```text
Individual: Story, Task, Bug, Spike
Team Lead: Epic, Story, Task, Bug, Spike, Impediment, Risk
Management: Decision, Approval, Risk, Dependency, Milestone
Admin: Access Request, Configuration Change, Automation Task, Integration Issue
Owner: All
```

### Kanban

```text
Individual: Card, Task, Bug, Service Request
Team Lead: Flow Improvement, Blocker, Expedite Item
Management: Risk, Decision, Policy Review
Admin: Automation Task, Configuration Change
Owner: All
```

### Waterfall

```text
Individual: Task, Defect, Requirement Task
Team Lead: Work Package, Dependency, Change Request
Management: Approval, Decision, Gate Review, Risk, Milestone
Admin: Configuration Change, Access Request
Owner: All
```

### Lean

```text
Individual: Task, Improvement Item, Defect
Team Lead: Flow Improvement, Blocker, Experiment
Management: Policy Review, Risk, Decision
Admin: Automation Task, Configuration Change
Owner: All
```

### DSDM

```text
Individual: Requirement, Task, Bug
Team Lead: Timebox Item, Dependency, Risk
Management: Approval, Decision, Governance Gate, MoSCoW Review
Admin: Configuration Change, Access Request
Owner: All
```

### XP

```text
Individual: Story, Task, Bug, Spike, Test
Team Lead: Iteration Item, Technical Debt, Engineering Practice Task
Management: Risk, Decision, Release Approval
Admin: CI/Integration Task, Configuration Change
Owner: All
```

## Frontend behavior

Create Work Item dialog must only show work types allowed by:

```text
selected team + selected framework + current user type + published policy
```

If no types are available:

```text
No work types are available for your current role in this team. Ask your Team Lead or Admin to update the team policy.
```

## Acceptance criteria

- Work item create dialog is policy-aware.
- Backend rejects invalid work type creation.
- Assignment follows allowed assignee policy.
- Admin/Owner can configure policies from Admin Studio.

---

# EPIC 9 — Team-Key-Based Work Item Display IDs

## Goal

Work item IDs must be tied to the team key provided by the user.

## Backend migration

```sql
ALTER TABLE work_items ADD COLUMN IF NOT EXISTS team_id VARCHAR(64);
ALTER TABLE work_items ADD COLUMN IF NOT EXISTS display_key VARCHAR(40);

CREATE INDEX IF NOT EXISTS idx_work_items_team_id ON work_items(team_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_work_items_display_key_project_scope
ON work_items(project_id, display_key)
WHERE display_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS team_work_item_counters (
  workspace_id VARCHAR(64) NOT NULL,
  team_id VARCHAR(64) NOT NULL,
  team_key VARCHAR(20) NOT NULL,
  next_val BIGINT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, team_id)
);
```

If `work_items.workspace_id` exists or is safely added, prefer unique `(workspace_id, display_key)`. Otherwise use project/team-derived workspace scoping.

## Backend classes

```text
TeamWorkItemCounter.java
TeamWorkItemCounterRepository.java
WorkItemKeyService.java
WorkItemDisplayKeyBackfillService.java
```

## Logic

```java
@Transactional
public String nextKey(String workspaceId, String teamId) {
  Team team = teamRepository.findById(teamId).orElseThrow();
  String key = team.getTeamKey();
  TeamWorkItemCounter counter = counterRepository.lockForUpdate(workspaceId, teamId);
  long next = counter.getNextVal();
  counter.setNextVal(next + 1);
  counterRepository.save(counter);
  return key + "-" + next;
}
```

## APIs

```text
GET /api/v1/work-items/by-key/{displayKey}
```

## Frontend tasks

- Show displayKey on cards, rows, detail panels, BQL results, search, messages, reports, notifications, emails.
- Prefer URLs like `/work/PLAT-123` where feasible.
- Keep internal ID for backend mutation safety.

## Acceptance criteria

- New work items get `{TEAM_KEY}-{sequence}`.
- Existing items still open correctly.
- Concurrent creation cannot duplicate display keys.
- DisplayKey appears everywhere users discuss work.

---

# EPIC 10 — BQL Inline Filters Like Jira Filters

## Goal

BQL should behave like Jira filters over the current page, not primarily as a separate page.

## Important repo note

The backend already has strong BQL execution. Saved BQL filters were consolidated into `SavedView` and old BQL filter table was dropped in migration V83. Prefer extending `SavedView` rather than creating a duplicate saved filter model unless a separate model is clearly needed.

## Required behavior

Topbar BQL click:

```text
Open BQL Filter Drawer for current context.
Do not navigate to /bql by default.
```

User can:

```text
Type BQL query
Use query builder
Run query in current context
Apply to board/list/backlog/dashboard
Save as Saved View
Save as Board
Share with team/workspace
Subscribe where supported
Open Advanced BQL Lab if needed
```

## Frontend files

```text
works-frontend/src/features/bql/bql-filter-drawer.jsx
works-frontend/src/features/bql/bql-filter-bar.jsx
works-frontend/src/features/bql/bql-query-builder.jsx
works-frontend/src/features/bql/saved-view-picker.jsx
works-frontend/src/features/bql/bql-applied-filter-chip.jsx
works-frontend/src/features/bql/save-view-dialog.jsx
works-frontend/src/features/bql/use-bql-filter.js
works-frontend/src/features/bql/use-saved-views.js
```

Modify:

```text
works-frontend/src/App.jsx
works-frontend/src/views/board-view.jsx
works-frontend/src/views/backlog-view.jsx
works-frontend/src/views/sprint-view.jsx
works-frontend/src/views/dashboard-view.jsx
```

## Microcopy

```text
Filter this view with BQL.
```

```text
Your filter is applied. This board now shows matching work only.
```

```text
Saved. You can reuse this filter anytime.
```

## Acceptance criteria

- BQL topbar button opens drawer.
- Current page updates with BQL filter results.
- Existing BQL page remains as Advanced BQL Lab.
- SavedView integration works.
- No default navigation to BQL page from topbar.

---

# EPIC 11 — BQL-Powered Dynamic Boards

## Goal

Users can create boards from BQL results so large teams can work in smaller focused groups.

## Backend migration

```sql
CREATE TABLE IF NOT EXISTS query_boards (
  id VARCHAR(64) PRIMARY KEY,
  workspace_id VARCHAR(64) NOT NULL,
  team_id VARCHAR(64),
  owner_id VARCHAR(64) NOT NULL,
  name VARCHAR(160) NOT NULL,
  description TEXT,
  bql_query TEXT NOT NULL,
  board_type VARCHAR(40) NOT NULL DEFAULT 'KANBAN',
  column_field VARCHAR(80) NOT NULL DEFAULT 'status',
  swimlane_field VARCHAR(80),
  visibility VARCHAR(40) NOT NULL DEFAULT 'TEAM',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS query_board_members (
  board_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  access_level VARCHAR(40) NOT NULL DEFAULT 'VIEW',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (board_id, user_id)
);
```

## Backend classes

```text
QueryBoard.java
QueryBoardMember.java
QueryBoardRepository.java
QueryBoardMemberRepository.java
QueryBoardService.java
QueryBoardController.java
```

## APIs

```text
GET    /api/v1/query-boards?workspaceId={workspaceId}&teamId={teamId}
POST   /api/v1/query-boards
GET    /api/v1/query-boards/{boardId}
PATCH  /api/v1/query-boards/{boardId}
DELETE /api/v1/query-boards/{boardId}
POST   /api/v1/query-boards/{boardId}/execute
POST   /api/v1/query-boards/from-saved-view/{savedViewId}
```

Use `/query-boards` to avoid colliding with existing `/api/v1/board/wip-limits` until board APIs are consolidated.

## Frontend files

```text
works-frontend/src/features/boards/query-board-list.jsx
works-frontend/src/features/boards/query-board-view.jsx
works-frontend/src/features/boards/save-as-board-dialog.jsx
works-frontend/src/features/boards/board-settings-drawer.jsx
works-frontend/src/features/boards/use-query-boards.js
```

## Flow

```text
Open BQL Filter Drawer
→ Run Query
→ Review result count
→ Save as View
→ Save as Board
→ Choose board name, type, columns, swimlanes, visibility
→ Create Board
→ Open dynamic board
```

## Acceptance criteria

- User can save a BQL query as a dynamic board.
- Board content updates as matching work changes.
- Framework policy controls board defaults.
- Permission policy controls visibility and edit rights.
- Large teams can create multiple boards for subgroups.

---

# EPIC 12 — bSmart Messenger MVP

## Goal

Create internal, work-contextual messaging named **bSmart Messenger**.

## Product rule

Do not reuse customer support chat tables or domain objects. Customer support chat remains separate.

## Thread types

```text
DIRECT
TEAM_ROOM
WORK_ITEM
BOARD
PROJECT_OR_TEAM
DECISION
RISK
INCIDENT
ANNOUNCEMENT
APPROVAL
KNOWLEDGE_ARTICLE
```

## Backend migration

```sql
CREATE TABLE IF NOT EXISTS messenger_threads (
  id VARCHAR(64) PRIMARY KEY,
  workspace_id VARCHAR(64) NOT NULL,
  thread_type VARCHAR(60) NOT NULL,
  subject_type VARCHAR(60),
  subject_id VARCHAR(64),
  title VARCHAR(240),
  created_by VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS messenger_thread_members (
  thread_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  member_role VARCHAR(40) NOT NULL DEFAULT 'MEMBER',
  muted BOOLEAN NOT NULL DEFAULT FALSE,
  last_read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (thread_id, user_id)
);

CREATE TABLE IF NOT EXISTS messenger_messages (
  id VARCHAR(64) PRIMARY KEY,
  workspace_id VARCHAR(64) NOT NULL,
  thread_id VARCHAR(64) NOT NULL,
  sender_id VARCHAR(64) NOT NULL,
  body TEXT NOT NULL,
  message_type VARCHAR(40) NOT NULL DEFAULT 'TEXT',
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS messenger_mentions (
  message_id VARCHAR(64) NOT NULL,
  mentioned_user_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, mentioned_user_id)
);

CREATE TABLE IF NOT EXISTS messenger_reactions (
  message_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  reaction VARCHAR(40) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id, reaction)
);

CREATE TABLE IF NOT EXISTS messenger_read_receipts (
  message_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);

CREATE TABLE IF NOT EXISTS messenger_attachments (
  id VARCHAR(64) PRIMARY KEY,
  message_id VARCHAR(64) NOT NULL,
  file_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Add indexes for workspace, subject, thread created time, and member user lookups.

## Backend classes

```text
MessengerThread.java
MessengerThreadMember.java
MessengerMessage.java
MessengerMention.java
MessengerReaction.java
MessengerReadReceipt.java
MessengerAttachment.java
MessengerThreadRepository.java
MessengerMessageRepository.java
MessengerThreadMemberRepository.java
MessengerService.java
MessengerController.java
MessengerNotificationService.java
```

## APIs

```text
GET    /api/v1/messenger/threads?workspaceId={workspaceId}
POST   /api/v1/messenger/threads
GET    /api/v1/messenger/threads/{threadId}
PATCH  /api/v1/messenger/threads/{threadId}
DELETE /api/v1/messenger/threads/{threadId}
GET    /api/v1/messenger/threads/{threadId}/messages
POST   /api/v1/messenger/threads/{threadId}/messages
PATCH  /api/v1/messenger/messages/{messageId}
DELETE /api/v1/messenger/messages/{messageId}
POST   /api/v1/messenger/messages/{messageId}/read
POST   /api/v1/messenger/messages/{messageId}/reactions
DELETE /api/v1/messenger/messages/{messageId}/reactions/{reaction}
```

Context creation:

```text
POST /api/v1/messenger/threads/from-work-item/{workItemId}
POST /api/v1/messenger/threads/from-board/{boardId}
POST /api/v1/messenger/threads/from-decision/{decisionId}
POST /api/v1/messenger/threads/from-risk/{riskId}
```

## Frontend files

```text
works-frontend/src/features/messenger/bsmart-messenger-shell.jsx
works-frontend/src/features/messenger/messenger-drawer.jsx
works-frontend/src/features/messenger/messenger-route.jsx
works-frontend/src/features/messenger/thread-list.jsx
works-frontend/src/features/messenger/thread-list-item.jsx
works-frontend/src/features/messenger/thread-view.jsx
works-frontend/src/features/messenger/message-bubble.jsx
works-frontend/src/features/messenger/message-composer.jsx
works-frontend/src/features/messenger/message-actions-menu.jsx
works-frontend/src/features/messenger/message-context-chip.jsx
works-frontend/src/features/messenger/create-thread-dialog.jsx
works-frontend/src/features/messenger/mention-picker.jsx
works-frontend/src/features/messenger/reaction-picker.jsx
works-frontend/src/features/messenger/thread-empty-state.jsx
works-frontend/src/features/messenger/messenger-notification-badge.jsx
works-frontend/src/features/messenger/use-messenger-threads.js
works-frontend/src/features/messenger/use-messenger-messages.js
works-frontend/src/features/messenger/use-send-message.js
```

## Entry points

```text
Topbar message icon with unread badge
Work item detail panel Discussion tab
Team Workspace Team Room
Board Discussion
Decision/Risk/Approval contextual discussion
Command palette: Open bSmart Messenger
```

## Anti-gossip guardrails

Do not build:

```text
Stories
Reels
Follower counts
Public social feed
Vanity metrics
Non-work entertainment reactions
```

Use work context nudges:

```text
Use direct messages for quick coordination. Convert important outcomes into work items, decisions, or actions.
```

## Acceptance criteria

- bSmart Messenger is visible in product.
- Users can create direct, team, and work item threads.
- Users can send/read/edit/delete messages according to permission.
- Mentions create notifications.
- Work item detail has Discussion tab.
- Topbar unread badge works.
- Customer support chat remains separate.

---

# EPIC 13 — Messenger Intelligence and Work Artifact Conversion

## Goal

Make bSmart Messenger work-specific and productive by converting conversation into execution artifacts.

## Required actions from message

```text
Convert to work item
Convert to action item
Convert to decision
Convert to risk
Convert to dependency
Convert to meeting note
Copy link
Create follow-up reminder
Summarize thread
Show unresolved asks
Show decisions from thread
```

## Backend APIs

```text
POST /api/v1/messenger/messages/{messageId}/convert-to-work-item
POST /api/v1/messenger/messages/{messageId}/convert-to-action-item
POST /api/v1/messenger/messages/{messageId}/convert-to-decision
POST /api/v1/messenger/messages/{messageId}/convert-to-risk
POST /api/v1/messenger/messages/{messageId}/convert-to-dependency
POST /api/v1/messenger/threads/{threadId}/summarize
POST /api/v1/messenger/threads/{threadId}/extract-decisions
POST /api/v1/messenger/threads/{threadId}/extract-open-asks
```

## AI behavior

If AI is available and allowed:

```text
Summarize thread
Extract decisions
Extract risks
Extract actions
Suggest next best action
```

If AI is not available:

```text
Use deterministic templates and manual conversion.
```

## Microcopy

```text
Here’s the useful part: 2 decisions, 3 open asks, and 1 blocker.
```

```text
Converted to a work item. The conversation stays linked for context.
```

## Acceptance criteria

- Message can become work artifact.
- Converted artifact links back to source thread/message.
- AI summary respects workspace AI policy.
- Manual conversion works without AI.

---

# EPIC 14 — Premium UX, Microcopy, Positive States, and Next Best Actions

## Goal

Make bSmart Works feel minimal, premium, motivating, and effective.

## UX standard

Every screen must answer:

```text
Where am I?
What matters now?
What should I do next?
What changed?
Am I making progress?
```

## Shared components

```text
Page
PageHeader
EntityDrawer
EmptyState
ErrorState
PermissionState
FeatureUnavailableState
SuccessToast
InlineAlert
ContextChip
NextBestActionCard
ProgressSummary
HealthIndicator
```

## Replace weak microcopy

| Avoid | Use |
|---|---|
| No items found. | You’re clear for now. Create the next priority when you’re ready. |
| Failed to update. | We couldn’t save this change. Your work is still here — try again or refresh. |
| Sprint completed. | Sprint closed. Great work — your velocity and carry-over are ready for review. |
| AI unavailable. | AI is currently offline, but your workflow still works. I’ll use the standard template for now. |
| No messages. | No discussion yet. Start a focused work conversation with your team. |

## Next Best Action examples

```text
This item has no acceptance criteria. Add them now?
This high-risk item has no mitigation owner. Assign one?
This dependency has been open for 12 days. Escalate it?
This article may be outdated. Review it now?
This SLA is at risk. Send an update?
This board has exceeded WIP in In Progress. Move or split work?
```

## Visual direction

```text
Fewer visible options
One primary action per screen
Contextual actions instead of global clutter
Calm status banners
Subtle progress indicators
No excessive animations
No noisy dashboards
Use design tokens only
```

## Acceptance criteria

- New V1.6 screens use positive states.
- BQL, onboarding, messenger, profile, and operating model UX feel guided.
- Error messages are actionable.
- Empty states encourage progress without sounding childish.

---

# EPIC 15 — AI Work Coach and Executive Brief

## Goal

Turn AI into a contextual work coach, not a generic chatbot.

## Work coach actions

```text
Summarize work item
Write acceptance criteria
Explain blocker
Suggest next action
Generate sprint/timebox summary
Create risk from blocker
Create decision from thread
Draft stakeholder update
Generate executive brief
Convert plain English to BQL
Find duplicate or related work
```

## Executive Brief

One click should generate:

```text
What changed this week
What is blocked
Risks and decisions
Sprint/timebox/release progress
SLA/compliance posture
Key asks from leadership
Customer-facing summary
Next recommended action
```

Tone:

```text
Clear, factual, concise, executive-ready
```

## Admin policy controls

Admin/Owner configure:

```text
Enabled AI actions
Allowed roles/user types
Allowed data categories
Token budget
Provider/model tier
Prompt templates
Tone profiles
Audit logging
Approval required for generated external content
```

## Acceptance criteria

- AI actions are contextual and short.
- Deterministic fallback exists.
- Admin/Owner can configure AI behavior.
- Executive brief is generated from existing data and cites linked objects internally.

---

# EPIC 16 — Knowledge, Service Desk, SLA, and Reporting Refinement

## Goal

Refine already broad modules into minimal, premium, outcome-focused flows.

## Knowledge refinement

Focus on:

```text
Create useful article quickly
Find trusted knowledge quickly
Keep knowledge fresh
Show article health
Use templates
```

Microcopy:

```text
This article helped 8 people this month.
```

```text
This page may be outdated. Last meaningful update was 90 days ago.
```

## Service desk refinement

Customer must always see:

```text
Request received
Current status
Expected response time
Owner/team
What changed
What happens next
```

Microcopy:

```text
We received your request. You’ll see updates here as the team works on it.
```

## SLA refinement

Add:

```text
At-risk indicator
Next SLA event
Suggested update
Escalation recommendation
Customer-friendly status text
```

## Reporting refinement

Add:

```text
Workspace health score
Team health score
Framework-specific metrics
Board health
Aging work
Blocked work
WIP pressure
Stale knowledge
SLA risk
Compliance posture
```

## Acceptance criteria

- Knowledge feels simpler and more trusted.
- Customer portal feels reassuring.
- SLA surfaces show next action, not just metrics.
- Reports include practical insight and positive guidance.

---

# EPIC 17 — API-First Modular Monolith and Future Microservices Path

## Goal

Improve maintainability and prepare for future service decomposition without splitting too early.

## Current issue

Backend is a flat monolith under `com.bcits.works`. Many controllers and services are in one package. Some controllers directly use repositories or JdbcTemplate.

## V1.6 target

Keep one deployable backend but create modular boundaries:

```text
com.bcits.works.identity
com.bcits.works.workspace
com.bcits.works.teams
com.bcits.works.work
com.bcits.works.framework
com.bcits.works.permissions
com.bcits.works.operatingmodel
com.bcits.works.bql
com.bcits.works.boards
com.bcits.works.messenger
com.bcits.works.profile
com.bcits.works.knowledge
com.bcits.works.service
com.bcits.works.insights
com.bcits.works.ai
com.bcits.works.shared
```

If full package moves are too risky now, place all new classes with clear prefixes and document boundaries.

## API-first rules

Every new capability needs:

```text
Request DTO
Response DTO
Service method
Thin controller
Repository hidden behind service
Validation
Workspace scoping
RBAC/policy enforcement
OpenAPI annotations where existing pattern supports them
Tests
```

## Future microservice boundaries

Do not split in V1.6, but design for:

```text
Identity & Workspace Service
Work Management Service
Knowledge Service
Service Desk & SLA Service
Insights Service
Automation & Integration Service
AI Control Plane Service
Audit & Compliance Service
Messaging Service
```

## Event/outbox direction

Add outbox/event boundary where high-value:

```text
messenger message sent
work item created/updated
policy published
SLA at risk
AI summary generated
board created
```

## Acceptance criteria

- New code follows service boundaries.
- New controllers are thin.
- No new feature logic is buried in App.jsx.
- API contracts are clear.
- Microservices path is documented but not prematurely executed.

---

# EPIC 18 — Performance, Observability, and Scalability

## Goal

Make the product fast and reliable as features grow.

## Frontend performance tasks

```text
Use React Query cache and invalidation consistently.
Virtualize large lists/boards/logs.
Lazy-load heavy export libraries only when needed.
Split large pages/components.
Avoid unnecessary full refetches after small updates.
Use skeletons instead of spinners where possible.
Keep first interaction fast.
```

## Backend performance tasks

```text
Paginate every large list endpoint.
Add server-side filtering/sorting/search.
Use response DTOs for large objects.
Index query_boards, messenger, user_preferences, policy tables.
Cache dashboard and health metrics.
Cache framework policy resolution.
Avoid N+1 loading for messages, comments, watchers, tags, custom fields.
```

## Observability tasks

```text
Add structured logs for policy publish, messenger send, BQL run, board execution.
Add metrics for slow BQL queries.
Add metrics for message send latency.
Add audit trails for policy and permission changes.
Add health checks for AI provider and fallback state.
```

## Acceptance criteria

- Large boards remain responsive.
- BQL results are paginated/limited.
- Messenger threads load efficiently.
- Policy checks are cached safely.
- Slow operations are observable.

---

# EPIC 19 — Validation, E2E Smoke Tests, Docs, and Final Hardening

## Backend tests

Add or update tests for:

```text
Team key validation
Team creation with framework
Team operating model seed
Five user type mapping
Permission policy preview/publish/rollback
Framework capability checks
Framework enforcement for sprint creation
Work type policy creator/assignee validation
Team-key work item display key generation
Concurrent display key generation
BQL inline filter execution support
Query board creation/execution
Messenger thread permission
Messenger message send/read/edit/delete
Messenger mentions
Message conversion to work item/action/decision/risk
User preference save/load
Logo/profile endpoints where applicable
```

## Frontend tests

Add or update tests for:

```text
Logo variants and placements
User DP opens preference center
Preference category navigation and save states
Team-first onboarding steps
Team key validation UI
Framework policy hides unsupported surfaces
Permission preview-as-user-type UI
BQL button opens drawer instead of navigation
BQL applied filter chip
Save as board dialog
Query board render
Messenger thread list and composer
Unread badge
Work item discussion tab
Message conversion menu
Next Best Action cards
Positive empty/error states
```

## E2E smoke tests

```text
Create Scrum team → see sprint options → create work item PLAT-1
Create Kanban team → no sprint options → see WIP/flow board
Open BQL drawer → apply filter → save as board
Open work item → start messenger discussion → convert message to task
Open DP → update preference → reload → preference persists
Admin edits framework policy → previews as Individual → publishes → audit log records change
Owner verifies full access after policy change
```

## Commands

```bash
npm run guardrails
npm run ai-rules:check
npm run premium-bar
npm run uiux:e2e-scope
cd works-frontend && npm run lint && npm run test && npm run build
cd ../works-backend && ./mvnw test
```

## Final PR summary template

```markdown
## Summary

Implemented bSmart Works V1.6 roadmap foundation:
- Team-first onboarding with team key and framework selection
- Five user types and configurable permission policies
- Admin Studio Operating Model Center
- Framework policy engine for Scrum, Kanban, Waterfall, Lean, DSDM, XP
- Work type policies by framework/user type/team
- Team-key-based work item display IDs
- BQL inline filters and dynamic query boards
- Profile & Preference Center from user DP
- Logo and brand placement system
- bSmart Messenger for work-contextual communication
- Premium UX microcopy, positive states, and next best actions
- API-first modular monolith boundaries and performance hardening

## Validation

- [ ] npm run guardrails
- [ ] npm run ai-rules:check
- [ ] npm run premium-bar
- [ ] npm run uiux:e2e-scope
- [ ] works-frontend npm run lint
- [ ] works-frontend npm run test
- [ ] works-frontend npm run build
- [ ] works-backend ./mvnw test
- [ ] E2E smoke tests

## Notes

- Customer support chat remains separate from bSmart Messenger.
- No premature microservices split was performed.
- Framework behavior and permission rules are configurable by Admin/Owner.
- Backend remains the final authority for policy enforcement.
```

---

# Implementation Iterations for Claude Code / Codex

## Iteration 1 — Repository safety and docs

- Add V1.6 roadmap/state docs.
- Clean generated artifacts.
- Update README stale Spring Boot/Flyway values.
- Add characterization tests.

## Iteration 2 — Shell and architecture setup

- Create `app/` and `features/` structure.
- Extract safe shell/provider pieces from App.jsx.
- Add shared Page/Header/State components.

## Iteration 3 — Brand and profile

- Upgrade Logo component and placements.
- Add Profile & Preference Center.
- Add user preference backend.

## Iteration 4 — Team-first onboarding

- Add team key/framework fields.
- Add team key validation.
- Replace/extend onboarding flow.
- Create default Team Workspace.

## Iteration 5 — User types and permission policy

- Add five user type model.
- Maintain legacy role compatibility.
- Add permission policy service and Admin Studio editor.

## Iteration 6 — Operating model and framework engine

- Add operating model policy tables.
- Add framework defaults and capability service.
- Add frontend capability guards.

## Iteration 7 — Work type policy and display keys

- Add work type policies.
- Add team-key work item display IDs.
- Update create dialog, work item APIs, cards, and links.

## Iteration 8 — BQL inline filters

- Change topbar BQL behavior to drawer.
- Apply BQL to current view.
- Integrate SavedView.

## Iteration 9 — Dynamic query boards

- Add query board backend and frontend.
- Add Save as Board flow.
- Add framework-aware board defaults.

## Iteration 10 — bSmart Messenger MVP

- Add messenger schema/domain/API.
- Add topbar icon, drawer, route, thread list, composer.
- Add direct/team/work item threads.

## Iteration 11 — Messenger intelligence

- Add message-to-artifact conversion.
- Add thread summary/extraction with AI fallback.
- Add work-specific nudges.

## Iteration 12 — Premium UX pass

- Add positive empty/error/success states.
- Add Next Best Action cards.
- Improve onboarding/BQL/messenger/Admin Studio microcopy.

## Iteration 13 — AI coach and executive brief

- Add contextual AI actions.
- Add executive brief.
- Respect AI policies and fallback.

## Iteration 14 — Service, knowledge, insights refinement

- Simplify knowledge, service portal, SLA, reports.
- Add workspace health score and customer reassurance states.

## Iteration 15 — Performance and hardening

- Add indexes, pagination, caching, virtualization.
- Run full validation and fix regressions.
- Final docs and PR summary.

---

# Final Product Outcome

After V1.6, bSmart Works should feel like:

> Simple at the surface, powerful underneath. A user sees only the right work, the right conversations, and the right next action. A Team Lead can run the team’s framework properly. Management can govern decisions and risks. Admin can configure the operating model safely. Owner can access and control everything. Large teams can create focused BQL-powered boards. Conversations stay close to work and become tasks, risks, decisions, and progress.

The desired reaction is:

> “This is minimal but powerful. It knows how my team works. It feels premium. It helps me move work forward without overwhelming me.”
