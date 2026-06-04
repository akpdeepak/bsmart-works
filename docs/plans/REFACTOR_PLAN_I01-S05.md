# Refactor Plan — I01-S05 · Cap B · Projects

**Iteration:** 1 · **Mode:** AUTO. **Spec:** *"Containers with unique key prefix (WEB, AMR), lead, members, archive option, slug-based URLs."*
**Classification:** **Partial** — projects, key prefix, lead, members, archive, slugs all exist; but RBAC lived in the controller and reads leaked across tenants.

## Phase 1 — findings
- **RBAC in `ProjectController`** + raw JDBC (parked from I01-S02). 🔴 **Cross-tenant read leaks (RB-40 §1):** `getAllProjects()` with no `workspaceId` returned `findAll()` — **every project in every tenant**; `getBySlug`/`getProjectMembers` did no membership check. Hardcoded `"WS-001"` create fallback. Project mutations recorded only an ad-hoc string event (or none).

## Phase 2 — scope (in)
1. **`ProjectService`** owns logic + RBAC + data access; controller is thin (RB-10 §2 — resolves the parked RBAC item).
2. **Tenant isolation (RB-40 §1):** `list` requires membership when a workspace is given, else returns projects only from the caller's workspaces (never `findAll()`); `getBySlug` + `getMembers` 404 for non-members. Create now **requires** a workspace (400 if missing) instead of defaulting to `WS-001`.
3. **Workspace-scoped events** via `recordInWorkspace` (I01-S04): `PROJECT_CREATED/_ARCHIVED/_UNARCHIVED/_DELETED`.

## Out of scope (parked)
- Soft-delete + 30-day trash for projects (Constitution Part 4) — projects currently hard-delete; trash exists for work items. Parked to a dedicated trash/retention pass.
- Frontend `/projects` fetch is left tenant-safe by the backend default (caller's workspaces); scoping the board's project list to the active workspace is a frontend follow-up.

## Tests / validation
- New `ProjectServiceTest` (6): non-member list/slug → 404, no-workspace list → caller's workspaces only (never `findAll()`), empty memberships → empty, create without workspace → 400, create happy path → slug + workspace-scoped event. `ProjectControllerAccessTest` adapted to the thin controller (RBAC→403 preserved). **201 backend unit tests green.** No migration.

## Risk
- Low/medium: read semantics changed (now tenant-safe). `list` without a workspace returns the caller's member projects — non-breaking for the frontend's bare `/projects` call. Revert = revert branch.
