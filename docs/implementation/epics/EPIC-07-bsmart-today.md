# EPIC 7 - bSmart Today

Status: Completed
Branch: `codex/epic-07-today-completion`
Roadmap: V.20 Phase 3 / W3

## Intent

Make `/` a calm, role-aware daily clarity surface that answers what matters, why it matters, and
what the user can do next without opening a dense reporting grid.

## Code-Reconciled Scope

The June 2026 slice supplied the Daily clarity band and configurable role canvases, but production
code still lacked actionable attention state, support-agent Today, selected-workspace scoping on the
developer aggregate, visible AI provenance/fallback, and several source-domain signals. This
closeout owns those gaps.

- Keep Today as the authenticated `/` landing page.
- Preserve developer, scrum-master/team-lead, product-owner/PM, executive, and admin layouts; add
  the support-agent layout because Service Desk and customer chat already exist in production.
- Build attention from real priorities, approvals/waits, blockers, SLA/customer/code risk,
  important customer messages, and DevSync activity.
- Show at most five signals, with a reason, source, Open action, snooze, and dismiss on each.
- Persist attention state by workspace, user, and role; a changed signal fingerprint must reappear
  and returning users must see newly introduced signals.
- Render the AI summary returned by the AI Control Plane, exact work-item source links, model/fallback
  metadata, and a deterministic fallback when AI is unavailable.
- Preserve personal and workspace role-template widget customization.
- Require selected-workspace predicates and server RBAC for every Today aggregate.
- Enforce a two-second read budget and validate the hot path on a fresh seeded PostgreSQL schema.

## Acceptance Scenarios

- Happy: every authorized role opens a populated, actionable Today surface.
- Edge: attention remains capped at five; changed dismissed signals return; snoozed signals return
  after their deadline.
- Empty: quiet-win copy replaces an empty attention list; AI fallback remains visible.
- Error: failed AI calls produce deterministic content rather than a blank card.
- Unauthorized: dashboard endpoints fail before service access when workspace/permission checks fail.
- Cross-tenant: a multi-workspace user receives only the explicitly selected workspace; support
  conversations and messages cannot cross the workspace boundary.
- Performance: dashboard reads carry a two-second transaction timeout and the selected-workspace
  integration scenario completes inside two seconds on seeded data.

## Verification

- `node scripts/epic-07-completion.mjs`
- `cd works-frontend && npm run verify`
- `cd works-backend && ./mvnw -Dgroups=unit verify`
- `cd works-backend && ./mvnw test-compile failsafe:integration-test failsafe:verify`
- `npm run verify`
- GitHub PR checks, squash merge, and post-merge `main` verification

---

# EPIC 07 Completion - bSmart Today

Date: 2026-07-19
Branch: `codex/epic-07-today-completion`
Status: Completed

## Scope Completed

- Kept Today as the authenticated `/` landing and retained the existing configurable role canvas.
- Added an authorized support-agent role/layout backed by workspace-scoped customer conversations,
  SLA risk, and recent unresolved customer messages.
- Completed the daily signal model across priorities, approval/wait states, blockers, SLA/customer/
  code risks, messages, DevSync highlights, suggested actions, and quiet wins.
- Added Open, snooze-until-tomorrow, and dismiss controls to every attention card while retaining the
  maximum-five default.
- Namespaced persisted attention state by workspace/user/role, fingerprints current signal content,
  and marks signals introduced since the prior visit as new.
- Made the AI brief universal across roles, caller-only, source-linked, metadata-labelled, and
  visibly deterministic when the AI Control Plane falls back.
- Closed the developer dashboard's multi-workspace leak: the selected workspace is now mandatory at
  the controller, service, frontend request, and every aggregate query.
- Added a two-second read-only transaction budget around role dashboards and executable fresh-DB
  timing/isolation coverage.

## Code-Derived Evidence

`scripts/epic-07-completion.mjs` executes the pure Today model and inspects production wiring. It
verifies the `/` route, six layouts, selected-workspace predicates, maximum-five behavior, action
controls, changed-signal handling, caller-only AI sources/fallback, support RBAC/data, all required
signal domains, server-backed layout customization, the two-second budget, and axe coverage.

## Local Validation

- EPIC gate: 11/11 checks passed.
- Frontend full suite: 1,797 tests across 246 files passed; ESLint and production build passed.
- Frontend focused suite: 24 tests passed, including Today behavior and axe.
- Storybook production build passed.
- Backend full unit suite: 1,457 tests passed; JaCoCo and Checkstyle passed.
- Backend focused suite: 37 tests passed.
- Backend full integration suite: 125 tests passed on fresh PostgreSQL/Flyway schemas.
- Fresh PostgreSQL/Flyway V119 `WorkspaceTenantIsolationIT`: 7 tests passed, including developer
  same-user/two-workspace isolation, support conversation/message isolation, and the two-second path.
- Repository gate: guardrails, quality gates, generated-rule parity, EPICs 1-7, and the task-process
  contract all passed.

GitHub CI remains required before merge. No migration was needed; Flyway remains V119.
