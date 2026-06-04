# Parked Items — Spec Refactor Pipeline

> Findings surfaced during a spec run that belong to a **different** spec (master prompt §5 rule 3:
> one spec per run, scope locked after Phase 2). Each item names the spec that should absorb it.
> Do not fix parked items in the run that found them.

| Found in | Item | Target spec | Notes |
|----------|------|-------------|-------|
| I01-S01 Authentication & identity | RBAC checks performed in `WorkspaceController` instead of the service layer (CLAUDE.md §4 / RB-10 §2) | I01-S02 Workspaces / Iteration 3 permissions | Move `rbac.require(...)` calls into the service. |
| I01-S01 | Multi-workspace selection at login + tenant context (`workspace_id`) in the JWT/session | I01-S02 Workspaces | Governance-sensitive (RB-40 §1) — do not change the tenant model silently. |
| I01-S01 | `App.jsx` is a ~2500-line monolith; only the auth surface is being extracted now | Tech-debt (`TECH-DEBT.md`) | Cross-cutting; affects every frontend spec — decompose deliberately. |
| I01-S01 | No refresh-token / JWT revocation (blacklist) mechanism | Iteration 19 — Enterprise Security | Stateless JWT acceptable for MVP. |
| I01-S01 | Legacy SHA-256 password path still active | Iteration 19 / chore | Remove after auditing all users migrated to BCrypt. |
| I01-S01 | No workspace-level "enforce MFA" policy | Iteration 19 — Enterprise Security | MFA is opt-in for MVP. |
