# bSmart Works - Final Execution Decision Document

**Purpose:** This is the final practical handoff document to use with Claude Code, OpenAI Codex, or any developer/agent working on bSmart Works.

**Use this document beside:**

1. `bSmart_Works_Implementation_Blueprint_Epic_Roadmap.md`
2. `bSmart_Works_Implementation_Blueprint_Epic_Roadmap_UIUX_Expanded.md`
3. `bSmart_Works_Final_Master_Implementation_Doctrine.md`
4. `bSmart_Works_AI_Agent_Implementation_Instructions.md`
5. The current repository snapshot / latest GitHub `main`

This document does **not** replace the roadmap. It narrows the execution strategy so the team does not overbuild, overexpose, or add complexity before the current product is secure, coherent, and premium.

---

## 1. Final verdict

bSmart Works already has a broad and serious product foundation. It is not a small MVP anymore. The current repository contains a large Spring Boot backend, React frontend, many migrations, hundreds of backend/frontend files, and modules for work, projects, knowledge, service desk, AI, dashboards, automations, security, and more.

Therefore the next step is **not feature expansion**.

The next step is:

> **Harden, simplify, consolidate, and polish the product before adding more breadth.**

The product should now move from a feature-rich build into a trusted, minimal, premium, AI-native enterprise work operating system.

---

## 2. Current repository reality

The current codebase already has major breadth:

| Area | Current reality |
|---|---|
| Backend | Spring Boot / Java 21 |
| Frontend | React 19 / Vite / Tailwind |
| Backend main Java files | ~657 |
| Backend tests | ~219 |
| Frontend source files | ~600 |
| Frontend tests | ~219 |
| Flyway migrations | ~107 |
| Backend controllers | ~143 |
| Largest frontend file | `works-frontend/src/App.jsx` at ~4,569 lines |
| Largest backend file | `WorkItemController.java` at ~940 lines |

This means the biggest risk is no longer "can we add modules?" The biggest risks are:

- security gaps,
- tenant/RBAC inconsistency,
- stale documentation,
- too many visible modules,
- oversized app/controller files,
- unclear product mental model,
- inconsistent UI polish,
- AI trust and source-verification gaps,
- low-code complexity becoming clutter,
- agentic coding producing unsafe multi-epic changes.

---

## 3. Final product decision

Build bSmart Works V1 as:

> **A minimal AI-native work command center for enterprise project, delivery, service, knowledge, and engineering visibility.**

Do **not** position V1 as:

> Jira + Slack + Notion + SharePoint + Linear + ChatGPT + ServiceNow + PowerBI all at once.

The long-term destination can be broad. The immediate product experience must be focused.

The product should feel:

- simple like WhatsApp,
- fast like Linear,
- flexible like Notion,
- intelligent like ChatGPT,
- trustworthy like Perplexity,
- execution-ready like Jira/Azure DevOps,
- enterprise-ready like Microsoft 365/SharePoint,
- professional and human like LinkedIn,
- visually engaging without social-media noise.

But the final experience must still feel like one product:

> **bSmart Works - one calm, minimal, premium enterprise work OS.**

---

## 4. Non-negotiable product principle

All implementation must follow this rule:

> **Minimal by default. Powerful on demand. Accurate always.**

This means:

- Do not expose complexity unless needed.
- Do not create a new top-level navigation item unless explicitly approved.
- Do not create a new page if a saved view, command, context panel, tab, or builder can solve it.
- Do not show raw data when a useful summary is enough.
- Do not hide evidence behind AI claims.
- Do not let configurability create clutter.
- Do not let AI take risky action without human review and approval.
- Do not confuse internal and customer-visible information.
- Do not use engineering telemetry to rank or shame people.

---

## 5. Final visible navigation

The product must converge to this visible navigation:

```text
Today
Inbox
Messages
Work
Projects
Knowledge
Reports
More
```

Everything else belongs under **More**, command palette, role-aware defaults, saved views, admin/customization, or contextual right panels.

