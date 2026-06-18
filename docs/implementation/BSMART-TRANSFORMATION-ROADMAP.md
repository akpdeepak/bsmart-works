# bSmart Works Transformation Roadmap V.20

This document makes Deepak's transformation roadmap executable across Claude Code, Codex, GPT Code,
and future AI coding sessions. It does not replace the blueprint files; it points every agent to the
same source material and operating loop.

## V.20 execution decision

V.20 is the practical execution layer for the bSmart Works transformation. The final product
decision is:

> Build bSmart Works V1 as a minimal AI-native work command center for enterprise project,
> delivery, service, knowledge, and engineering visibility.

The immediate strategy is not feature expansion. It is:

> Harden, simplify, consolidate, and polish the product before adding more breadth.

The non-negotiable product principle is:

> Minimal by default. Powerful on demand. Accurate always.

The `bSmart_Works_Final_Execution_Decision_Document.md` is the execution prioritization layer. Use
it beside the implementation roadmap, UI/UX expanded roadmap, and AI agent implementation
instructions. If documents overlap, use the stricter requirement. If priority conflicts arise, follow
the Final Execution Decision Document for sequencing and the blueprint files for detailed epic scope.

## V1.6 requirements overlay

`bSmart_Works_V1_6_Claude_Codex_Roadmap.md` is now part of the roadmap source set. Reconcile it as
a requirements overlay, not as a replacement for V.20 execution discipline.

V1.6 adds detailed target requirements for:

- team-first onboarding with team keys and framework selection
- framework-aware behavior for Scrum, Kanban, Waterfall, Lean, DSDM, and XP
- five business-facing user types: Individual, Team Lead, Management, Admin, Owner
- Admin/Owner-configurable operating model, permissions, framework policies, work types, fields,
  workflows, AI, integrations, and security
- team-key-based work item display IDs such as `PLAT-42`
- inline BQL filters on current surfaces, with BQL Lab retained for advanced usage
- dynamic BQL-powered query boards
- bSmart Messenger as a separate internal work-context messaging domain, not reused customer support
  chat
- message-to-work-artifact conversion for work items, actions, decisions, risks, dependencies, and
  meeting notes
- profile and preference center from the user display picture
- logo/brand placement system for shell, onboarding, portal, reports, exports, email, and PWA
- premium microcopy, positive states, next-best-action cards, and guided empty/error/success states
- contextual AI work coach and executive brief, with deterministic fallback and Admin/Owner policy
  controls
- knowledge, service desk, SLA, and reporting refinement toward outcome-focused flows
- API-first modular monolith boundaries and future microservice path without premature service split
- performance, observability, pagination, caching, virtualization, and scalable indexes
- V1.6-specific backend, frontend, and E2E validation scenarios

Reconciliation rules:

- V1.6 requirements do not override Phase 1. EPIC 0, EPIC 1, EPIC 2, and EPIC 25 partial still come
  first.
- V1.6 repository safety/docs items may be handled during EPIC 0.
- V1.6 guardrails, validation, and e2e-scope items may be handled during EPIC 25 partial.
- V1.6 architecture items map primarily to EPIC 3, EPIC 4, and EPIC 27.
- V1.6 premium UX, brand, microcopy, and state components map primarily to EPIC 5 and EPIC 6, then
  apply continuously to frontend EPICs.
- V1.6 team-first onboarding, framework engine, user types, permissions, operating model, and work
  display keys map to EPIC 6, EPIC 7, EPIC 10, EPIC 22, and EPIC 23.
- V1.6 BQL inline filters and query boards map to EPIC 20 and relevant Work/Reports surfaces.
- V1.6 bSmart Messenger maps to EPIC 9, but must remain work-aware and separate from customer
  support chat.
- V1.6 AI coach and executive brief map to EPIC 13, EPIC 14, EPIC 15, and EPIC 20.
- V1.6 service, knowledge, SLA, and reporting refinements map to EPIC 16, EPIC 17, EPIC 18, and
  EPIC 20.

Do not implement the whole V1.6 roadmap as one branch. Break it into the existing EPIC sequence and
document the selected V1.6 requirements in each EPIC plan.

## Trigger phrases

When Deepak says either phrase below, treat it as a command to work the roadmap end to end:

- `Start the bSmart Transformation Roadmap`
- `Resume the bSmart Transformation Roadmap`

## Required source material

Read these before planning or coding:

