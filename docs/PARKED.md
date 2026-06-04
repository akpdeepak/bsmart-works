# Parked Items — Spec Refactor Pipeline

> Findings surfaced during a spec run that belong to a **different** spec (master prompt §5 rule 3:
> one spec per run, scope locked after Phase 2). Each item names the spec that should absorb it.
> Do not fix parked items in the run that found them.

| Found in | Item | Target spec | Notes |
|----------|------|-------------|-------|
| ~~I01-S01~~ | ~~RBAC checks in `WorkspaceController` instead of the service layer~~ | ~~I01-S02~~ | **RESOLVED in I01-S02** — moved into `WorkspaceService`. |
| ~~I01-S01~~ | ~~Multi-workspace selection at login + tenant context~~ | ~~I01-S02~~ | **RESOLVED in I01-S02** — `/workspaces/mine` + real switcher + membership-enforced isolation (identity-only JWT, Decision B). |
| I01-S02 Workspaces | `workspace_id` column on the `events` table / `AppEvent` (RB-40 §1 wants it on every event) | I01-S04 Event store foundation | Event-store **contract change** touching every `EventService` caller — belongs with the event-store spec, not a feature PR. I01-S02 attributes workspace events via `aggregate_id`. |
| I01-S02 | Workspace switch does a full page reload to refetch tenant-scoped data | I01-S03 App shell | Replace with an in-place soft refetch once the app shell / data layer is decomposed. |
| I01-S02 | The other 4 controllers still call RBAC directly (`Project`, `Sprint`, `WorkItem`, `Rbac`); a global "no-RBAC-in-controller" ArchUnit rule would force their refactor | I01-S05 / I02-S02 / I01-S07 / Iteration 3 | Relocate each in its own spec, then add the global rule — avoid building ahead. |
| I01-S01 | `App.jsx` is a ~6700-line monolith; only the auth surface is being extracted now | Tech-debt (`TECH-DEBT.md`) | Cross-cutting; affects every frontend spec — decompose deliberately. |
| I01-S01 | No refresh-token / JWT revocation (blacklist) mechanism | Iteration 19 — Enterprise Security | Stateless JWT acceptable for MVP. |
| I01-S01 | Legacy SHA-256 password path still active | Iteration 19 / chore | Remove after auditing all users migrated to BCrypt. |
| I01-S01 | No workspace-level "enforce MFA" policy | Iteration 19 — Enterprise Security | MFA is opt-in for MVP. |
| I01-S01 | Unauthenticated requests to protected endpoints return `403` instead of `401` (no `AuthenticationEntryPoint` configured in `SecurityConfig`) | Chore / Iteration 19 — Enterprise Security | Found during live validation. App-wide behaviour, pre-existing; security property (access denied) holds. Add a 401 entry point — affects all protected routes + frontend 401-handling, so do deliberately, not inside a feature PR. |