Under **More**:

```text
Service Desk
Customers
DevSync
Triage
Cycles
Initiatives
Releases
Automations
Integrations
AI Studio
BQL
Admin
Security
Marketplace
Settings
```

Acceptance rules:

- Maximum 8 primary navigation items.
- No advanced feature gets a new primary nav item without explicit product approval.
- Every existing feature must remain discoverable through More or command palette.
- Role-based navigation may hide irrelevant surfaces, but server-side RBAC must still enforce permissions.
- Deep links must continue to work.

---

## 6. What to do now

### 6.1 Do EPIC 0, EPIC 1, EPIC 2, and EPIC 25 partial first

Before any major product expansion, complete:

1. **EPIC 0 - Current-State Hardening, Truth, and Delivery Baseline**
2. **EPIC 1 - Multi-Tenant Security and RBAC Hardening**
3. **EPIC 2 - Production Configuration, Deployment, and Secrets Safety**
4. **EPIC 25 partial - Reliability, Testing, Accessibility, Performance, and Quality Gates**

These are not optional. They are the foundation for all other work.

### 6.2 First 20 implementation tickets

Implement these before building new major features:

1. Fix backend Dockerfile JAR copy pattern.
2. Update README with actual current repo state.
3. Update TECH-DEBT so it does not contradict implemented modules.
4. Create `CURRENT-STATE.md` listing implemented, partial, stubbed, future, deprecated, and hidden features.
5. Add production JWT secret validation.
6. Disable dev verification token exposure outside local/dev.
7. Restrict query-param JWT authentication to realtime SSE only.
8. Remove production `WS-001` fallbacks from backend controllers.
9. Replace frontend live `WS-001` usage with active workspace context.
10. Fix starred work-item tenant leak.
11. Add starred work-item cross-tenant denial tests.
12. Workspace-scope `DashboardController` and `DashboardService`.
13. Remove dashboard `userId` trust; use authenticated user/session.
14. Add dashboard tenant isolation tests.
15. Add RBAC checks to SCIM token issuance.
16. Add SCIM permission enforcement tests.
17. Fix `FieldLayoutController` project/workspace resolution.
18. Harden attachment MIME detection and active-content download behavior.
19. Align frontend AI client endpoints with backend AI APIs.
20. Add guardrails for API contract drift, `WS-001`, raw fetch, unsafe workspace queries, and silent AI fallback.

---

## 7. What not to do now

### 7.1 Do not add more breadth before hardening

Do not start major new modules until EPIC 0, 1, 2, and key quality gates are complete.

Avoid starting:

- full messaging platform,
- full low-code/no-code suite,
- autonomous agents,
- marketplace,
- advanced analytics,
- public/customer community,
- heavy DevSync dashboards,
- all admin builders at once.

### 7.2 Do not build 20 low-code builders immediately

The long-term low-code/no-code vision is valid, but it must not create clutter. Start with a strong configuration kernel and only three practical builders:

1. Field/form/layout builder
2. Status/workflow builder
3. Saved views/Today widgets builder

Defer the rest until the core product shell is stable.

### 7.3 Do not build social-media behavior

Messaging should be work-aware, not addictive.

Do not build:

- social feeds,
- vanity reactions as a core loop,
- public communities as V1,
- infinite-scroll engagement loops,
- popularity metrics,
- noisy chat-first UI.

Build:

- project room,
- work item thread,
- customer conversation,
- internal vs external separation,
- message-to-task,
- message-to-decision,
- message-to-approval,
- source-backed AI summaries,
- audit for official commitments.

### 7.4 Do not add autonomous AI agents yet

For now, AI should summarize, draft, recommend, explain, and prepare actions for review.

AI must not automatically:

- merge code,
- send customer-visible messages,
- delete or modify critical records,
- change security settings,
- publish official reports,
- create official commitments without review,
- bypass RBAC or tenant boundaries.

### 7.5 Do not turn DevSync into surveillance

DevSync should show engineering evidence, not rank developers.

