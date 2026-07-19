---
status: historical
superseded_by: ai-rules/AGENT-CORE.md
runtime_context: false
---

# bSmart Works — AI Agent Implementation Instructions

> Historical source material. It may support requirement discovery when cited by an active task, but
> it is not an operational instruction set.

## Purpose

This document is the operating playbook for **Claude Code**, **OpenAI Codex**, and any other coding agent working on bSmart Works.

Agents must use these two blueprint files as the source of truth:

1. `bSmart_Works_Implementation_Blueprint_Epic_Roadmap.md`
2. `bSmart_Works_Implementation_Blueprint_Epic_Roadmap_UIUX_Expanded.md`

The agent must implement the work **one EPIC at a time**, from the current GitHub `main` branch, with planning, implementation, unit testing, PR creation, merge, integration testing, validation, and then movement to the next EPIC.

This playbook is intentionally strict. Do not skip, ignore, merge, or shortcut any step.

---

# 1. Non-negotiable working rules

## 1.1 Source-of-truth rules

Before implementing any EPIC, the agent must read:

- the implementation roadmap EPIC section from `bSmart_Works_Implementation_Blueprint_Epic_Roadmap.md`
- the matching or related UI/UX section from `bSmart_Works_Implementation_Blueprint_Epic_Roadmap_UIUX_Expanded.md`
- current code in the repository
- existing tests related to the touched areas
- relevant README, AI rules, CLAUDE/AGENTS instructions, and guardrails

If the implementation blueprint and UI/UX blueprint overlap, combine them. If they conflict, choose the stricter requirement and document the decision in the EPIC plan.

## 1.2 One EPIC at a time

The agent must not work on multiple EPICs in the same implementation branch unless a prerequisite fix is unavoidable.

Allowed exception:

- a small dependency fix required to make the selected EPIC testable or safe

When an exception is used, document it under `Out of scope but required` in the EPIC execution plan.

## 1.3 No guessing

The agent must inspect the codebase before planning or implementing.

Do not assume:

- file names
- API contracts
- endpoint behavior
- database schema
- frontend state shape
- test commands
- migration naming
- existing component behavior
- security model
- workspace scoping rules

If something is unclear, inspect code first. If still unclear, create a documented assumption and choose the safest option.

## 1.4 No silent scope reduction

The agent must not quietly skip requirements or acceptance criteria.

If a requirement cannot be implemented in the current EPIC branch, the agent must:

1. explain why
2. create a follow-up task
3. mark it as blocked/deferred
4. not claim the EPIC is complete unless the missing item is explicitly accepted as deferred

## 1.5 Security first

Never introduce or preserve patterns that weaken:

- tenant isolation
- RBAC
- authentication
- authorization
- customer/internal message boundaries
- auditability
- external sharing controls
- attachment safety
- token handling
- AI permission boundaries

Known forbidden patterns:

- hardcoded production workspace ID such as `WS-001`
- accepting arbitrary `userId` request params for another user’s data
- unscoped workspace queries
- query-param JWT outside realtime SSE
- raw frontend calls to nonexistent backend endpoints
- silent AI fallback without telemetry
- inline serving of active uploaded content
- developer ranking by commit count or lines of code
- exposing internal messages to external/customer users

---

# 2. Required repository sync workflow

Every EPIC starts from the latest GitHub `main`.

```bash
git status
```

If there are uncommitted local changes, stop and inspect. Do not overwrite user/developer work.

Then sync:

```bash
git checkout main
git fetch origin
git pull --ff-only origin main
```

Verify:

```bash
git status
git log --oneline -5
```

Create a dedicated branch:

```bash
git checkout -b epic/<epic-number>-<short-slug>
```

Examples:

```bash
git checkout -b epic/01-tenant-security-rbac
git checkout -b epic/05-premium-design-system
git checkout -b epic/09-bsmart-connect-messaging
git checkout -b epic/12-devsync-engineering-intelligence
```

Branch rules:

- one EPIC per branch
- no unrelated cleanup
- no large formatting-only diffs mixed with feature work
- no force-push unless explicitly required and safe

---

# 3. EPIC execution cycle

For every EPIC, the agent must follow this exact cycle:

1. Sync latest `main`
2. Read both blueprint files
3. Select one EPIC
4. Inspect current codebase
5. Produce detailed EPIC execution plan
6. Break EPIC into implementation tasks
7. Implement incrementally
8. Run unit tests
9. Run frontend/backend verification as applicable
10. Run guardrails
11. Update docs/tests
12. Create PR
13. Wait for CI/review if required
14. Merge PR to `main` only after criteria pass
15. Pull latest `main`
16. Run integration validation
17. Record completion notes
18. Move to next EPIC

