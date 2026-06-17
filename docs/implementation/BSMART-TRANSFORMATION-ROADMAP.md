# bSmart Works Transformation Roadmap

This document makes Deepak's transformation roadmap executable across Claude Code, Codex, GPT Code,
and future AI coding sessions. It does not replace the blueprint files; it points every agent to the
same source material and operating loop.

## Trigger phrases

When Deepak says either phrase below, treat it as a command to work the roadmap end to end:

- `Start the bSmart Transformation Roadmap`
- `Resume the bSmart Transformation Roadmap`

## Required source material

Read these before planning or coding:

1. `C:\Users\user\Downloads\bSmart_Works_Implementation_Blueprint_Epic_Roadmap.md`
2. `C:\Users\user\Downloads\bSmart_Works_Implementation_Blueprint_Epic_Roadmap_UIUX_Expanded.md`
3. `C:\Users\user\Downloads\bSmart_Works_AI_Agent_Implementation_Instructions.md`
4. `AGENTS.md`
5. `CLAUDE.md`
6. `ai-rules/00-ORCHESTRATOR.md`
7. `ai-rules/SOURCE-OF-TRUTH.md`
8. Applicable `ai-rules/rulebooks/*`
9. `docs/implementation/ROADMAP-STATE.md`

If the Downloads files are unavailable in a remote-only session, continue from this repo-tracked
roadmap, `ROADMAP-STATE.md`, and existing EPIC plans/completion notes. Record the missing local files
as a limitation in the active EPIC plan.

## Roadmap operating rules

- The agent doing the work owns implementation, verification, PR creation, merge tracking, local
  sync, and completion notes, subject to branch protection, CI, and explicit human approval gates.
- Work one EPIC at a time.
- Start from latest GitHub `main` unless resuming a valid in-progress EPIC branch.
- Never overwrite uncommitted user/developer work.
- Inspect the actual repo before planning.
- Treat security, RBAC, tenant isolation, workspace scoping, auditability, and production safety as
  first-order requirements.
- Treat the UI/UX expanded blueprint as a mandatory overlay for every frontend-facing EPIC.
- Do not claim an EPIC is complete until code is merged to GitHub `main`, local `main` is updated,
  verification is run, and the completion note plus `ROADMAP-STATE.md` are updated.

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