Do not build:

- developer leaderboards,
- productivity scores,
- commit-count ranking,
- LOC ranking,
- "inactive developer" labels.

Build:

- branch, PR, CI, deployment, release evidence,
- review bottlenecks,
- CI/deployment health,
- linked/unlinked code activity,
- release readiness,
- source-backed summaries.

---

## 8. Recommended implementation sequence

### Phase 1 - Safety and truth

Goal: Make the codebase trustworthy before redesign or expansion.

Work:

- EPIC 0
- EPIC 1
- EPIC 2
- EPIC 25 partial

Deliverables:

- `CURRENT-STATE.md`
- refreshed README/TECH-DEBT/SECURITY/DEPLOY docs
- Docker build fixed
- production secret validation
- tenant/RBAC fixes
- `WS-001` removal from production paths
- query-param JWT restricted
- SCIM secured
- attachments hardened
- guardrails upgraded
- regression tests added

Exit criteria:

- No known production tenant/RBAC bypass remains untracked.
- CI/guardrails block newly introduced critical anti-patterns.
- Documentation reflects the actual repository.

### Phase 2 - Architecture and premium shell

Goal: Make the product maintainable and coherent.

Work:

- EPIC 3 - Backend modularization
- EPIC 4 - Frontend architecture refactor
- EPIC 5 - Premium design system refresh
- EPIC 6 - Simplified information architecture and navigation

Deliverables:

- `App.jsx` split into providers and shell
- `WorkItemController` split into smaller domain controllers/services
- shared `AppShell`
- route registry
- navigation model
- right context panel foundation
- tokenized design system
- loading/empty/error/success states
- light/dark/compact support

Exit criteria:

- App feels like one product, not many modules.
- Advanced features are accessible but not visually overwhelming.
- Core shell is keyboard-friendly, responsive, and premium.

### Phase 3 - Daily habit core

Goal: Make the product valuable every day.

Work:

- EPIC 7 - Today
- EPIC 8 - Smart Inbox
- EPIC 9 - Work-aware Messages V1

Deliverables:

- Today as default landing page
- maximum 5 high-priority attention cards
- action-first Inbox
- project/work/customer conversation foundations
- AI briefs with sources or deterministic fallback
- snooze, dismiss, act, convert flows

Exit criteria:

- Users know what matters, what needs action, what is blocked, and what to do next.

### Phase 4 - Execution core

Goal: Make deep work and project execution excellent.

Work:

- EPIC 10 - Work item experience redesign
- EPIC 11 - Project command center
- EPIC 12 - DevSync / Engineering intelligence

Deliverables:

- premium work item detail page
- right context panel with AI summary, properties, SLA, approvals, DevSync, audit
- project health overview
- milestone/risk/blocker/decision visibility
- raw DevSync event ingestion
- linked/unlinked engineering activity

Exit criteria:

- Work item and project pages are source-backed, fast, and understandable within seconds.

### Phase 5 - Intelligence layer

Goal: Make AI trustworthy and useful.

Work:

- EPIC 13 - Universal AI command layer
- EPIC 14 - bSmart Answer Engine
- EPIC 15 - bSmart Canvas and AI-generated artifacts

Deliverables:

- source-backed AI answers
- confidence/limitations display
- permission-aware retrieval
- Draft -> Review -> Approve -> Execute pattern
- AI-generated reports, updates, summaries, and artifacts

Exit criteria:

- AI reduces effort without hiding evidence or bypassing control.

### Phase 6 - Enterprise depth

Goal: Add scale, governance, customization, and operations after the core is strong.

Work:

- Knowledge/document workspace
- Service desk/customer resolution
- SLA/compliance/governance/evidence
- automation builder and agents
- reports/dashboards/BQL/leadership intelligence

Exit criteria:

- Enterprise features are powerful on demand, not visible clutter.

### Phase 7 - Ecosystem, adoption, and scale

Goal: Make the product durable and scalable.

Work:

