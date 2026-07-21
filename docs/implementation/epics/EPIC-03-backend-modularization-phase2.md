# EPIC 03 (Phase 2, full scope) — Backend Modularization & God-Class Splits

> Takes EPIC 3 from its shipped first slice (~4%) to full scope: split the flat `com.bcits.works`
> package into enforced domain modules, and bring the four god classes within budget — **all
> behavior-preserving.** Lane: **Large/risky** (cross-cutting, touches tenant/security surfaces) →
> this plan is the Stage-2 Deepak checkpoint (RB-05). Sibling: [EPIC-04 Phase 2](EPIC-04-frontend-architecture-phase2.md).
> Spine: [PHASE-2-EXECUTION-PLAN.md](../PHASE-2-EXECUTION-PLAN.md).
>
> Status: **DRAFT — for sign-off.** No production code changed by this document.

---

## 1. Verified current state

- **663 of 691** `.java` files sit in the flat root `com.bcits.works`. The 14 roadmap module
  sub-packages (`ai, auth, automation, devsync, knowledge, messaging, projects, reporting, security,
  service, sla, shared, workitems, workspaces`) exist as **empty `package-info.java` markers only** —
  **0 production classes have moved.** The only non-marker sub-package with code is `dto/` (14
  request DTOs), which is **not** in the ArchUnit module list.
- The root `com/bcits/works/package-info.java` is **load-bearing**: it declares the canonical
  Hibernate `@FilterDef("workspaceFilter")` at package scope for the #243 central tenant filter.
- `ArchitectureTest.java` (`@Tag("unit")`, pure ArchUnit, no Spring/DB) already enforces:
  1. **Marker presence** — every listed module must have a `package-info.java` before code moves in.
  2. **`modulePackagesDoNotCaseCollideWithTopLevelClasses`** — the regression guard from the #243
     boot failure: no sub-package name may case-insensitively match a top-level class name (package
     `project` vs class `Project.java` → `ClassNotFoundException` aborting the `EntityManagerFactory`
     on Windows/macOS while green on Linux CI). **This is the hardest naming constraint.** Existing
     plural names (`projects`, `workitems`, `workspaces`) deliberately dodge it.
  3. Layering: `*Service`/`*Repository` must not depend on `*Controller`; `*Repository` must not
     depend on `*Service`. (Already true codebase-wide.)
  4. **`modulePackagesAreFreeOfCycles`** — `slices().matching("com.bcits.works.(*)..")` acyclic.
     **Today vacuously green** (everything is in root); becomes the real enforcer the moment files
     move, surfacing every back-edge.

So the boundaries, markers, and gate are **in place waiting for the migration**; Phase 2's job is the
actual file move + adding per-module dependency rules as each domain lands.

---

## 2. Target module boundary set (proposed — decision §7.b)

Names match the existing #243-collision-safe markers. **`shared` is the kernel** (everything may
depend on it; it depends on nothing):