---

# 4. EPIC planning requirements

Before changing code, create or update an EPIC execution plan in the repo:

```text
docs/implementation/epics/EPIC-XX-<slug>.md
```

The plan must include:

```md
# EPIC XX — <Title>

## Blueprint references
- Implementation blueprint section:
- UI/UX blueprint section:

## Objective

## Why this matters

## Current codebase findings

## Files and modules inspected

## Requirements breakdown

## UI/UX requirements

## Backend requirements

## Frontend requirements

## Data model / migration requirements

## Security and RBAC requirements

## AI behavior requirements

## Accessibility requirements

## Observability requirements

## Test plan

## Acceptance criteria checklist

## Out of scope

## Risks and mitigations

## Implementation task list
```

The agent must fill this plan from real code inspection, not just copy the blueprint.

---

# 5. Codebase inspection checklist

For each EPIC, inspect relevant areas before coding.

## 5.1 Backend inspection

Check:

- controllers
- services
- repositories
- DTOs
- entities
- migrations
- security config
- RBAC service usage
- tests
- seed/demo data
- API paths
- OpenAPI behavior if applicable

Common locations:

```text
works-backend/src/main/java/com/bcits/works
works-backend/src/main/resources/db/migration
works-backend/src/test
works-backend/pom.xml
works-backend/Dockerfile
works-backend/src/main/resources/application.properties
```

## 5.2 Frontend inspection

Check:

- route registration
- app shell
- API clients under `src/lib`
- views under `src/views`
- design-system components under `src/components/works`
- tests
- Storybook stories
- CSS/tokens
- navigation model

Common locations:

```text
works-frontend/src/App.jsx
works-frontend/src/lib
works-frontend/src/views
works-frontend/src/components/works
works-frontend/src/index.css
works-frontend/tailwind.config.js
works-frontend/package.json
```

## 5.3 Documentation and guardrails inspection

Check:

```text
README.md
TECH-DEBT.md
CLAUDE.md
AGENTS.md
ai-rules
scripts/guardrails.sh
.github/workflows
```

---

# 6. Implementation rules

## 6.1 Incremental implementation

Implement in small commits.

Recommended commit shape:

```text
fix(security): enforce tenant scope on starred work items
feat(today): add priority summary cards
refactor(app): extract workspace provider from App.jsx
test(rbac): add cross-tenant dashboard denial tests
docs(epic): add EPIC 01 execution notes
```

## 6.2 Backend rules

Backend changes must:

- validate workspace membership
- use RBAC service where permission is required
- avoid map-heavy responses when DTOs are clearer
- preserve Flyway migration order
- include regression tests for security-sensitive changes
- avoid production fallbacks to demo workspace IDs
- keep controllers thin when possible

## 6.3 Frontend rules

Frontend changes must:

- use existing API client patterns, not raw fetch inside components
- use tokenized colors and spacing
- avoid raw hex values except token files/user color tools
- include loading, empty, error, and success states
- support keyboard navigation
- support light/dark mode
- preserve deep links
- respect workspace and role context

## 6.4 UI/UX rules

All UI work must satisfy the intended product feel:

- simple
- minimal
- premium
- calm
- professional
- visually engaging
- smooth
- reliable
- emotionally pleasant

Every major screen must define:

- primary user goal
- top 3 actions
- empty state
- loading state
- error state
- success state
- keyboard behavior
- mobile behavior
- accessibility behavior

## 6.5 AI feature rules

AI features must:

- show sources for important answers
- respect workspace/RBAC boundaries before retrieval and generation
- use deterministic fallback when AI is unavailable
- log fallback events
- not perform destructive or external actions without user review
- expose confidence/limitations when uncertain

## 6.6 Messaging rules

Messaging features must:

- separate internal and customer-visible conversations clearly
- prevent external users from seeing internal messages
- audit official decisions, approvals, and customer commitments
- allow AI suggestions but require approval before creating official work

## 6.7 DevSync rules

DevSync features must:

- store raw provider events before summarizing
- verify webhook signatures
- deduplicate events
- link code events to work items by key
- show unlinked activity
- cite raw events in summaries
- avoid toxic productivity metrics such as ranking by commit count or lines of code

---

# 7. Required test and validation commands

Run only commands supported by the current repo. The current repo contains these scripts.

## 7.1 Root verification

```bash
npm install
npm run guardrails
npm run ai-rules:check
npm run verify
```