- integrations and platform APIs
- people graph and stakeholder intelligence
- onboarding/templates/guided adoption
- mobile/PWA/offline/realtime smoothness
- product analytics and healthy engagement hooks
- developer experience and agent-ready implementation system

Exit criteria:

- Product scales across teams, tenants, integrations, and agentic development safely.

---

## 9. Claude Code / OpenAI Codex operating rules

Every coding agent must follow these rules.

### 9.1 Start from latest `main`

```bash
git status
git checkout main
git fetch origin
git pull --ff-only origin main
git status
git log --oneline -5
```

If there are uncommitted local changes, stop and inspect. Do not overwrite human work.

### 9.2 One EPIC per branch

```bash
git checkout -b epic/<epic-number>-<short-slug>
```

Rules:

- one EPIC per branch,
- no unrelated cleanup,
- no broad formatting-only diffs,
- no force-push unless explicitly safe,
- no silent scope reduction.

### 9.3 Inspect before planning

The agent must inspect:

- relevant backend controllers/services/repositories/entities/DTOs,
- relevant frontend views/components/lib clients/routes,
- migrations,
- security/RBAC code,
- tests,
- README/TECH-DEBT/CLAUDE/AGENTS/guardrails,
- current API contracts.

Do not assume paths, schemas, endpoint behavior, frontend state, permissions, or test commands.

### 9.4 Create EPIC execution plan before coding

Create:

```text
docs/implementation/epics/EPIC-XX-<slug>.md
```

The plan must include:

```text
Scope
Out of scope
Blueprint references
Current code findings
Files inspected
Files to change
Backend changes
Frontend changes
Data/migration changes
Security/RBAC impact
AI behavior impact
Config impact
UI/UX requirements
Accessibility requirements
Observability requirements
Tests to add
Acceptance criteria checklist
Rollback plan
Risks and mitigations
```

### 9.5 Required PR body

Every PR must include:

```text
Summary
Blueprint references
What changed
Why
How
Files touched
Security/RBAC impact
UI/UX impact
Tests run
Screenshots/recordings if UI changed
Acceptance criteria status
Known limitations
Follow-up tasks
Rollback notes
```

### 9.6 Do not mark complete unless done

An EPIC is not complete unless:

- code is implemented,
- security/RBAC considered and tested where applicable,
- UI/UX criteria applied where applicable,
- tests added/updated,
- guardrails pass,
- frontend/backend builds pass where possible,
- PR created,
- CI passes,
- PR merged,
- latest `main` pulled after merge,
- integration validation run,
- completion note created.

---

## 10. Universal definition of done

No feature is complete unless all relevant criteria are satisfied.

### Product

- Solves a clear user problem.
- Fits the minimal navigation model.
- Has one clear primary action per screen/section.
- Has clear empty, loading, error, success, and permission-denied states.
- Uses understandable microcopy.

### UI/UX

- Uses design tokens.
- Avoids unnecessary visual clutter.
- Supports keyboard navigation.
- Supports responsive layouts.
- Supports light/dark/compact modes where applicable.
- Respects reduced motion.
- Feels calm, premium, and professional.

### Security

- Enforces workspace/tenant scope.
- Enforces server-side RBAC.
- Avoids user-controlled identity/workspace bypass.
- Logs important actions.
- Protects internal vs customer-visible boundaries.
- Handles external users safely.

### AI

- Cites sources for important answers.
- Shows confidence/limitations where needed.
- Does not invent facts, progress, or evidence.
- Requires approval for risky actions.
- Logs fallback/errors.
- Respects RBAC before retrieval and generation.

### Low-code/no-code

- Config is tenant-scoped.
- Config is versioned.
- Config is validated.
- Config has preview.
- Config has rollback.
- Config changes are audited.
- Config dependencies are checked.

### Engineering

- Tests are added or updated.
- CI/guardrails pass.
- API contracts are updated.
- Migrations are safe and reversible where possible.
- Performance impact is considered.
- Rollback path exists.

---

## 11. Product behavior rule

