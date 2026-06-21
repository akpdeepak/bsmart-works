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

---

# Slice A — as-built (2026-06-21) · central binding at the authorization choke point

> Per-item execution block (RB-05 / task-execution loop). Doubles as the PR description.
> Lane: **Large/risky** (tenant isolation). Default-off flag → **inert on merge**. No migration.

## A.0 Scope
Extend central tenant-filter **binding** from `ProjectService`-only to **every single-workspace-
authorized read path**, behind a default-off flag `tenant.filter.binding.enabled`. This eliminates the
"@Filter dormant app-wide, isolation rests on hand-written predicates with no central backstop" gap for
the single-workspace surface, while leaving the legitimately multi-workspace surface untouched.
**No schema change. No predicate removed** (that is Slice E/CONTRACT).

## A.1 Analysis — the verified reframe (code is canonical)
A 5-agent discovery + independent code verification (2026-06-21) found the originally-sketched mechanism
(an interceptor that resolves+binds *the* request workspace, §3.2) is **unsafe as written**, because the
app has **two coexisting isolation models**:

1. **Single-workspace requests** — a specific workspace is resolved *and authorized* via
   `RbacService.require(...)` / `getUserTier(userId, ws)` (dashboards `?workspaceId`, create-in-project,
   resource-by-id). Binding the central single-`workspace_id` filter here is correct and additive.
2. **Caller-workspace-SET requests** — work-item lists (`getAllWorkItems`, `/my`, `/starred`, search,
   backlog → `WorkItemReadService` `MEMBER_PROJECTS` join), `findAllScopedToUser…` (sprints, articles,
   knowledge spaces, workflows; ~40 files), notifications. These span **all** the caller's workspaces by
   a membership-join SQL predicate. The workspace is **not** in the JWT (`SecurityConfig` principal =
   userId only). Binding any *single* workspace here would **hide the user's other workspaces** —
   `ProjectService.list`'s cross-workspace branch already comments on exactly this trap.

The central single-`workspace_id` filter can only safely back up model (1). So the correct, app-wide,
**single** activation point is **`RbacService.getUserTier(...)` on a member-tier (≥1) result** — the one
choke point every single-workspace authorization funnels through (directly, or via
`canDo`/`require`/`canView`/`isAdmin`). Model-(2) reads never reach a single-workspace tier check, so
they stay unbound and keep their membership-join scope — which is their correct, non-removable isolation.

Other verified facts: `work_items` is a **transitive** entity (no `workspace_id`, no `@Filter` yet →
Slice C). The end-to-end "filter-alone isolation" IT the plan asked Slice A to add **already exists**
(`CrossTenantFilterIsolationIT`, shipped Slice 1, PR #415) — proving isolation across 6 domains with
predicates removed, plus the dormant-default, escape-hatch, and the documented `findById`/PK gap
(Slice D). 115 entities already carry `@Filter`.

## A.2 Mechanism
- New `TenantFilterSettings` bean reads `tenant.filter.binding.enabled` (default `false`).
- `RbacService.getUserTier()` injects `CurrentWorkspace` + `TenantFilterSettings`; on a member-tier
  result it calls a private `bindCentralFilterIfEnabled(ws)` that binds **only** when the flag is on, a
  real workspace was resolved, and the thread is **not** in the `TenantScope` system escape hatch (a
  scheduler/admin sweep probing a tier must not re-narrow its deliberately cross-workspace read).
- `ProjectService`'s existing explicit `currentWorkspace.bind(...)` is left exactly as-is (already live,
  proven); when the flag is permanently on it becomes redundant with the central binding — a trivial
  Slice E cleanup, **not** debt now.

## A.3 Files
- `TenantFilterSettings.java` (new) — flag holder.
- `RbacService.java` — constructor deps + `getUserTier` binding + `bindCentralFilterIfEnabled` helper.
- `application.properties` §15 — `tenant.filter.binding.enabled` (env `TENANT_FILTER_BINDING_ENABLED`, default false).
- `RbacServiceTest.java` — constructor update + 5 binding unit tests (flag on/off, non-member, system-hatch, require→bind).
- `RbacBindingTenantFilterIT.java` (new) — real-path proof: single-ws authorize binds+isolates, multi-ws not over-filtered, denied authorization binds nothing.
- This doc.

## A.4 Acceptance criteria
- Default-off ⇒ **zero runtime behaviour change** on merge (binding stays `ProjectService`-only; all
  existing tests green unchanged). ✔
- Flag-on ⇒ a single-workspace authorization binds the central filter and a predicate-free read is
  isolated **via the filter alone**; a multi-workspace read is **not** over-filtered; a denied
  authorization binds nothing. ✔ (`RbacBindingTenantFilterIT` 3/3)
- No schema/migration; no per-query predicate removed; Spring context wires with no circular dep. ✔

## A.5 Validation (local, 2026-06-21)
- Unit: `-Dgroups=unit clean verify` → **1406 tests, 0 failures**, checkstyle 0 errors, all coverage
  checks met, `RbacServiceTest` 20/20.
- Guardrails: `scripts/guardrails.sh` → all **blocking** rules pass (only pre-existing frontend hex
  baseline-debt warns).
- Integration (Docker/Testcontainers): `RbacBindingTenantFilterIT` 3/3, `CrossTenantFilterIsolationIT`
  5/5, `WorkspaceFilterScopeIT` 4/4, `WorkspaceTenantIsolationIT` 5/5 → **17/17**.

## A.6 Rollout + canary watch-items (when flipping the flag, per-env, canary-first)
1. Smoke-test the audited escape-hatch inventory (§3.4) — auth/signup, public `/api/v1/public/**`,
   customer-portal token, SCIM, schedulers, admin sweeps — confirm none over-filter (they run in
   `TenantScope.systemUnscoped`, which the system-context guard also protects).
2. Watch-item: a request that authorizes workspace X (binds X) then performs an *incidental* read that
   should span workspaces in the same session would be narrowed to X. Endpoints are single-purpose, so
   this is low-risk; the retained per-query predicates are the backstop during canary.
3. Watch-item: multi-call last-wins within a request (binds the last single workspace checked) — benign
   because each is a workspace the caller is a proven member of and reads are single-purpose.

## A.7 Follow-on (unchanged by this slice)
Slice B/C transitive `@Filter` (incl. `work_items`); Slice D `findById`/PK gap; **Slice E CONTRACT must
NOT remove the membership-join predicates that isolate the multi-workspace paths** (only the redundant
single-workspace predicates the filter fully covers). Slice F doc reconciliation (CLAUDE.md §4 / RB-40 §1
still say "#243 TO BE ADDED").
