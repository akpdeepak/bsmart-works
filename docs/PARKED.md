# Parked Items — Spec Refactor Pipeline

> Findings surfaced during a spec run that belong to a **different** spec (master prompt §5 rule 3:
> one spec per run, scope locked after Phase 2). Each item names the spec that should absorb it.
> Do not fix parked items in the run that found them.

| Found in | Item | Target spec | Notes |
|----------|------|-------------|-------|
| ~~I01-S01~~ | ~~RBAC checks in `WorkspaceController` instead of the service layer~~ | ~~I01-S02~~ | **RESOLVED in I01-S02** — moved into `WorkspaceService`. |
| ~~I01-S01~~ | ~~Multi-workspace selection at login + tenant context~~ | ~~I01-S02~~ | **RESOLVED in I01-S02** — `/workspaces/mine` + real switcher + membership-enforced isolation (identity-only JWT, Decision B). |
| ~~I01-S02~~ | ~~`workspace_id` column on the `events` table / `AppEvent`~~ | ~~I01-S04~~ | **RESOLVED in I01-S04** — V39 adds + backfills `workspace_id` and an append-only trigger; `EventService.recordInWorkspace`. |
| I01-S04 Event store | CI has **no DB / Flyway stage** — migrations (incl. the V39 trigger/backfill) and integration tests are never executed in CI; this is how the V35 collision and the #75 compile skew slipped through | Process / CI | Add a Testcontainers job that runs Flyway end-to-end (validates migrations + append-only trigger) and gate merges on it. |
| I01-S04 | Remaining 15 event producers still call `EventService.record(...)` (workspace_id null on new rows until adopted) | Per domain spec (S05/S07/S09/…) | Switch each to `recordInWorkspace(...)` as that domain is refactored; existing rows already backfilled by V39. |
| I01-S02 | Workspace switch does a full page reload to refetch tenant-scoped data | I01-S03 App shell | Replace with an in-place soft refetch once the app shell / data layer is decomposed. |
| I01-S02 | The other 4 controllers still call RBAC directly (`Project`, `Sprint`, `WorkItem`, `Rbac`); a global "no-RBAC-in-controller" ArchUnit rule would force their refactor | I01-S05 / I02-S02 / I01-S07 / Iteration 3 | Relocate each in its own spec, then add the global rule — avoid building ahead. |
| I01-S01 | `App.jsx` is a ~6700-line monolith; only the auth surface is being extracted now | Tech-debt (`TECH-DEBT.md`) | Cross-cutting; affects every frontend spec — decompose deliberately. |
| I01-S03 App shell | App.jsx renders a legacy inline white sidebar while a polished `SidebarNav` organism sits unused — a second parallel shell implementation | Tech-debt / monolith decomposition | Converge onto `SidebarNav` without regressing the S02 workspace switcher; large, do deliberately. |
| I01-S01 | No refresh-token / JWT revocation (blacklist) mechanism | Iteration 19 — Enterprise Security | Stateless JWT acceptable for MVP. |
| I01-S01 | Legacy SHA-256 password path still active | Iteration 19 / chore | Remove after auditing all users migrated to BCrypt. |
| I01-S01 | No workspace-level "enforce MFA" policy | Iteration 19 — Enterprise Security | MFA is opt-in for MVP. |
| I01-S01 | Unauthenticated requests to protected endpoints return `403` instead of `401` (no `AuthenticationEntryPoint` configured in `SecurityConfig`) | Chore / Iteration 19 — Enterprise Security | Found during live validation. App-wide behaviour, pre-existing; security property (access denied) holds. Add a 401 entry point — affects all protected routes + frontend 401-handling, so do deliberately, not inside a feature PR. |