Every major workflow should follow this pattern:

```text
Intent -> Smart default -> Minimal input -> Preview -> Confirm -> Output -> Next best action
```

Examples:

### Create work

```text
User: "Create task for Ravi to fix payment validation by Friday."
System:
- detects task intent,
- sets owner if known,
- sets due date,
- links project if context exists,
- previews task,
- user confirms,
- task is created,
- next best action is suggested.
```

### Generate report

```text
User: "Draft customer update for Billing Revamp."
System:
- gathers project, work, messages, DevSync, SLA, and docs,
- generates source-backed draft,
- opens in editable canvas,
- user reviews/edits,
- approval required before external send.
```

### Resolve customer issue

```text
User handles a service request.
System:
- shows SLA status,
- separates internal notes and customer reply,
- suggests response with sources,
- prompts resolution checklist,
- captures RCA/knowledge opportunity.
```

---

## 12. Final V1 scope

V1 should focus on these core promises:

1. **Today:** What matters now?
2. **Inbox:** What needs my action?
3. **Work:** What is being executed?
4. **Projects:** Are we on track?
5. **Knowledge:** What is the source of truth?
6. **Messages:** What discussion should become action?
7. **Reports:** What progress/risk should leadership see?
8. **AI:** What can be summarized, drafted, explained, or prepared with sources?

Everything else should be hidden under More, feature flags, admin, or future phases.

---

## 13. Final decision matrix

| Decision area | Final decision |
|---|---|
| Product direction | Minimal AI-native enterprise work command center |
| Immediate focus | Safety, truth, architecture, premium shell |
| Feature expansion | Defer until hardening is complete |
| Navigation | Today, Inbox, Messages, Work, Projects, Knowledge, Reports, More |
| AI behavior | Source-backed, review-first, permission-aware |
| Messaging | Work-aware only, not social-media-first |
| DevSync | Evidence and flow, not developer ranking |
| Low-code | Start with config kernel + 3 builders only |
| Agent workflow | One EPIC at a time from latest `main` |
| Definition of done | Tests, guardrails, security, UX, docs, PR, post-merge validation |

---

## 14. Copy-paste instruction for Claude Code / OpenAI Codex

Use this exact instruction when starting implementation:

```text
You are working on bSmart Works. Before coding, read:

1. bSmart_Works_Implementation_Blueprint_Epic_Roadmap.md
2. bSmart_Works_Implementation_Blueprint_Epic_Roadmap_UIUX_Expanded.md
3. bSmart_Works_Final_Master_Implementation_Doctrine.md
4. bSmart_Works_AI_Agent_Implementation_Instructions.md
5. bSmart_Works_Final_Execution_Decision_Document.md

Treat the Final Execution Decision Document as the execution prioritization layer.
Do not implement broad feature expansion first.
Start from latest GitHub main.
Work one EPIC at a time.
Inspect current code before planning.
Create docs/implementation/epics/EPIC-XX-<slug>.md before coding.
Complete EPIC 0, EPIC 1, EPIC 2, and EPIC 25 partial before major feature expansion.
Apply the UI/UX expanded blueprint to every frontend change.
Preserve the final navigation model: Today, Inbox, Messages, Work, Projects, Knowledge, Reports, More.
Remove or block production anti-patterns such as WS-001 fallbacks, arbitrary userId access, unscoped workspace queries, unsafe query-param JWT, silent AI fallback, raw frontend calls to nonexistent endpoints, and inline serving of active attachments.
Do not mark an EPIC complete until tests, guardrails, docs, PR, merge, and post-merge validation are complete.
```

---

## 15. Final recommendation

Do not chase more modules right now.

Make the current product:

- safer,
- simpler,
- faster,
- calmer,
- more premium,
- more coherent,
- more source-backed,
- more reliable,
- easier for agents to modify safely.

The long-term roadmap is strong. The immediate execution must be disciplined.

The right next move is:

> **Turn the existing feature-rich application into a trusted, minimal, premium work OS before expanding it further.**