| Module | Owns (representative) |
|--------|------------------------|
| **`shared`** (kernel) | `ApiException`, `ApiError`, `GlobalExceptionHandler`, `PageResponse`, `ListPaging`, `EventService`+`AppEvent`+`EventRepository`, `EncryptionService`+`Kms*`+`KeyRotationService`, `EmailService`, `RateLimiter`, `PerformanceMonitor`, `OpenApiConfig`, `RunObjectMapperConfig`, the `dto/` requests, **`AuthenticatedUser`**, the tenant `@FilterDef`/`WorkspaceFilterActivator` constants, **BQL kernel** (`BqlCompiler`, `BqlLexer`, `BqlAst`, `BqlContextFactory`, `BqlFieldRegistry`, `BqlExecutionService`) — BQL is a unification layer consumed by reporting/automation/compliance/workitems |
| **`workspaces`** | `Workspace`, `WorkspaceService/Config/SecuritySettings`, `Team*`, `LicenseSeats`, `TenantContext`, `TenantScope`, `TenantFilter*` (+ Onboarding) |
| **`auth`** | `AuthController`, `JwtUtil`, `User`+`UserRepository`, `MfaService`, `WebAuthnService`, `ApiTokenService`, `ScimController`; `RbacService`/`RoleDef`/`PermissionScheme` (see coupling note) |
| **`security`** | compliance (`ComplianceRule/Violation/Evaluation/Evidence`), audit (`AuditLogService`, `AuditStreamService`), access governance, data-privacy/PII (`DataPrivacyService`, `PiiVaultService`, `UserPiiService`, `SubjectDataKey`, `FieldVisibilityService`) |
| **`workitems`** | `WorkItem*` (read/command/bulk), `WorkItemLink`, `FieldDef`/`FieldLayout`, `WorkItemTypeConfig`, `Workflow`/`WorkflowRuleEngine`/`Status*`, `DodChecklist`, `WorkLog` |
| **`projects`** | `Project`, `Sprint`, `Release`, `Board*`, `Ceremony`, `Retro`, `Standup`, `Impediment`, `CrossProjectDependency`, `RoadmapTheme` (+ OKR/RAID-PM) |
| **`reporting`** | `Dashboard*`, `Report*`, `Widget*`, `Pivot`, `Funnel`, `Kpi*`, `Metric*`, `Leadership`, `Executive`, `ConversationalDashboard`, `Today*` |
| **`sla`** | `SlaPolicy/Evaluation/Calculation/Clock/Escalation/Calendar/Notification`, `CustomerSlaTier` |
| **`ai`** | `AiControlPlaneService`, `AiAgent*`, `AiPolicy`, `AiBudget`, `AiCache*`, providers, `AiMemory`, `StructuredExtractionService`, `AnomalyDetection` |
| **`automation`** | `Automation*`, `Webhook*`, `Integration*`, `Extension*`, `Marketplace*`, `OAuthCallbackController` |
| **`messaging`** | `Notification*`, `Comment*`, `Push*`, `Chat*`, `RealtimeService`, `PresenceService`, `WatcherService`, `Meeting`, `ActionItem`, `Decision` |
| **`service`** | `ServiceRequest*`, `CustomerAccount*`, `CustomerFeedback*`, `Csat*`, `SupportChat*`, `CustomerPortal/AuthController`, `Stakeholder*` |
| **`knowledge`** | `Article*`, `KnowledgeSpace*`, `DocumentTemplate*`, `KnowledgeAiService`, exporters |
| **`devsync`** | `CodeContext*`, `CodeLink`, `PullRequest*`, `DeveloperWorkspace/PortalController` |

**Open boundary decisions (§7.b):** Config/Customization (`ConfigService`, `ConfigSandbox`,
`SavedView`, `FeatureFlag`, `CustomDomain`, ~31 files) and Onboarding (~10) have no marker — fold into
`shared`/`workspaces`, or add two markers (which requires editing `ArchitectureTest.MODULE_PACKAGES`).

---

## 3. Cross-domain coupling — what must land in `shared` first

The acyclic-slices rule fails on day one of the move unless the highest-fan-in classes are in `shared`
first (fan-in = files referencing the class):

| Class | Fan-in | Resolution |
|-------|-------:|------------|
| `ApiException` | 165 | → `shared` |
| `RbacService` | 148 | logically `auth`, but consumed by all 13 others → expose an **`RbacService` port/interface in `shared`**, impl in `auth`, to avoid `*→auth` edges from everywhere |
| `AuthenticatedUser` | 136 | → `shared` |
| `WorkspaceFilterActivator` (+ `@FilterDef`) | 120 | → `shared`/`workspaces`, kept stable; **moving the package-scoped `@FilterDef` is the highest-blast-radius single change** |
| `EventService` | 85 | → `shared` |
| `TenantScope` / `TenantContext` | 23 / 9 | → `workspaces`, with the filter machinery |
| `UserRepository` | 20 | many modules read users directly — ideally behind an `auth` port |
| `WorkItemRepository` | 15 | reporting/SLA/automation read it directly — candidate for a published read API |

**Sequence:** move `shared` kernel before any domain module (smallest blast radius to turn on the
acyclic rule), then carve domains **Identity-first** per ADR-0001 (`auth` → `workspaces` → `security`
→ rest), adding a per-module "may-only-depend-on" rule to `ArchitectureTest` as each lands.

---

## 4. The four god classes

Full per-class seam analysis (responsibilities, dependencies, and the **security logic that must move
verbatim**) is captured below. Refactor difficulty and Phase-1 collision risk drive the timing.

### 4.1 `ArticleController` (630) — **do first; lowest collision**
Fat controller doing service work inline (15 injected deps — a service in disguise). Push logic down
into the existing `ArticleService` (pattern already established there):
- Extract `ArticleVersioningService` (`saveVersion`/`restoreVersion`/`diffVersions`),
  `ArticleShareService` (`generateShareToken`/`revokeShareToken`), `ArticleEventPublisher`
  (`recordArticleEvent` + follower-notify/webhook fan-out repeated in `applyTransition`,
  `bulkPublish`, `moveArticle`); absorb `createArticle`/`updateArticle`/`applyTransition`/
  `setPortalPublished`/inline `bulkPublish` loop into `ArticleService`.