If dependencies are already installed, avoid reinstalling unnecessarily.

## 7.2 Frontend verification

```bash
cd works-frontend
npm install
npm run lint
npm run test
npm run build
npm run verify
```

For UI/UX-heavy EPICs, also run where practical:

```bash
npm run build-storybook
npm run test:e2e
```

## 7.3 Backend verification

```bash
cd works-backend
./mvnw test
./mvnw -DskipTests package
```

If the environment cannot download dependencies, document the failure exactly and run all available static/targeted tests that do not require network access.

## 7.4 Full local integration validation

When the EPIC is merged to main, validate locally or in the configured integration environment:

```bash
git checkout main
git pull --ff-only origin main
npm run guardrails
cd works-frontend && npm run verify
cd ../works-backend && ./mvnw test
```

If Docker Compose is configured and dependencies are available:

```bash
docker compose up -d --build
```

Then validate core flows manually or with E2E tests:

- login
- workspace selection
- Today
- Inbox
- Messages
- Work item detail
- Project overview
- Knowledge
- Service request
- Admin/security area impacted by EPIC

---

# 8. Pull request protocol

## 8.1 Before PR

Before creating a PR, the agent must confirm:

- code compiles/builds where possible
- relevant unit tests pass
- guardrails pass
- docs updated
- EPIC execution plan updated
- acceptance checklist filled
- screenshots or UI notes added for UI changes
- no unrelated files changed

## 8.2 Create PR

Use GitHub CLI if available:

```bash
git push -u origin epic/<epic-number>-<short-slug>
gh pr create \
  --base main \
  --head epic/<epic-number>-<short-slug> \
  --title "EPIC <number>: <title>" \
  --body-file docs/implementation/epics/EPIC-XX-<slug>.md
```

If GitHub CLI is unavailable, push the branch and provide the PR title/body for manual creation.

## 8.3 PR body must include

```md
## Summary

## Blueprint references

## What changed

## Why

## How

## Files touched

## Security/RBAC impact

## UI/UX impact

## Tests run

## Acceptance criteria status

## Screenshots / recordings

## Known limitations

## Follow-up tasks
```

## 8.4 Merge protocol

Merge only when:

- CI passes
- required review is complete, if branch protection requires review
- acceptance criteria are met or explicitly deferred
- no critical unresolved comments remain

Preferred merge method:

```bash
gh pr merge --squash --delete-branch
```

If the repository requires a different merge policy, follow repository settings.

Do not bypass branch protection.

---

# 9. Post-merge integration validation

After merge:

```bash
git checkout main
git pull --ff-only origin main
```

Run integration validation:

- root guardrails
- frontend verify
- backend tests
- relevant E2E tests
- manual smoke validation for changed surfaces

Create or update:

```text
docs/implementation/epics/EPIC-XX-<slug>-completion.md
```

Completion note must include:

```md
# EPIC XX Completion Note

## Merged PR

## Merge commit

## Validation date

## Tests run after merge

## Integration validation result

## Acceptance criteria final status

## Production/deployment notes

## Follow-up EPICs or tasks
```

Only after this is complete may the agent move to the next EPIC.

---

# 10. EPIC order

Follow the implementation sequence from the blueprint unless a dependency requires adjustment.

## Phase 1 — Safety and truth

1. EPIC 0 — Current-State Hardening, Truth, and Delivery Baseline
2. EPIC 1 — Multi-Tenant Security and RBAC Hardening
3. EPIC 2 — Production Configuration, Deployment, and Secrets Safety
4. EPIC 25 partial — Reliability, Testing, Accessibility, Performance, and Quality Gates

## Phase 2 — Architecture and premium shell

5. EPIC 3 — Backend Modularization and Service Boundaries
6. EPIC 4 — Frontend Architecture Refactor
7. EPIC 5 — Premium Design System Refresh
8. EPIC 6 — Simplified Information Architecture and Navigation

## Phase 3 — Daily habit core

9. EPIC 7 — bSmart Today
10. EPIC 8 — Smart Inbox
11. EPIC 9 — bSmart Connect Messaging

## Phase 4 — Execution core

12. EPIC 10 — Work Item Experience Redesign
13. EPIC 11 — Project Command Center
14. EPIC 12 — DevSync / Engineering Intelligence

## Phase 5 — Intelligence layer

15. EPIC 13 — Universal AI Command Layer
16. EPIC 14 — bSmart Answer Engine
17. EPIC 15 — bSmart Canvas and AI-Generated Work Artifacts

## Phase 6 — Enterprise depth

