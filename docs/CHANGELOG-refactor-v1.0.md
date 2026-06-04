# Iteration 1 Refactor — Foundation (The Works MVP) — close-out

**Release candidate:** `refactor-v1.0` · **Status:** all 12 specs Done on `main` · **Date:** 2026-06-04
**Mode:** GATED for I01-S02 (signed off), AUTO for I01-S03 → I01-S12 (authorized autonomous run).

Cut from the spec-refactor pipeline (`docs/REFACTOR_MASTER_PROMPT.md`). One PR per spec, squash-merged on green CI.

## Headline outcome
The biggest theme of this iteration was **closing cross-tenant isolation leaks (RB-40 §1)** across the core data surfaces, plus moving RBAC into the service layer (RB-10 §2) and making the event store a proper foundation. Every catastrophic "any tenant can read another tenant's data" path found in the MVP is now closed and test-guarded.

## By capability

### Cap A — Identity & foundation
- **I01-S02 Workspaces** (#77): `WorkspaceService` (RBAC + data access out of the controller); membership-enforced reads (404 cross-tenant); branding on the entity; workspace events; `GET /workspaces/mine`; **real multi-workspace switcher** (frontend); `WS-002` seed. *Governance decisions signed off by Deepak (identity-only JWT, fix the read leak, seed a 2nd workspace).*
- **I01-S03 App shell** (#80): topbar **notifications bell** + a tested **`UserMenu`** organism; theme folded into the menu; a11y labels. (Also repaired `main` after concurrent-merge skew from #75/#78.)
- **I01-S04 Event store foundation** (#85): `events.workspace_id` added + backfilled (RB-40 §1); **append-only immutability trigger** (RB-10 §3); `EventService.recordInWorkspace`.

### Cap B — Projects & work items
- **I01-S05 Projects** (#86): `ProjectService`; tenant-isolated reads (no more `findAll()` across tenants); workspace-scoped lifecycle events.
- **I01-S06 Default WorkItem types** (#87): the 7 defaults as an on-brand single source of truth (`DefaultWorkItemTypes`) + test.
- **I01-S07 WorkItem CRUD** (#88): tenant-scoped list/search/backlog/trash reads (the core-data leak); guarded `restore`/`reorder`; CRUD + optimistic concurrency already met spec.

### Cap F — Board
- **I01-S08 Kanban board** (#89): loading now shows the column **skeleton, not a spinner** (Part 4); drag-drop optimistic+revert + density modes already met spec.

### Cap G — Collaboration
- **I01-S09 Comments + @mentions** (#90): membership-gated read/add/delete; author-only delete; mentions confined to the workspace.
- **I01-S10 Notifications** (#91): `markRead` ownership fix (IDOR); per-type prefs, batching, daily digest already met spec.

### Cap E / J — Discovery & home
- **I01-S11 Full-text search** (#92): escape `LIKE` wildcards + blank-query guard; title/desc/comments + starred/recent boosts + tenant scope already met spec.
- **I01-S12 Personal home (My Works)** (#93): verified Implemented (assigned/starred/mentions/activity + empty states); removed a dead `userId` param on `/work-items/my`.

## Cross-cutting
- **Tests:** backend unit suite grew from ~135 to **214** (tenant-isolation, RBAC, event, and access tests added per spec); frontend Vitest **108**. All green on every merge.
- **Parked** (`docs/PARKED.md`): converge the legacy App.jsx sidebar onto `SidebarNav`; extract `WorkItemService`; remaining 15 event producers → `recordInWorkspace`; custom-type endpoint RBAC → I03-S04; **add a Testcontainers/Flyway CI stage** (the gap that let two concurrent-merge breakages through — fixed reactively this iteration).

## Close-out actions still requiring human go-ahead
- Publish the **`refactor-v1.0`** annotated tag + GitHub Release from `main` (RB-05 Stage 7 — irreversible/remote). Not done autonomously.

**Next spec queued:** I02-S01 · Cap F · Backlog with capacity bar (Iteration 2).
