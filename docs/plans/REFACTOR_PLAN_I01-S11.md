# Refactor Plan — I01-S11 · Cap E · Full-text search

**Iteration:** 1 · **Mode:** AUTO. **Spec:** *"Postgres-backed search across titles, descriptions, comments. Recent and starred boosts."*
**Classification:** **Implemented → hardened.** `/work-items/search` already searches title + description + comment bodies (Postgres `ILIKE`), boosts starred items (`ORDER BY is_starred DESC`) and recent items (`created_at DESC`), and — since I01-S07 — is tenant-scoped to the caller's workspaces.

## Phase 1 — findings
- A user-typed `%` or `_` was treated as a SQL `LIKE` wildcard (e.g. searching `50%` matched everything) — a correctness bug.
- A blank query ran a full (still tenant-scoped) scan returning the newest 20 of everything.

## Phase 2 — scope (in)
1. **Escape `LIKE` metacharacters** (`\`, `%`, `_`) in the term and add `ESCAPE '\'` to each `ILIKE`, so typed wildcards match literally.
2. **Blank-query guard:** return empty immediately (no DB hit) for an empty/whitespace query.

## Out of scope (parked)
- True Postgres FTS (`tsvector`/`tsquery`, ranking, stemming) over `ILIKE` — a later search-quality pass; `ILIKE` meets the MVP "Postgres-backed search" intent and the tenant boundary.

## Tests / validation
- `WorkItemTenantScopeTest` gains a blank-query guard test (no DB interaction); search tenant-scoping shares the `MEMBER_PROJECTS` predicate already pinned by the list test. **214 backend unit tests green.** No migration.

## Risk
- Low: escaping + a guard on one read endpoint. Revert = revert branch.