- **Preserve verbatim:** `requireArticleAccess` (tenant scope derived via `knowledge_spaces` →
  `rbac.require(userId, space.getWorkspaceId(), "view_items")` — articles have no direct
  `workspace_id`); the create-into-another-tenant guard in `createArticle`; per-op verbs
  (`moveArticle` → `edit_items` on target; share → `edit_items`; `bulkPublish` → `approve_items` +
  per-item `workspaceId.equals(space.getWorkspaceId())`); the `…ScopedToUser` repo read methods.
- Contract to preserve: the `/api/v1/articles` REST surface (covered by controller tests). No Java
  callers. **Move RBAC checks into the service** (currently controller-side — RB-10 §2 violation).

### 4.2 `KpiService` (716) — **do early; clean seams**
Extract: `KpiMetricCalculator` (the DB-free `static` helpers — velocity/percentiles/bandize),
`KpiSnapshotService` (`snapshot`/`history`/`applyTrends` + `*ForSystem` rollups), `MetricShareService`
(`share`/`unshare`/`requireShared`), `MetricDefinitionService` (`catalog`/`createDefinition`/custom
metrics — **and the FLS gate**), `KpiScopeResolver` (`scopedItems`/`teamItems`/`isProjectInWorkspace`).
- **Preserve verbatim:** `SENSITIVE_FIELD_MIN_TIER`/`canSeeSensitive` (incl. `SYSTEM_CALLER` bypass);
  `referencesForbiddenField` (resolves `sourceField`+`bqlFormula` through `BqlFieldRegistry`/`BqlCompiler`
  under caller `BqlContext`); the manager-cannot-drill-into-individual rule (`manager()` takes no
  target id; `personal()` enforces `requireShared`); `*ForSystem` intentionally skips the
  sensitive-field filter (no human caller); the `scopeItems` `PROJECT`-case tenant guard
  (`isProjectInWorkspace`).
