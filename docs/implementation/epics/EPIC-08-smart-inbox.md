# EPIC 8 - Smart Inbox

Status: Completed

Branch: `codex/epic-08-smart-inbox-completion`

Completion PR: [#489](https://github.com/akpdeepak/bsmart-works/pull/489)

Roadmap: V.20 Phase 3

## Intent

Make Inbox an action queue for work that needs the authenticated caller now. Keep passive
notification history separate, and preserve source-domain authority when an action is completed.

## Scope Reconciliation

PR #402 delivered a frontend classifier, grouped presentation, and local snooze behavior. A
production-code audit found that it did not yet provide server-authoritative actionable count,
durable per-item state, direct source mutations, source-domain aggregation, an AI Control Plane
summary, or explicit notification workspace ownership. Those gaps are in this completion slice.

The source requirements are reconciled to the current architecture as follows:

| Requirement | Production implementation | Executable proof |
|---|---|---|
| Approvals, mentions, assignments, waits, alerts, customer replies, code reviews | `SmartInboxService` projects the existing article, notification, work-item, support-chat, and pull-request domains | EPIC gate + fresh-Postgres integration test |
| Actionable count only | `/api/v1/inbox/count` counts the same visible action projection used by Inbox | controller unit test + frontend tests |
| Direct action | One primary action plus secondary actions; approve/reject, reply, claim, review/open, done, snooze, and conversion use real APIs | `notifications-view.test.jsx` |
| Source links | Every projection carries source type/id/link; internal work opens detail and external code reviews open the source URL | frontend tests |
| Durable snooze and quiet hours | `inbox_item_states` persists caller/workspace item state; existing push preferences remain reachable | migration + frontend tests |
| Missed summary with sources | `inbox_summary` runs through the AI Control Plane and retains deterministic grouped fallback and exact source links | EPIC gate + frontend tests |
| RBAC and tenant isolation | Controllers derive user identity from `AuthenticatedUser`; services require workspace membership/permission; notification reads and writes include workspace | controller tests + two-workspace Postgres test + tenant-filter architecture test |
| Activity remains separate | Workspace-scoped `NotificationActivityService` backs the Activity tab independently from actionable Inbox | controller/access tests + Postgres test |

## Delivery Set

- Add explicit workspace ownership to new notifications and safe source-derived ownership for
  resolvable legacy rows.
- Add durable per-workspace, per-user Inbox snooze and done state with Flyway V120.
- Add the Smart Inbox service/controller projection, exact count, mutations, low-priority bulk clear,
  and governed missed summary.
- Route every notification producer through workspace-aware creation and remove user-only Activity
  repository methods.
- Replace message-regex classification with server-projected intent while retaining a type-only
  compatibility helper.
- Wire the app shell and Inbox view to independent Actions, Activity, and Preferences data flows.
- Provide loading, empty, error, keyboard/focus, and axe-verified states.

## Acceptance Criteria

- [x] Inbox contains approvals, mentions/replies, assignments, waits/blockers, alerts, customer
  replies, and code-review requests from authoritative source domains.
- [x] The badge and Actions tab show the exact actionable projection count, excluding passive
  Activity.
- [x] Every item has one primary action, optional secondary actions, snooze, and done.
- [x] Approve/reject, reply, claim/assign, review/open, and convert-to-work operate on real APIs.
- [x] Low/normal-priority bulk clear is re-authorized and filtered by the server.
- [x] Per-item snooze/done state and quiet-hour preferences are durable.
- [x] Missed summary is source-linked, AI-governed, and has a deterministic fallback.
- [x] Caller identity, RBAC, and workspace ownership are server-enforced.
- [x] Activity remains a separately readable and mutable workspace-scoped history.
- [x] Read transactions carry a two-second budget and run against fresh PostgreSQL migrations.

## Validation Plan

- [x] `npm run epic:8` - 13/13 code-derived acceptance checks
- [x] `npm run verify` - repository guardrails and EPIC gates
- [x] `cd works-frontend && npm run lint && npm test && npm run build && npm run build-storybook`
  - 0 lint errors (33 pre-existing warnings), 1,798 tests across 246 files, production build, and Storybook
- [x] `cd works-backend && ./mvnw -Dgroups=unit verify`
  - 1,459 tests, JaCoCo, Checkstyle, and architecture tests
- [x] `cd works-backend && ./mvnw -Dgroups=integration verify`
  - 128 tests on fresh PostgreSQL containers with all migrations through V120
- [x] `cd works-backend && ./mvnw -Dtest=SmartInboxTenantIsolationIT test`
  - 3 same-user/two-workspace isolation, durable-state, Activity, and read-budget tests
- GitHub required checks, squash merge, and post-merge `main` validation

---

# EPIC 8 - Smart Inbox Completion

Status: Completed

Initial slice: [#402](https://github.com/akpdeepak/bsmart-works/pull/402)

Completion branch: `codex/epic-08-smart-inbox-completion`

Completion PR: [#489](https://github.com/akpdeepak/bsmart-works/pull/489)

Validated: 2026-07-19

## Codebase Audit

The prior completion note overstated the frontend-only slice. The production audit found local
regex classification, a count derived after fetching only the first notification page, browser-only
snooze state, placeholder action behavior, no source-domain action projection, no governed summary,
and notifications scoped by user rather than workspace. This completion set closes those gaps.

## Delivered

- Added `SmartInboxService` and `SmartInboxController` as the server-authoritative action projection
  and HTTP boundary.
- Aggregated unread action notifications, article approvals, pull-request reviews, escalated support
  chats, and assigned waiting/blocked work with source links and stable item keys.
- Added exact actionable count, durable snooze/done, low-priority bulk completion, and one primary
  action plus explicit secondary actions.
- Added direct article approve/reject, comment/customer reply, support-chat claim, source review/open,
  and real work-item conversion flows.
- Added the `inbox_summary` AI Control Plane capability with exact sources and deterministic grouped
  fallback.
- Added V120 notification workspace ownership and `inbox_item_states`; unresolved historical
  notifications remain excluded rather than guessed into a tenant.
- Made every in-scope notification producer set workspace ownership and removed user-only
  notification repository reads.
- Added a separately scoped `NotificationActivityService` and kept push quiet-hours/global snooze
  preferences reachable from Inbox.
- Replaced message-text regexes with explicit server intent in the UI and preserved responsive,
  empty, loading, error, focus, and accessibility states.

## Verification Evidence

- `SmartInboxTenantIsolationIT`: fresh PostgreSQL, all migrations through V120, same-user/two-workspace
  Inbox and Activity isolation, durable state isolation, and read-budget proof.
- `TenantFilterCoverageTest`: `Notification` is classified and filtered as tenant-owned.
- `SmartInboxControllerTest` and `NotificationControllerAccessTest`: authenticated-caller and
  workspace-scoped controller contracts.
- `notifications-view.test.jsx`: direct actions, persisted state, bulk clear, source links, summary,
  preferences, error handling, and axe coverage.
- `scripts/epic-08-completion.mjs`: 13/13 code-derived EPIC acceptance checks.
- Full frontend: 1,798 tests across 246 files, zero lint errors, production build, and Storybook.
- Full backend: 1,459 unit tests and 128 fresh-PostgreSQL integration tests, with JaCoCo,
  Checkstyle, architecture checks, and migrations through V120 green.
- Full repository `npm run verify` gate is green.

The completion PR, CI, merge commit, and post-merge evidence are recorded in
`docs/implementation/ROADMAP-STATE.md` as their respective gates complete.
