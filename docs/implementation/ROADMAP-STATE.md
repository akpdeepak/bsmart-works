# bSmart Works Roadmap State V.20

This file is the durable resume ledger for Claude Code, Codex, GPT Code, and future AI coding
sessions.

Update this file after every meaningful roadmap session, PR, merge, validation run, or handoff.

## Current status

- Roadmap mode: V.20 EPIC 9 bSmart Connect Messaging in progress
- Active EPIC: EPIC 9 - bSmart Connect Messaging
- Active branch: `epic/09-connect-messaging`
- Last completed EPIC: EPIC 8 - Smart Inbox
- Next recommended EPIC: Finish EPIC 9 - bSmart Connect Messaging
- Last state update: 2026-06-20

## Trigger contract

When Deepak says `Start the bSmart Transformation Roadmap`, begin from EPIC 0 unless this file or
current GitHub evidence proves later work is already complete.

When Deepak says `Resume the bSmart Transformation Roadmap`, inspect this file, git status, local
branches, open PRs, EPIC plans, EPIC completion notes, and current GitHub `main` before deciding the
resume point.

## Source material

- `docs/implementation/BSMART-TRANSFORMATION-ROADMAP.md`
- `docs/implementation/source-documents/bSmart_Works_Final_Execution_Decision_Document.md`
- `docs/implementation/source-documents/bSmart_Works_Implementation_Blueprint_Epic_Roadmap.md`
- `docs/implementation/source-documents/bSmart_Works_Implementation_Blueprint_Epic_Roadmap_UIUX_Expanded.md`
- `docs/implementation/source-documents/bSmart_Works_AI_Agent_Implementation_Instructions.md`
- `docs/implementation/source-documents/bSmart_Works_V1_6_Claude_Codex_Roadmap.md`
- `C:\Users\user\Downloads\bSmart_Works_Final_Execution_Decision_Document.md`
- `C:\Users\user\Downloads\bSmart_Works_Implementation_Blueprint_Epic_Roadmap.md`
- `C:\Users\user\Downloads\bSmart_Works_Implementation_Blueprint_Epic_Roadmap_UIUX_Expanded.md`
- `C:\Users\user\Downloads\bSmart_Works_AI_Agent_Implementation_Instructions.md`
- `C:\Users\user\Downloads\bSmart_Works_V1_6_Claude_Codex_Roadmap.md`
- `AGENTS.md`
- `CLAUDE.md`
- `ai-rules/*`

## V.20 execution decision

- Final priority: harden, simplify, consolidate, and polish before adding breadth.
- V1 product shape: minimal AI-native work command center for enterprise project, delivery, service,
  knowledge, and engineering visibility.
- Product principle: minimal by default, powerful on demand, accurate always.
- Execution priority layer:
  `docs/implementation/source-documents/bSmart_Works_Final_Execution_Decision_Document.md`
- Phase 1 remains mandatory before major expansion: EPIC 0, EPIC 1, EPIC 2, and EPIC 25 partial.
- Preserved product modes: Home, Deliver, Insight, Service, Know, Extend.
- Work-item hierarchy: preserve the current hierarchy/taxonomy as baseline. Add only logically needed,
  backwards-compatible extensions through explicit EPIC plans with migration/API/frontend/BQL/reporting
  and regression-test coverage.
- Do-not-start-yet constraints: broad messaging platform, full low-code suite, autonomous agents,
  marketplace expansion, advanced analytics, public community, heavy DevSync dashboards, and all
  admin builders at once.
- V1.6 is accepted as a requirements overlay, not as a competing implementation sequence. It adds
  team-first onboarding, delivery framework policies, five user types, Admin/Owner configurability,
  team-key work item IDs, inline BQL filters, dynamic query boards, bSmart Messenger, profile
  preferences, brand placement, premium states/microcopy, AI work coach, and modular monolith
  requirements. These must be mapped into the existing EPIC order.

## Resume checklist

- [ ] Inspect `git status --short --branch`
- [ ] Preserve unrelated local changes
- [ ] Identify current branch and open PR, if any
- [ ] Read active EPIC plan, if any
- [ ] Read latest completion note, if any
- [ ] Verify GitHub `main` state before claiming completion
- [ ] Continue from the latest safe point