1. `docs/implementation/source-documents/bSmart_Works_Final_Execution_Decision_Document.md`
2. `docs/implementation/source-documents/bSmart_Works_Implementation_Blueprint_Epic_Roadmap.md`
3. `docs/implementation/source-documents/bSmart_Works_Implementation_Blueprint_Epic_Roadmap_UIUX_Expanded.md`
4. `docs/implementation/source-documents/bSmart_Works_AI_Agent_Implementation_Instructions.md`
5. `docs/implementation/source-documents/bSmart_Works_V1_6_Claude_Codex_Roadmap.md`
6. `C:\Users\user\Downloads\bSmart_Works_Final_Execution_Decision_Document.md`
7. `C:\Users\user\Downloads\bSmart_Works_Implementation_Blueprint_Epic_Roadmap.md`
8. `C:\Users\user\Downloads\bSmart_Works_Implementation_Blueprint_Epic_Roadmap_UIUX_Expanded.md`
9. `C:\Users\user\Downloads\bSmart_Works_AI_Agent_Implementation_Instructions.md`
10. `C:\Users\user\Downloads\bSmart_Works_V1_6_Claude_Codex_Roadmap.md`
11. `AGENTS.md`
12. `CLAUDE.md`
13. `ai-rules/00-ORCHESTRATOR.md`
14. `ai-rules/SOURCE-OF-TRUTH.md`
15. Applicable `ai-rules/rulebooks/*`
16. `docs/implementation/ROADMAP-STATE.md`

The repo-tracked source documents are canonical for remote/GitHub-only sessions. If local Downloads
files are unavailable, continue from the repo-tracked copies and record that limitation in the active
EPIC plan only if the repo copies are also missing.

## Roadmap operating rules

- The agent doing the work owns implementation, verification, PR creation, merge tracking, local
  sync, and completion notes, subject to branch protection, CI, and explicit human approval gates.
- Work one EPIC at a time.
- Start from latest GitHub `main` unless resuming a valid in-progress EPIC branch.
- Never overwrite uncommitted user/developer work.
- Inspect the actual repo before planning.
- Do not broaden V1 into "Jira + Slack + Notion + SharePoint + Linear + ChatGPT + ServiceNow +
  PowerBI all at once."
- Do not expose a new top-level navigation item without explicit product approval.
- Do not build broad new modules before EPIC 0, EPIC 1, EPIC 2, and EPIC 25 partial are complete.
- Treat security, RBAC, tenant isolation, workspace scoping, auditability, and production safety as
  first-order requirements.
- Treat the UI/UX expanded blueprint as a mandatory overlay for every frontend-facing EPIC.
- Do not claim an EPIC is complete until code is merged to GitHub `main`, local `main` is updated,
  verification is run, and the completion note plus `ROADMAP-STATE.md` are updated.

## Final visible navigation

The product must converge to this visible navigation:

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
- Triage
- Cycles
- Initiatives
- Releases
- Automations
- Integrations
- AI Studio
- BQL
- Admin
- Security
- Marketplace
- Settings

Acceptance rules:

- Maximum 8 primary navigation items.
- No advanced feature gets a new primary nav item without explicit product approval.
- Existing features remain discoverable through More or command palette.
- Role-based navigation may hide irrelevant surfaces, but server-side RBAC still enforces
  permissions.
- Deep links continue to work.

## Do not do now

Until Phase 1 is complete, do not start major breadth expansion:

- full messaging platform
- full low-code/no-code suite
- autonomous agents
- marketplace expansion
- advanced analytics
- public/customer community
- heavy DevSync dashboards
- all admin builders at once

Low-code/no-code starts only with a configuration kernel and these three practical builders:

1. Field/form/layout builder
2. Status/workflow builder
3. Saved views/Today widgets builder

Messaging must be work-aware, not social-media-first. Do not build social feeds, infinite-scroll
engagement loops, popularity metrics, or vanity reactions as the core loop.

AI must summarize, draft, recommend, explain, and prepare actions for review. It must not
automatically merge code, send customer-visible messages, delete or modify critical records, change
security settings, publish official reports, create official commitments, or bypass RBAC/tenant
boundaries.

DevSync must show evidence and flow, not surveillance. Do not build developer leaderboards,
productivity scores, commit-count ranking, LOC ranking, or inactive-developer labels.

## Start sequence

1. Run `git status --short --branch`.
2. If uncommitted changes exist, inspect them and preserve them.
3. Sync `main` when safe:
   - `git checkout main`
   - `git fetch origin`
   - `git pull --ff-only origin main`
4. Read the required source material.
5. Inspect existing `docs/implementation/epics/` plans and completion notes.
6. Read `docs/implementation/ROADMAP-STATE.md`.
7. Select the next incomplete EPIC in roadmap order.
8. Create a dedicated branch: `epic/<epic-number>-<short-slug>`.
9. Create or update `docs/implementation/epics/EPIC-XX-<slug>.md`.
10. Implement incrementally.
11. Run the applicable tests and guardrails.
12. Push branch and create PR.
13. Merge only when CI/review/acceptance criteria pass.
14. Pull latest `main`.
15. Run post-merge validation.
16. Create `docs/implementation/epics/EPIC-XX-<slug>-completion.md`.
17. Update `docs/implementation/ROADMAP-STATE.md`.

## Resume sequence

1. Run `git status --short --branch`.
2. Identify current branch and whether it is an EPIC branch.
3. Inspect uncommitted changes and preserve them.
4. Inspect recent commits and open EPIC docs.
5. Read `docs/implementation/ROADMAP-STATE.md`.
6. Determine the latest safe point:
   - planning not started
   - plan created
   - implementation in progress
   - tests failing
   - PR open
   - PR merged but local validation incomplete
   - completion note/state update pending
