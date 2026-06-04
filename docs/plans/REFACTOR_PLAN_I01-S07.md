# Refactor Plan — I01-S07 · Cap B · WorkItem CRUD with rich text

**Iteration:** 1 · **Mode:** AUTO. **Spec:** *"Create/read/update/delete with title, description (WYSIWYG), status, assignee, due date, tags. Optimistic concurrency."*
**Classification:** **Partial** — full CRUD, tags, assignee/status/due, WYSIWYG description, and optimistic concurrency (`ConcurrencyGuard`) all exist and writes are RBAC-gated; but the **read** endpoints leaked across tenants and two write paths were unguarded.

## Phase 1 — findings (🔴 RB-40 §1)
- `getAllWorkItems`, `getTrash`, `search`, `getBacklog` ran `SELECT … FROM work_items` with **no tenant scoping** — every work item in every workspace was returned to any authenticated caller. This is the core-data cross-tenant leak.
- `restoreFromTrash` and `backlog/reorder` mutated any item by id with **no RBAC/tenant check**.

## Phase 2 — scope (in)
1. **Tenant-scope every list/search read** via a shared `MEMBER_PROJECTS` predicate — an item is visible only when its project is in a workspace the caller belongs to (`projects ⋈ workspace_members WHERE wm.user_id = ?`). Applied to list, trash, search, backlog.
2. **Guard the unguarded writes:** `restore` now resolves the item's workspace and requires `delete_items`; `reorder`'s `UPDATE` is constrained to the caller's workspaces so a stray id can't touch another tenant's item.

## Out of scope (parked)
- Extracting a `WorkItemService` (RBAC out of the 368-line controller) — RBAC is already enforced in-controller; the layer refactor stays parked (PARKED.md) to avoid a high-risk rewrite. The **tenant leak** (higher severity) is fixed here.
- `description` server-side HTML sanitization for the WYSIWYG field (frontend already sanitizes via DOMPurify) — parked to the security pass.

## Tests / validation
- New `WorkItemTenantScopeTest` captures the list SQL and asserts it confines to the caller's workspaces (cross-tenant guard, RB-40). `WorkItemControllerAccessTest` (write RBAC) unchanged + green. **205 backend unit tests green.** No migration.

## Risk
- Medium (touches core read paths). Mitigation: predicate is additive (`AND project_id IN (…)`); the caller's own items remain visible; reviewed param ordering. The DB-level behavior would be confirmed by a Testcontainers integration job (parked CI gap). Revert = revert branch.
