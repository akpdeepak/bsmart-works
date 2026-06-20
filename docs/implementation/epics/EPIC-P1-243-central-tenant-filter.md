# EPIC P1 / #243 — Central Hibernate Tenant Filter

> Phase 1 (Governance & security closure), item 1 of the Master Completion Roadmap.
> **Lane: Large/risky** (data model · tenant isolation · security) → requires a Stage-2 checkpoint
> before code (Orchestrator §5, RB-05). This document is that checkpoint.

## 1. Problem
Tenant isolation is the single catastrophic risk for a multi-DISCOM product (RB-40 §1). Today it is
enforced **per query** (`findByWorkspaceId…` methods + hand-written predicates). One forgotten
predicate on any of ~144 tenant-scoped entities = cross-tenant leak. The "applied centrally, cannot
be forgotten" guarantee (#243) exists only as a **proof-of-concept on `Project`**.

## 2. Current state (verified 2026-06-20)
- Infra present: `WorkspaceFilterActivator`, `TenantContext`, `TenantScope`, `CurrentWorkspace`,
  `TenantContextCleanupFilter`.
- `@FilterDef` declared (2 files); `@Filter(...)` applied to **`Project` only** (1 of 145 `@Entity`).
- `currentWorkspace.bind(...)` called in `ProjectService` only.
- The `TenantFilterInterceptor` referenced in Javadoc does **not** exist as a file.

## 3. Approach (expand → enforce → contract)
A Hibernate filter auto-enabled per request, applied to every tenant-scoped entity, with a single
audited escape hatch for legitimately-unscoped paths.

1. **One canonical `@FilterDef`** (`workspaceFilter`, param `workspaceId`) defined once on a
   `package-info`/base, removing the duplicate def.
2. **Bind the filter once per request** in a single Spring component (`TenantFilterAspect` or an
   `EntityManager`-session listener) that reads `TenantContext.currentWorkspaceId()` (already set
   from the JWT/`CurrentWorkspace`) and calls `session.enableFilter("workspaceFilter").setParameter(...)`.
   Cleared by the existing `TenantContextCleanupFilter`.
3. **Apply `@Filter(name="workspaceFilter", condition="workspace_id = :workspaceId")`** to **every
   tenant-scoped entity** (those with a `workspace_id` column). Enumerated inventory in §4.
4. **Escape hatch — `TenantScope.systemUnscoped(() -> …)`** (already stubbed): explicitly disables
   the filter for the **few legitimately cross-/no-tenant paths**, each audited:
   - Authentication & registration (no workspace yet), public endpoints (`/api/v1/public/**`),
     customer-portal token auth, SCIM provisioning, cross-workspace admin/ops, background
     schedulers, Flyway/boot. Every use is logged so "unscoped" is never silent.
5. **Keep existing per-query predicates** during EXPAND (defense-in-depth); they become redundant
   but harmless. A later CONTRACT slice removes the now-duplicative ones (separate PR).

## 4. Entity inventory (build the authoritative list)
Generate the list programmatically: every `@Entity` whose table has a `workspace_id` column (direct
tenant ownership) gets `@Filter`. Entities scoped **transitively** (e.g. via `project_id` →
`projects.workspace_id`) get a join-condition filter or are covered by their parent — decided
per-entity in the PR, not guessed. Entities that are **global by design** (e.g. `users`,
`workspaces` themselves, reference/catalog tables, `events` is workspace-stamped) are explicitly
listed as **not** filtered, with rationale. This inventory is the core review artifact.

## 5. Rollout safety (why this won't break the app)
- **No schema migration** — `@Filter` is app-level over existing `workspace_id` columns. Forward-only,
  reversible by removing the annotation.
- **Over-filtering risk** (the real danger): a path that legitimately needs cross-tenant data but
  isn't wrapped in `systemUnscoped` would start returning empty/404. Mitigated by: the audited
  escape-hatch inventory (§3.4), and the smoke-boot + full integration suite catching regressions.
- **Under-filtering risk**: an entity missed in §4 stays leak-capable. Mitigated by an **ArchUnit
  test** asserting every `@Entity` with a `workspace_id` column carries `@Filter` (or is on the
  explicit allow-list) — so the guarantee is enforced by a test, not vigilance.

## 6. Test plan (Stage 3)
- **ArchUnit:** every tenant-scoped entity is filtered or allow-listed (the structural guarantee).
- **Cross-tenant IT (Testcontainers):** seed 2 workspaces; for a representative set across domains
  (work items, articles, dashboards, SLA, compliance, KPI, automations, integrations), assert
  workspace B's user gets 0 rows / 404 for workspace A's data **via the filter alone** (per-query
  predicates removed in the test path to prove the filter does the work).
- **Escape-hatch tests:** auth, public article, SCIM, schedulers still function (not over-filtered).
- **Regression:** full `-Dgroups=unit` + integration + smoke-boot green; existing
  `WorkspaceTenantIsolationIT`, `BqlWorkspaceScopeIT`, `WorkspaceFilterScopeIT` still pass.

## 7. Slicing (to keep PRs reviewable)
- **Slice 1 (this EPIC):** filter infra + bind aspect + escape hatch + ArchUnit guard + apply to the
  highest-risk domains (work items, knowledge/articles, dashboards, reports, SLA, compliance, KPI).
- **Slice 2:** remaining tenant-scoped entities + transitive cases.
- **Slice 3 (CONTRACT):** remove now-redundant per-query predicates where the filter fully covers them.

## 8. Acceptance criteria
- Every tenant-scoped `@Entity` is filtered or explicitly allow-listed (ArchUnit-enforced).
- Cross-tenant access returns no data through the filter alone, proven by IT across domains.
- All legitimately-unscoped paths work, each via an audited `systemUnscoped` call.
- Full gate green (unit + integration + smoke-boot + guardrails + the new ArchUnit test).

## 9. Rollback
Remove the `@Filter` annotations + bind aspect; per-query predicates (retained in EXPAND) keep the
app isolated exactly as today. Zero data/schema risk.
