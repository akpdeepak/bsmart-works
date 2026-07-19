# EPIC 07 Completion - bSmart Today

Date: 2026-07-19
Branch: `codex/epic-07-today-completion`
Status: Code-verified; PR [#487](https://github.com/akpdeepak/bsmart-works/pull/487) awaiting CI

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
