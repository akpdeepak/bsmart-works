# EPIC 8 - Smart Inbox Completion

Status: Code-verified complete; completion PR pending

Initial slice: [#402](https://github.com/akpdeepak/bsmart-works/pull/402)

Completion branch: `codex/epic-08-smart-inbox-completion`

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