- **Forward note:** KpiService rolls its own tier gate that predates the central `FieldVisibilityService`
  (#416). **Isolate that gate into `MetricDefinitionService`** so Phase 1's later FLS convergence is a
  one-file delegation swap, not a re-spread. Only 2 consumers (`KpiController`, `KpiSnapshotScheduler`).

### 4.3 `BqlCompiler` (650) — **DEFER (gated): co-own with Phase 1 FLS**
Best-factored of the four — `Parser` + `Emitter` inner classes are the seams (promote to
package-private `BqlParser` / `BqlSqlEmitter`, optional `BqlFunctions`). But it is the **canonical
field-security + BQL-tenant-scoping engine** (8+ consumers; the widest contract). Future FLS/tenant
slices will re-enter `BqlFieldRegistry`/`BqlContext`/`Emitter.resolve`/custom-field `wrap`.
- **Preserve verbatim:** the SQL-injection guarantee (every user value → bind `?`; field names via the
  closed `BqlFieldRegistry` allow-list; nothing concatenated as syntax); `compileFor(query, ctx)` as
  *the* FLS-aware path; the contract that the compiler emits a tenant-safe WHERE *fragment* **by
  composition** (relies on the outer query being workspace-scoped — do not add/remove tenant predicates).
- **Timing:** a pure structural split landed mid-Phase-1 = painful `resolve()`/`wrap()` merge conflicts
  for marginal benefit. Split **after** FLS slices settle, or fold into that work. Do NOT touch
  `compile`/`compileFor` signatures.

### 4.4 `WorkItemCommandService` (559) — **DEFER (gated): highest collision**
Write side of the work-item CQRS split. Extract: `WorkItemEventRecorder` (`recordFieldDiffs`),
`WorkItemNotificationService`, `WorkItemAutomationDispatcher`, `WorkItemHierarchyService`,
`WorkItemMutator` (the 45-field setter wall), `WorkItemGateService` (`enforceTransitionGates`).
- **Sits on three active Phase-1 fronts simultaneously:** (1) #243 — `validateParentType`'s manual
  `MEMBER_PROJECTS` tenant predicate + all the raw-`jdbc.update` `work_items` mutations (soft-delete,
  restore, `persistCustomFields`, `syncParentLink`, cascade deletes) are exactly what the central
  filter is converging on and what the raw-SQL guardrail polices; (2) #416 FLS write-side belongs in
  `applyUpdates`/`applyTypeSpecificUpdates`; (3) PII vault — `recordFieldDiffs` writes names/values
  into the event log (the "no raw PII in events" rule targets this).
- **Refactor hazard:** `WorkItemController` line 59 does `new WorkItemCommandService(...)` — a
  **hand-rolled instantiation, not Spring injection**. Extracted sub-services will NOT auto-wire;
  switch to constructor injection in the same PR and test, or the extractions silently break.
- **Preserve verbatim:** every command's `rbac.workspaceForProject` + `rbac.require(verb)` and
  `rbac.canEdit(userId, wsId, createdBy, assigneeId)` ownership signature; the `validateParentType`
  raw-SQL tenant predicate (the only thing stopping cross-tenant parent attachment via raw JDBC).
- **Timing:** treat as **Phase-1-owned territory.** Split after / as part of #243 write-path
  convergence + FLS write-side.

**Rankings.** Difficulty: WorkItemCommandService > ArticleController > KpiService > BqlCompiler.
Phase-1 collision: WorkItemCommandService (highest) > BqlCompiler > KpiService > ArticleController (lowest).

---

## 5. Slicing (reviewable PRs)

1. **`ArticleController` → `ArticleService` layering** (independent, now).
2. **`KpiService` split** with the FLS tier gate isolated (independent, now).
3. *(Phase 1 closes)* **`shared` kernel move** — `ApiException`, `AuthenticatedUser`, `EventService`,
   `Encryption/Kms`, `WorkspaceFilterActivator`/`@FilterDef` constants, BQL kernel + an `RbacService`
   port. Turn on acyclic-slices with minimal blast radius. Add the first per-module rule.
4. **Domain carve, Identity-first:** `auth` → `workspaces` → `security` → `workitems` → `projects` →
   `reporting`/`sla` → `ai`/`automation`/`messaging`/`service`/`knowledge`/`devsync`. One module per
   PR; add its dependency rule to `ArchitectureTest` as it lands.
5. **`WorkItemCommandService` split** (co-owned with #243 write-path + FLS write-side).
6. **`BqlCompiler` Parser/Emitter extraction** (with / after FLS slices).

---

## 6. Verification (per PR)

Focused unit tests on the moved/split classes → `mvnw -Dgroups=unit verify` → Testcontainers
integration → **fresh-DB boot** (catches package/case-collision + `ddl-auto=validate` faults CI
misses) → `ArchitectureTest` green incl. the *new* rule for the landed module → guardrails +
Checkstyle. **Plus a diff-of-security-predicates check:** the `rbac.require`/tenant-predicate/FLS-gate
inventory in §4 must be present and unchanged post-refactor (adversarial re-verify, roadmap §10.5).

---

## 7. Decisions for Deepak

> Resolved by execution, 2026-07-21. All five were answered by code that merged on 2026-07-19 while
> this plan sat unmerged. Two shipped only partially — see the carry-forward below.

- **a.** ~~Approve `ArticleController` + `KpiService` splits to start now.~~ **RESOLVED — shipped**
  (PRs #446, #447), but **not to budget**: `ArticleController` 630 → 297 while the extracted
  `ArticleService` is **730 lines**, now the largest backend file in the repo; `KpiService` 716 →
  **612** (`KpiMetricCalculator` took 157). Both carry forward.
- **b.** ~~Confirm the 14-module + `shared`-kernel boundary set (§2).~~ **RESOLVED — shipped.** All 14
  modules are populated with `package-info` markers; flat root 291 → 72 source files. Config and
  Onboarding were folded into `workspaces` rather than given their own markers.
- **c.** ~~Confirm "`shared` kernel first, then Identity-first" split order.~~ **RESOLVED — shipped**
  in that order (PRs #454, #456 kernel; #462 auth; then the remaining domains through #478).
- **d.** ~~Confirm `WorkItemCommandService` + `BqlCompiler` are deferred and co-owned with Phase 1.~~
  **RESOLVED — shipped** (PRs #448, #449). `BqlCompiler` 650 → **56** is a genuine decomposition
  (`BqlParser` 255 / `BqlSqlEmitter` 355 / `BqlLexer` 106). `WorkItemCommandService` 559 → **558**
  (`WorkItemFieldCopier` took 60) is not — it carries forward.
- **e.** ~~Confirm the `RbacService` port-in-`shared` approach.~~ **RESOLVED — shipped** as `RbacGate`
  (PR #460), which did avoid universal `*→auth` edges.

### Carry-forward into the next Phase 2 tranche

1. Decompose `ArticleService` (730), `KpiService` (612), `WorkItemCommandService` (558) to budget.
2. Add module→module ArchUnit rules and the `api`/`internal` split — **the "API-first modular
   monolith" half of EPIC 3 was never built.** Today any module may import any other module's JPA
   repositories directly (`auth.UserRepository` 14× cross-module, `workitems.WorkItemRepository` 10×).
3. Bring the 72 flat-root files into slices, or extend the cycle gate to cover them — the rule
   matches `com.bcits.works.(*)..`, so those files (15 of them controllers) are exempt from it today.
4. Lower the flat-root ratchet below 72 as files move; it currently sits at exactly its present value.