18. EPIC 16 — Knowledge and Document Workspace
19. EPIC 17 — Service Desk and Customer Resolution
20. EPIC 18 — SLA, Compliance, Governance, and Evidence
21. EPIC 19 — Automation Builder and bSmart Agents
22. EPIC 20 — Reports, Dashboards, BQL, and Leadership Intelligence

## Phase 7 — Ecosystem, adoption, and scale

23. EPIC 21 — Integrations, Migration, and Platform APIs
24. EPIC 22 — People Graph, Skills, Stakeholders, and Customer Intelligence
25. EPIC 23 — Onboarding, Templates, and Guided Adoption
26. EPIC 24 — Mobile, PWA, Offline, Realtime, and Smoothness
27. EPIC 26 — Product Analytics, Feedback, and Healthy Engagement Hooks
28. EPIC 27 — Developer Experience and Agent-Ready Implementation System

Also apply all UI/UX expanded blueprint EPICs continuously to every frontend-facing EPIC.

---

# 11. UI/UX implementation overlay

For every EPIC that touches the frontend, apply the UI/UX expanded blueprint as an overlay.

The agent must check:

- product experience architecture
- app shell and spatial system
- visual identity
- typography/readability
- design token usage
- component reuse
- Today UX
- Inbox UX
- Messaging UX
- Work Item UX
- Project Command Center UX
- DevSync UX
- AI trust UX
- search/command UX
- dashboard/report UX
- knowledge/document UX
- service desk/customer portal UX
- onboarding and empty states
- motion and perceived smoothness
- accessibility and keyboard UX
- content design and microcopy
- healthy engagement hooks
- mobile/tablet behavior
- visual regression and design QA

Do not mark a frontend EPIC complete unless its UI/UX acceptance criteria are satisfied.

---

# 12. Definition of Done for every EPIC

An EPIC is done only when all relevant items are complete:

## Planning

- blueprint sections read
- code inspected
- EPIC execution plan created
- tasks broken down
- risks documented

## Implementation

- code implemented
- security/RBAC considered
- UI/UX criteria applied
- data migrations added where needed
- docs updated

## Testing

- unit tests added/updated
- frontend tests added/updated where applicable
- backend tests added/updated where applicable
- guardrails pass
- builds pass where possible
- E2E/manual smoke validation done for user-facing flows

## Review and merge

- PR created
- PR body complete
- CI passes
- review completed if required
- PR merged to `main`

## Post-merge

- latest `main` pulled
- integration validation run
- completion note created
- follow-up tasks documented

If any required item is missing, the EPIC is not done.

---

# 13. Required output from the agent during each EPIC

For every EPIC, the agent must produce these artifacts in the repo:

```text
docs/implementation/epics/EPIC-XX-<slug>.md
docs/implementation/epics/EPIC-XX-<slug>-completion.md
```

For UI-heavy EPICs, also include:

```text
docs/implementation/epics/EPIC-XX-<slug>-ui-notes.md
```

For API-heavy EPICs, also include:

```text
docs/implementation/epics/EPIC-XX-<slug>-api-notes.md
```

For security-heavy EPICs, also include:

```text
docs/implementation/epics/EPIC-XX-<slug>-security-notes.md
```

---

# 14. Agent self-check before moving to the next EPIC

Before moving to another EPIC, answer these questions in the completion note:

1. Did I start from latest `main`?
2. Did I read both blueprint files?
3. Did I inspect current code before planning?
4. Did I implement only this EPIC’s scope?
5. Did I satisfy all acceptance criteria?
6. Did I add or update tests?
7. Did I run unit tests?
8. Did I run frontend/backend verification where applicable?
9. Did I run guardrails?
10. Did I create a PR?
11. Did the PR pass CI?
12. Was the PR merged to `main`?
13. Did I pull latest `main` after merge?
14. Did I run integration validation after merge?
15. Did I create a completion note?
16. Are all follow-ups documented?

If any answer is “no,” do not proceed to the next EPIC until resolved or explicitly deferred.

---

# 15. Final instruction to Claude Code / OpenAI Codex

You are not here to quickly patch isolated files.

You are here to turn bSmart Works into a secure, premium, AI-native enterprise work operating system.

Work carefully.

Start from latest `main`.

Read the two blueprint files.

Take one EPIC.

Understand the current code.

Create a detailed plan.

Implement safely.

Test thoroughly.

Create a PR.

Merge only when valid.

Run integration validation.

Document completion.

Then move to the next EPIC.

Do not skip steps. Do not bypass tests. Do not ignore UI/UX. Do not weaken security. Do not claim completion without evidence.
