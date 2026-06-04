# Refactor Plan — I01-S04 · Cap A · Event store foundation

**Iteration:** 1 (Foundation) · **Mode:** AUTO. **Spec:** *"Append-only immutable log of every state change. Foundation for audit, compliance, KPI, history reconstruction."*
**Classification:** **Partial** — `events` table + `AppEvent` + `EventService` + per-aggregate read (`ActivityController`/`EventRepository`) exist and are insert-only **by convention**, but (a) immutability was not enforced and (b) events carried **no tenant dimension** (RB-40 §1), which was the item parked from I01-S02.

## Phase 1 — analysis
- `events` (V4) is the live store; `event_log` was dropped (V20). Producers only ever `INSERT` (16 call-sites; no UPDATE/DELETE anywhere) — verified.
- Gaps vs the foundation promise: **immutability is not enforced** (only conventional), and **`workspace_id` is absent** from the store (RB-40 §1 wants it on every event; tenant-scoped audit/KPI need it).

## Phase 2 — scope (in)
1. **Workspace dimension on events (RB-40 §1).** `V38` adds nullable `workspace_id` (expand), backfills it from derivable sources (workspace-aggregate events; work-item→project→workspace; project→workspace), and indexes it. `AppEvent.workspaceId` mapped. **Resolves the I01-S02 parked item.**
2. **Append-only immutability (RB-10 §3 / Constitution Part 2).** `V38` installs a DB trigger that raises on any `UPDATE`/`DELETE` of `events` — the audit trail cannot be silently rewritten. Right-to-be-forgotten stays satisfied by PII-vault crypto-shredding (RB-40 §3), never by mutating events. (Backfill runs before the trigger; a future event-column backfill must drop/recreate it — documented in the migration.)
3. **`EventService.recordInWorkspace(workspaceId, aggregateId, type, actor, payload)`** — workspace-scoped recording where `aggregateId` may differ from `workspaceId` (e.g. project events). `WorkspaceService` adopts it for its member/branding/project-member events. Existing `record(...)` signatures kept so the other 15 producers migrate incrementally (their rows are backfilled; new rows stay null until each domain spec adopts the call).

## Out of scope (parked)
- Threading `workspace_id` through the other 15 producers → each domain spec (work-item S07, comments S09, etc.).
- A browsable audit-log explorer → Iteration 16 (Y) / 19 (T).
- `recordDiff` workspace overload (WORKSPACE_UPDATED is a workspace-aggregate event; workspace_id == aggregate_id, trivially derivable) — deferred until a non-workspace-aggregate diff producer needs it.

## Tests / validation
- `EventServiceTest` (now `@Tag("unit")` so CI actually runs it) gains a `recordInWorkspace` case asserting the tenant stamp + aggregate/payload. `WorkspaceServiceTest` updated to the new call. **195 backend unit tests green.**
- The V38 trigger/backfill is plain, standard PL/pgSQL+DML; it cannot be exercised in CI because **the pipeline has no DB/Flyway stage** (parked as a process gap) — SQL reviewed for correctness and ordering (backfill before trigger).

## Risk
- Medium (touches the shared event store). Mitigations: column is nullable (no producer breaks), trigger blocks only DML mutation (nothing legitimate does that), migration is forward-only and ordered correctly. Revert = a new forward migration dropping the trigger/column.
