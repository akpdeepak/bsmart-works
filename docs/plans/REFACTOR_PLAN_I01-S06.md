# Refactor Plan — I01-S06 · Cap B · Default WorkItem types

**Iteration:** 1 · **Mode:** AUTO. **Spec:** *"7 built-in types — Epic, Story, Task, Bug, Sub-task, Incident, Service Request — with icons, colors, default workflows."*
**Classification:** **Implemented → hardened.** The 7 defaults existed but used off-brand generic Tailwind hexes (`#22c55e`, `#3b82f6`, …) and were duplicated (backend list vs frontend `TYPES` map) — a parallel source of truth (RB-30 unification).

## Phase 2 — scope (in)
1. **Single, on-brand source of truth:** extract the 7 defaults to `DefaultWorkItemTypes.ALL` with Part-6 brand/semantic/neutral hexes (navy/blue/teal/danger/warn/neutrals), aligned to the frontend's token styling so the two never drift. Controller consumes it.
2. **Test pins the contract:** exactly the 7 spec types, unique keys, each with label/icon/on-brand colour, `isCustom=false`.

## Out of scope (parked → PARKED.md)
- **Custom WorkItem types** (per-workspace) are **I03-S04** — not built ahead.
- The existing custom-type CRUD endpoints (`POST/PUT/DELETE /work-item-types`) lack RBAC + workspace scoping and `list` falls back to `findAll()` — a latent RB-40 §1 leak, but **dormant in Iteration 1** (no custom types yet). Hardened with the custom-types feature in **I03-S04**.
- "Default workflows" per type: statuses/workflows are the same default set across types in the MVP; the visual workflow editor + per-type workflows are **I03-S01/S07**.

## Tests / validation
- New `DefaultWorkItemTypesTest` (3 cases). **204 backend unit tests green.** No migration, frontend untouched (its token-based `TYPES` is already on-brand; consuming API colours is a parked follow-up).

## Risk
- Very low: a data/constant refactor + test. Revert = revert branch.