## EPIC ledger

| EPIC | Status | Branch | PR | Local validation | Completion note | Notes |
|---|---|---|---|---|---|---|
| EPIC 0 - Current-State Hardening, Truth, and Delivery Baseline | Completed | `main` | [#393](https://github.com/akpdeepak/bsmart-works/pull/393) | `npm run verify`; `cd works-backend && .\mvnw.cmd -Dgroups=unit verify` | `docs/implementation/epics/EPIC-00-current-state-hardening-completion.md` | Baseline docs, source hygiene, JWT query-token scope, verified shared status category resolver |
| EPIC 1 - Multi-Tenant Security and RBAC Hardening | Completed | `main` | [#394](https://github.com/akpdeepak/bsmart-works/pull/394) | `cd works-backend && .\mvnw.cmd -Dgroups=unit verify`; `npm run guardrails`; GitHub CI all checks passed | `docs/implementation/epics/EPIC-01-tenant-rbac-hardening-completion.md` | Starred items, SCIM token issuance, dashboards, field layouts, RBAC workspace scope, BQL fallback |
| EPIC 2 - Production Configuration, Deployment, and Secrets Safety | Completed | `main` | [#395](https://github.com/akpdeepak/bsmart-works/pull/395) | `cd works-backend && .\mvnw.cmd -Dgroups=unit verify`; Compose env config validation; `npm run guardrails`; GitHub CI all checks passed | `docs/implementation/epics/EPIC-02-production-config-secrets-completion.md` | Prod/staging secret guard, health probes, env templates, Compose smoke, backup/restore runbook |
| EPIC 25 partial - Reliability, Testing, Accessibility, Performance, and Quality Gates | Completed | `main` | [#396](https://github.com/akpdeepak/bsmart-works/pull/396) | `npm run quality-gates`; `cd works-frontend && npm test -- field-settings presence`; `cd works-backend && .\mvnw.cmd -DskipTests "-Djacoco.skip=true" verify`; `npm run verify`; GitHub CI all checks passed | `docs/implementation/epics/EPIC-25-quality-gates-completion.md` | API contract drift gate, a11y coverage gate, AI fallback telemetry gate, stale route repairs |
| EPIC 3 - Backend Modularization and Service Boundaries | Completed | `main` | [#397](https://github.com/akpdeepak/bsmart-works/pull/397) | Focused backend tests; `cd works-backend && .\mvnw.cmd -Dgroups=unit verify`; `npm run quality-gates`; `npm run verify`; GitHub CI all checks passed | `docs/implementation/epics/EPIC-03-backend-modularization-completion.md` | WorkItem controller/service split, dashboard facade/query service, AI command/summarization split, module marker gate |
| EPIC 4 - Frontend Architecture Refactor | Completed | `main` | [#398](https://github.com/akpdeepak/bsmart-works/pull/398) | `cd works-frontend && npm test -- app-architecture`; `cd works-frontend && npm run build`; `npm run verify`; GitHub CI all checks passed | `docs/implementation/epics/EPIC-04-frontend-architecture-refactor-completion.md` | Thin `App.jsx` entrypoint, `src/app/AppShell.jsx` boundary, architecture guard |
| EPIC 5 - Premium Design System Refresh | Completed | `main` | [#399](https://github.com/akpdeepak/bsmart-works/pull/399) | `cd works-frontend && npm test -- page-layout design-system-tokens`; `cd works-frontend && npm run lint`; `cd works-frontend && npm run build`; `npm run verify`; GitHub CI all checks passed | `docs/implementation/epics/EPIC-05-premium-design-system-refresh-completion.md` | Adaptive `max-w-workspace` token, page-width guardrail, workspace surface width normalization |
| EPIC 6 - Simplified Information Architecture and Navigation | Completed | `main` | [#400](https://github.com/akpdeepak/bsmart-works/pull/400) | `cd works-frontend && npm test -- nav-model`; `cd works-frontend && npm run build`; `npm run verify`; GitHub CI all checks passed | `docs/implementation/epics/EPIC-06-simplified-navigation-completion.md` | Six-mode rail contract, setup/admin More destinations, command-palette reachability |
| EPIC 7 - bSmart Today | Completed | `main` | [#401](https://github.com/akpdeepak/bsmart-works/pull/401) | `cd works-frontend && npm test -- today-brief dashboard-view`; `npm run verify`; `cd works-frontend && npm run verify`; GitHub CI all checks passed | `docs/implementation/epics/EPIC-07-bsmart-today-completion.md` | Role-aware daily clarity band, max-five attention model, saved widget layout preserved |
| EPIC 8 - Smart Inbox | Completed | `main` | [#402](https://github.com/akpdeepak/bsmart-works/pull/402) | `cd works-frontend && npm test -- smart-inbox notifications-view`; `npm run verify`; `cd works-frontend && npm run verify`; GitHub CI all checks passed | `docs/implementation/epics/EPIC-08-smart-inbox-completion.md` | Action-first inbox grouping, actionable badge count, activity history preserved |
| EPIC 9 - bSmart Connect Messaging | In progress | `epic/09-connect-messaging` | | `cd works-frontend && npm test -- message-actions support-inbox-view` | `docs/implementation/epics/EPIC-09-connect-messaging.md` | Message-to-work-artifact reviewed draft actions in progress |
| EPIC 10 - Work Item Experience Redesign | Not started | | | | | |
| EPIC 11 - Project Command Center | Not started | | | | | |
| EPIC 12 - DevSync / Engineering Intelligence | Not started | | | | | |
| EPIC 13 - Universal AI Command Layer | Not started | | | | | |
| EPIC 14 - bSmart Answer Engine | Not started | | | | | |
| EPIC 15 - bSmart Canvas and AI-Generated Work Artifacts | Not started | | | | | |
| EPIC 16 - Knowledge and Document Workspace | Not started | | | | | |
| EPIC 17 - Service Desk and Customer Resolution | Not started | | | | | |
| EPIC 18 - SLA, Compliance, Governance, and Evidence | Not started | | | | | |
| EPIC 19 - Automation Builder and bSmart Agents | Not started | | | | | |
| EPIC 20 - Reports, Dashboards, BQL, and Leadership Intelligence | Not started | | | | | |
| EPIC 21 - Integrations, Migration, and Platform APIs | Not started | | | | | |
| EPIC 22 - People Graph, Skills, Stakeholders, and Customer Intelligence | Not started | | | | | |
| EPIC 23 - Onboarding, Templates, and Guided Adoption | Not started | | | | | |
| EPIC 24 - Mobile, PWA, Offline, Realtime, and Smoothness | Not started | | | | | |
| EPIC 26 - Product Analytics, Feedback, and Healthy Engagement Hooks | Not started | | | | | |
| EPIC 27 - Developer Experience and Agent-Ready Implementation System | Not started | | | | | |

## Latest handoff

2026-06-19: EPIC 0 was merged to `main` via
[#393](https://github.com/akpdeepak/bsmart-works/pull/393). It adds `CURRENT-STATE.md`, updates stale
repo/deploy facts, removes generated artifacts from Git tracking, restricts query-param JWT auth to
the realtime SSE stream, verifies shared status category resolver coverage, and records validation.
Resume with EPIC 1 unless GitHub evidence shows a newer EPIC has already been completed.

2026-06-19: EPIC 1 implemented and locally validated on `epic/01-tenant-rbac-hardening`. Scope covers
starred work-item tenant scoping, SCIM token issuance permission enforcement, dashboard
workspace-scoping, field layout project/workspace resolution, RBAC workspace-explicit role APIs, and
BQL membership-based workspace fallback. Validation: focused backend unit tests passed 37/37; broader
`cd works-backend && .\mvnw.cmd -Dgroups=unit verify` passed 1,335 tests with 0 Checkstyle
violations; `npm run guardrails` passed all blocking rules with the two existing non-blocking
baseline warnings.

2026-06-19: EPIC 1 merged to `main` via
[#394](https://github.com/akpdeepak/bsmart-works/pull/394), merge commit
`b1cc91c46c4a870bbfcaa8266afa991d2b6614aa`. GitHub CI passed all required jobs, including
frontend lint/build/test, backend compile/unit/integration/smoke, guardrails, secrets scan,
Storybook, Chromatic, bundle budget, and JetBrains plugin build. Local `main` and `origin/main` were
then updated with `d60d062` to mark EPIC 1 merged. Resume with EPIC 2.

2026-06-19: EPIC 2 implemented and locally validated on `epic/02-production-config-secrets`. Scope
covers prod/staging startup secret validation, dev-token exposure default hardening, public health
probes, deployment health indicators, env templates, Compose readiness, CI Compose smoke validation,
and Postgres/uploads backup/restore documentation. Validation: focused backend tests passed 8/8;
broader `cd works-backend && .\mvnw.cmd -Dgroups=unit verify` passed 1,341 tests with 0 Checkstyle
violations; Compose config validation passed for local/staging/production env templates; `npm run
guardrails` passed all blocking rules with the existing non-blocking raw-hex baseline warning.

2026-06-19: EPIC 2 merged to `main` via
[#395](https://github.com/akpdeepak/bsmart-works/pull/395), squash commit
`59b3c9891d7c8c0bf2bc88aebd426f092a205da7`. GitHub CI passed all required jobs, including the new
Deployment smoke Compose config gate, gitleaks, frontend lint/build/test, Storybook, Chromatic,
backend compile/unit/integration/smoke, guardrails, bundle budget, and JetBrains plugin build.
Resume with EPIC 25 partial.

2026-06-19: EPIC 25 partial is in progress on `epic/25-quality-gates`. Scope covers a new CI
quality gate for static frontend API route drift, axe harness/a11y coverage floor, AI fallback
telemetry visibility, stale custom-field/field-visibility route repairs, and knowledge
presence/edit-lock backend endpoints. Validation so far: `npm run quality-gates` passed;
`cd works-frontend && npm test -- field-settings presence` passed 37/37; `cd works-backend &&
.\mvnw.cmd -DskipTests "-Djacoco.skip=true" verify` passed with 0 Checkstyle violations.

2026-06-19: EPIC 25 partial merged to `main` via
[#396](https://github.com/akpdeepak/bsmart-works/pull/396), squash commit
`7c07f57f136ced3d0070f40f0cbd1e033298bce0`. GitHub CI passed all jobs, including the new
Quality gates job, gitleaks, guardrails, frontend lint/build/test, Storybook, Chromatic, backend
compile/unit/integration/smoke, deployment smoke, bundle budget, and JetBrains plugin build.
Resume with EPIC 3.

2026-06-19: EPIC 3 implemented locally on `epic/03-backend-modularization`. Scope covers canonical
module package markers, marker-presence architecture tests, WorkItem read/command service splits,
Dashboard facade/query split, and AI command execution/summarization service splits. Focused backend
validations passed for Architecture, WorkItem controller, Dashboard controller access, AI assist,
and AI heuristics tests. Broad validation also passed: `cd works-backend && .\mvnw.cmd -Dgroups=unit
verify` (1,342 tests, 0 Checkstyle violations), `npm run quality-gates`, and `npm run verify`
(blocking rules passed; existing non-blocking raw-hex baseline warning remains). Next: open PR, wait
for GitHub CI, merge to `main`, then mark EPIC 3 completed.

2026-06-19: EPIC 3 merged to `main` via
[#397](https://github.com/akpdeepak/bsmart-works/pull/397), squash commit
`b3e4833baef4915456e2b61073bcc9f717041230`. GitHub CI passed all jobs, including backend compile,
unit, integration, smoke, quality gates, guardrails, gitleaks, frontend lint/build/test, Storybook,
Chromatic, bundle budget, deployment smoke, and JetBrains plugin build. Local `main` and
`origin/main` are synced at the merge commit. Resume with EPIC 4.

2026-06-20: EPIC 4 is in progress on `epic/04-frontend-architecture-refactor`. First slice moved
the legacy shell to `works-frontend/src/app/AppShell.jsx`, reduced root `works-frontend/src/App.jsx`
to a thin entry wrapper, added `works-frontend/src/app/app-architecture.test.js` to prevent the
root app file from regrowing state/API logic, and updated the UI/UX scope gate to read the new
app shell boundary. Validation passed: `cd works-frontend && npm test -- app-architecture`;
`cd works-frontend && npm run build`; `npm run verify`.

2026-06-20: EPIC 4 merged to `main` via
[#398](https://github.com/akpdeepak/bsmart-works/pull/398), squash commit
`a2efbf1f5055788227a7896e07ae2f18ae21fd5c`. GitHub CI passed all jobs, including frontend
lint/build/test, Storybook, Chromatic, backend compile/unit/integration/smoke, guardrails, quality
gates, gitleaks, bundle budget, deployment smoke, and JetBrains plugin build. Local `main` and
`origin/main` are synced at the merge commit. Resume with EPIC 5.

2026-06-20: EPIC 5 is in progress on `epic/05-premium-design-system-refresh`. First slice replaces
the fixed dashboard width with an adaptive `max-w-workspace` design token, keeps `max-w-reading` for
prose/document surfaces, updates the page-width ESLint guardrail, and applies the token to selected
dashboard-like work surfaces. Validation target: `cd works-frontend && npm test -- page-layout
design-system-tokens`; `cd works-frontend && npm run lint`; `cd works-frontend && npm run build`;
`npm run verify`.

2026-06-20: EPIC 5 merged to `main` via
[#399](https://github.com/akpdeepak/bsmart-works/pull/399), squash commit
`e2fd708d9e4ab0a0450ef048bc4715a0bf47da8b`. GitHub CI passed all jobs, including frontend
lint/build/test, Storybook, Chromatic, backend compile/unit/integration/smoke, guardrails, quality
gates, gitleaks, bundle budget, deployment smoke, and JetBrains plugin build. Local `main` and
`origin/main` are synced at the merge commit. Resume with EPIC 6.

2026-06-20: EPIC 6 is in progress on `epic/06-simplified-navigation`. First slice preserves the
requested rail modes, Home, Deliver, Insight, Service, Know, Extend, moves setup/admin surfaces into
More/command-palette reachability, and adds nav-model tests for the six-mode contract. Validation
target: `cd works-frontend && npm test -- nav-model`; `cd works-frontend && npm run build`;
`npm run verify`.

2026-06-20: EPIC 6 merged to `main` via
[#400](https://github.com/akpdeepak/bsmart-works/pull/400), squash commit
`f63114e7f8d9cc2ca0878d596ad9a7ff55f95346`. GitHub CI passed all jobs, including frontend
lint/build/test, Storybook, Chromatic, backend compile/unit/integration/smoke, guardrails, quality
gates, gitleaks, bundle budget, deployment smoke, and JetBrains plugin build. Local `main` and
`origin/main` are synced at the merge commit. Resume with EPIC 7.

2026-06-20: EPIC 7 merged to `main` via
[#401](https://github.com/akpdeepak/bsmart-works/pull/401), squash commit
`b581e52d6155f72bfc89d4572c9a276a5221e14b`. GitHub CI passed all jobs, including frontend
lint/build/test, Storybook, Chromatic, backend compile/unit/integration/smoke, guardrails, quality
gates, gitleaks, bundle budget, deployment smoke, JetBrains plugin build, conventional commits,
AI rules, and DoD version checks. Local `main` and `origin/main` are synced at the merge commit.
Resume with EPIC 8.

2026-06-20: EPIC 8 merged to `main` via
[#402](https://github.com/akpdeepak/bsmart-works/pull/402), squash commit
`d47fc3c1f1cac1cd1d474d615a4dc3bc9d94a19e`. GitHub CI passed all jobs, including frontend
lint/build/test, Storybook, Chromatic, backend compile/unit/integration/smoke, guardrails, quality
gates, gitleaks, bundle budget, deployment smoke, JetBrains plugin build, conventional commits,
AI rules, and DoD version checks. Local `main` and `origin/main` are synced at the merge commit.
Resume with EPIC 9.

2026-06-20: EPIC 9 is in progress on `epic/09-connect-messaging`. First slice adds source-cited,
review-only message action drafts in Support Inbox for customer messages: task, decision, risk, and
customer commitment. It preserves existing support chat backend RBAC/workspace scope and does not
create official records automatically. Focused validation passed: `cd works-frontend && npm test --
message-actions support-inbox-view`. Next: run broader frontend/repo validation, open PR, wait for
GitHub CI, merge to `main`, then mark EPIC 9 completed.
