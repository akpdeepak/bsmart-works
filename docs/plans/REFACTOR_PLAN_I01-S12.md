# Refactor Plan — I01-S12 · Cap J · Personal home (My Works)

**Iteration:** 1 · **Mode:** AUTO. **Spec:** *"Per-user landing page showing assigned items, recent activity, mentions, notifications."*
**Classification:** **Implemented → verified + minor hardening.** The My Works page already has Assigned / Starred / Mentions / Recent-activity tabs, each with a proper `EmptyState` (guides the next action — Part 4), brand tokens, and `TypeBadge`/`StatusBadge`. Its lists derive from the tenant-scoped `workItems` (I01-S07); the `/work-items/my` endpoint already derives the user from the JWT.

## Phase 1 — finding
- The `/work-items/my` endpoint exposed a dead, misleading `@RequestParam userId` that was always overridden by the authenticated id — confusing and a foot-gun suggesting a client could pass another user's id.

## Phase 2 — scope (in)
1. Remove the ignored `userId` param; the endpoint returns the signed-in user's assigned items, identity strictly from the JWT.

## Out of scope
- The four tabs, empty states, and notification surfacing already satisfy the spec — verified, unchanged.

## Tests / validation
- **214 backend unit tests green** (constructor/endpoint contract preserved; extra query params are ignored by Spring MVC, so no client breaks). No migration. Frontend unchanged.

## Risk
- Very low: removes an unused parameter. Revert = revert branch.

---

This is the **last spec of Iteration 1**. On merge, the iteration's 12 specs are all Done — see the close-out summary appended to the tracker. Publishing the `refactor-v1.0` tag + GitHub Release is an irreversible remote action and is left for explicit human go-ahead (RB-05 Stage 7).