7. Continue from that point. Do not restart unless the state is proven stale.
8. If state and code disagree, trust current code/GitHub evidence, then repair the state file.

## Required EPIC artifacts

Every EPIC must produce:

- `docs/implementation/epics/EPIC-XX-<slug>.md`
- `docs/implementation/epics/EPIC-XX-<slug>-completion.md`

Frontend-heavy EPICs also produce:

- `docs/implementation/epics/EPIC-XX-<slug>-ui-notes.md`

API-heavy EPICs also produce:

- `docs/implementation/epics/EPIC-XX-<slug>-api-notes.md`

Security-heavy EPICs also produce:

- `docs/implementation/epics/EPIC-XX-<slug>-security-notes.md`

## Roadmap order

1. EPIC 0 - Current-State Hardening, Truth, and Delivery Baseline
2. EPIC 1 - Multi-Tenant Security and RBAC Hardening
3. EPIC 2 - Production Configuration, Deployment, and Secrets Safety
4. EPIC 25 partial - Reliability, Testing, Accessibility, Performance, and Quality Gates
5. EPIC 3 - Backend Modularization and Service Boundaries
6. EPIC 4 - Frontend Architecture Refactor
7. EPIC 5 - Premium Design System Refresh
8. EPIC 6 - Simplified Information Architecture and Navigation
9. EPIC 7 - bSmart Today
10. EPIC 8 - Smart Inbox
11. EPIC 9 - bSmart Connect Messaging
12. EPIC 10 - Work Item Experience Redesign
13. EPIC 11 - Project Command Center
14. EPIC 12 - DevSync / Engineering Intelligence
15. EPIC 13 - Universal AI Command Layer
16. EPIC 14 - bSmart Answer Engine
17. EPIC 15 - bSmart Canvas and AI-Generated Work Artifacts
18. EPIC 16 - Knowledge and Document Workspace
19. EPIC 17 - Service Desk and Customer Resolution
20. EPIC 18 - SLA, Compliance, Governance, and Evidence
21. EPIC 19 - Automation Builder and bSmart Agents
22. EPIC 20 - Reports, Dashboards, BQL, and Leadership Intelligence
23. EPIC 21 - Integrations, Migration, and Platform APIs
24. EPIC 22 - People Graph, Skills, Stakeholders, and Customer Intelligence
25. EPIC 23 - Onboarding, Templates, and Guided Adoption
26. EPIC 24 - Mobile, PWA, Offline, Realtime, and Smoothness
27. EPIC 26 - Product Analytics, Feedback, and Healthy Engagement Hooks
28. EPIC 27 - Developer Experience and Agent-Ready Implementation System

## First 20 implementation tickets

Complete these before building new major features:

1. Fix backend Dockerfile JAR copy pattern.
2. Update README with actual current repo state.
3. Update TECH-DEBT so it does not contradict implemented modules.
4. Create `CURRENT-STATE.md` listing implemented, partial, stubbed, future, deprecated, and hidden
   features.
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
20. Add guardrails for API contract drift, `WS-001`, raw fetch, unsafe workspace queries, and silent
    AI fallback.

## V1.6 implementation iterations, reconciled

The V1.6 roadmap lists 15 implementation iterations. Use them as detailed work packages inside the
main EPIC order, not as a competing sequence:

1. Repository safety and docs -> EPIC 0
2. Shell and architecture setup -> EPIC 4, EPIC 5, EPIC 6
3. Brand and profile -> EPIC 5, EPIC 22
4. Team-first onboarding -> EPIC 23, with policy prerequisites from EPIC 6/22
5. User types and permission policy -> EPIC 1, EPIC 6, EPIC 22
6. Operating model and framework engine -> EPIC 6, EPIC 10, EPIC 23
7. Work type policy and display keys -> EPIC 10, EPIC 22, EPIC 23
8. BQL inline filters -> EPIC 20 and Work/Reports surfaces
9. Dynamic query boards -> EPIC 10, EPIC 20
10. bSmart Messenger MVP -> EPIC 9
11. Messenger intelligence -> EPIC 9, EPIC 13, EPIC 14
12. Premium UX pass -> EPIC 5 and continuous UI/UX overlay
13. AI coach and executive brief -> EPIC 13, EPIC 14, EPIC 15, EPIC 20
14. Service, knowledge, insights refinement -> EPIC 16, EPIC 17, EPIC 18, EPIC 20
15. Performance and hardening -> EPIC 24, EPIC 25, EPIC 27

When planning an EPIC, explicitly state which V1.6 requirements are in scope, out of scope, or
deferred.

## Universal workflow pattern

Every major workflow should follow:

```text
Intent -> Smart default -> Minimal input -> Preview -> Confirm -> Output -> Next best action
```

V1 focuses on:

1. Today: What matters now?
2. Inbox: What needs my action?
3. Work: What is being executed?
4. Projects: Are we on track?
5. Knowledge: What is the source of truth?
6. Messages: What discussion should become action?
7. Reports: What progress/risk should leadership see?
8. AI: What can be summarized, drafted, explained, or prepared with sources?
