# ONE Philosophy — Backend Architecture Audit

> Auditor: Principal Software Architect review of `com.bcits.works` (works-backend).
> Lens: **ONE Function & Feature** (single responsibility) and **ONE Architecture** (clear layer
> boundaries & APIs), per RB-10 (one job per layer: Controller parses HTTP; Service owns business
> logic + RBAC + tenant scoping; Repository does data access) and RB-40 §1 (tenant isolation).
> Date: 2026-06-13.

## Constraints honoured in every recommendation
- Flat package `com.bcits.works` is canonical (TD-001) — **no sub-package splits** are proposed.
- Every query stays workspace-scoped; RBAC stays in the service layer.
- All fixes are **incremental and behaviour-preserving** so the CI gate (Checkstyle, JUnit + JaCoCo
  ≥60%, Testcontainers integration) stays green. The dominant safe move is **extracting a
  `@Service` and delegating from the existing class** — the public HTTP contract and method
  signatures do not change.

---

## Findings (ranked by impact)

### 1. `WorkItemController` is a God controller — HTTP + business logic + raw SQL + RBAC + notifications + event-sourcing in one class (`WorkItemController.java:29`)
- **The Problem:** The single largest violation of both ONE dimensions. The controller holds **14
  collaborators** plus a hand-built `ObjectMapper` and personally does work belonging to three layers:
  - **Repository work in the controller:** raw `JdbcTemplate` SQL inline throughout — the tenant
    predicate `MEMBER_PROJECTS` (`:91`), list/get/trash/search/backlog/star queries, the 75-line
    `mapRow` ResultSet→entity mapper (`:245-321`), `persistCustomFields`, `syncParentLink`,
    `attachTagsBatch`, `attachFieldValuesBatch`.
  - **Business logic in the controller:** `createWorkItem` (`:343-407`) and `updateWorkItem`
    (`:411-592`) are 60- and 180-line transaction scripts — auto-ID allocation, initial-status
    resolution, parent-type hierarchy validation, DoD gating, workflow-rule enforcement,
    optimistic-lock handling, ~12 per-field `recordDiff` event diffs, assignee notifications, email.
  - **Mixed unrelated domains:** work items *and* starring, trash, notifications, email, extensions,
    workflow, DoD — at least eight responsibilities.
  - **RBAC at the controller (RB-10 violation):** `rbac.require(...)`/`rbac.canEdit(...)` in handlers.
- **The ONE Solution:** Introduce a `WorkItemService` owning create/update/delete/move business logic,
  tenant scoping, RBAC, event emission; move all raw SQL + `mapRow` into a `WorkItemQueryService`. The
  controller shrinks to parse→call-service→return. Slice **endpoint by endpoint**.
- **Refactored Code:**
  ```java
  @Service public class WorkItemService {
      WorkItem create(String userId, WorkItem newItem);
      WorkItem update(String userId, String id, WorkItem patch);
      void softDelete(String userId, String id);
      WorkItem moveParent(String userId, String id, String newParentId);
  }
  @Service public class WorkItemQueryService {     // owns the JdbcTemplate read surface
      List<WorkItem> listForUser(String userId, String parentId, int page, int size);
      Optional<WorkItem> findVisible(String userId, String id);
      private WorkItem mapRow(ResultSet rs, int n) { ... }   // moved verbatim
  }
  ```
- **Risk/effort:** **L** (largest), de-riskable by slicing per endpoint. Guarded by existing MockMvc/
  integration tests + `WorkspaceTenantIsolationIT` (`MEMBER_PROJECTS` moves verbatim).

### 2. `AiAssistService` is a 13-capability God service (`AiAssistService.java:31`)
- **The Problem:** One `@Service` with 10 collaborators implements thirteen unrelated AI capabilities
  across ≥6 product capabilities. It crosses the read/write line: `executePlan`/`executeStep`
  (`:202-300`) **mutate** work items/comments/assignments and **emit events**, doing full RBAC +
  cross-workspace checks — re-implementing `WorkItemService` inside an "assist" service. It also owns a
  natural-language parser (`parseSteps`/`parseClause`/`splitClauses`), a keyword→BQL translator
  (`deterministicNlToBql`), and similarity/ranking heuristics.
- **The ONE Solution:** (1) extract command-bar execution into a `CommandBarService` that delegates
  writes to `WorkItemService`; (2) extract the pure static NL/heuristic helpers into a stateless
  `AiHeuristics`; (3) leave `AiAssistService` as the thin per-capability orchestrator.
- **Refactored Code:**
  ```java
  final class AiHeuristics {                    // pure, already static — relocate
      static List<PlanStep> parseSteps(String text) { ... }
      static String deterministicNlToBql(String text) { ... }
      static List<WorkItem> rankSimilar(List<WorkItem> items, String q, int limit) { ... }
  }
  ```
- **Risk/effort:** **M.** The static helpers move with zero behaviour change (do first — this is **PR
  B1**). `executePlan` extraction is higher-risk; guard by reusing `WorkItemService` once finding 1 lands.

### 3. Systemic: controllers own raw `JdbcTemplate` SQL — leaky across ~19 controllers (`SprintController.java:35`, `ArticleController.java:32`, `WorkItemController.java:33`)
- **The Problem:** 19 of 122 controllers inject `JdbcTemplate` and run SQL in handlers, collapsing the
  controller and repository layers — every inlined query a place the tenant predicate can be forgotten.
- **The ONE Solution:** Move each controller's SQL into the matching `@Repository`/read-DAO or service.
  No new endpoints, no signature changes.
- **Refactored Code:**
  ```java
  @Query("""
      SELECT new com.bcits.works.SprintUsedPoints(wi.sprintId, COALESCE(SUM(wi.storyPoints),0))
      FROM WorkItem wi WHERE wi.sprintId IN :ids AND wi.deletedAt IS NULL GROUP BY wi.sprintId""")
  List<SprintUsedPoints> sumUsedPointsBySprint(List<String> ids);
  ```
- **Risk/effort:** **S–M per controller**; each a small isolated PR. Tackle integration-test-covered ones first.

### 4. `KpiService.applyTargetsAndCustomMetrics` embeds a raw SQL query engine (`KpiService.java:507`)
- **The Problem:** Hand-builds and executes a `COUNT(*)` against `work_items` via `jdbc`,
  re-implementing the workspace-scope predicate as a string literal — duplicated here, in
  `AutomationService.conditionMatchesBql` (`:275`), and in `WorkItemController.MEMBER_PROJECTS`. Three
  hand-typed copies of the one isolation rule RB-40 §1 says to apply centrally.
- **The ONE Solution:** One `BqlQueryExecutor` owning "compile BQL + apply the central workspace
  predicate + run the scoped query". `KpiService` and `AutomationService` call it.
- **Refactored Code:**
  ```java
  @Service public class BqlQueryExecutor {
      long countScoped(String workspaceId, String bql, BqlContext ctx) {
          BqlCompiler.Compiled c = compiler.compileFor(bql, ctx);
          String sql = "SELECT COUNT(*) FROM work_items WHERE deleted_at IS NULL "
              + "AND project_id IN (SELECT id FROM projects WHERE workspace_id = ?)"
              + (c.sql().isBlank() ? "" : " AND (" + c.sql() + ")");
          var params = new ArrayList<>(); params.add(workspaceId); params.addAll(c.params());
          return jdbc.queryForObject(sql, Long.class, params.toArray());
      }
  }
  ```
- **Risk/effort:** **M.** Behaviour-preserving. This is **PR B4** — flagged for Deepak sign-off (tenant
  isolation; advances #243).

### 5. `Iteration15AiService` — named by release, spans two capabilities + 8 inline SQL queries (`Iteration15AiService.java:25`)
- **The Problem:** The class name encodes a *release*, not a responsibility. Bundles Cap V (Scrum
  Master) and Cap W (Product Owner), and every method writes its own multi-join `jdbc.queryForList`.
- **The ONE Solution:** Split by capability into `ScrumMasterAnalyticsService` and
  `ProductOwnerAnalyticsService`; push SQL into a `SprintAnalyticsDao`; move pure helpers to a utility.
- **Risk/effort:** **M.** Pure-helper extraction is S; capability split is mechanical.

### 6. `AutomationService` keeps two parallel condition engines (`AutomationService.java:270` & `:293`)
- **The Problem:** `conditionMatchesBql` (BQL + `jdbc` COUNT) and legacy `conditionMatches` (hand-parsed
  `field op value`) coexist; the BQL path silently `catch`es *any* exception and falls back — so the two
  engines can disagree invisibly. Two implementations of one behaviour + a correctness hazard.
- **The ONE Solution:** Make BQL the single matcher via `BqlQueryExecutor`; demote the legacy matcher to
  a last-resort only when *compilation* fails, with a narrowed `catch (BqlException)` and a log line.
- **Refactored Code:**
  ```java
  boolean conditionMatches(WorkItem item, String expr) {
      if (expr == null || expr.isBlank()) return true;
      try { return bqlExecutor.matchesItem(item.getId(), expr, BqlContext.trusted(null)); }
      catch (BqlException compileError) { log.warn("rule failed BQL compile: {}", expr); return legacyMatch(item, expr); }
  }
  ```
- **Risk/effort:** **S–M.** Behaviour-preserving for valid rules; narrowed catch is a test-guarded
  correctness improvement. Pairs with PR B4.

### 7. `DeveloperWorkspaceService` owns ~10 inline SQL blocks that belong in a DAO (`DeveloperWorkspaceService.java:29`)
- **The Problem:** One clear responsibility (engineer home surface) and correct service-layer RBAC, but
  it is *also* its own repository: `todaysWork`, `blockers`, `recentActivity`, `velocity`'s four count
  queries, and `standup`'s queries are all inline `JdbcTemplate`.
- **The ONE Solution:** Extract a `DeveloperWorkspaceDao` (`@Component`); the service keeps RBAC, AI
  orchestration, and assembly. Pure move-method refactor.
- **Risk/effort:** **S.** This is **PR B2** — the warm-up that establishes the DAO pattern.

---

## Already ONE-correct (no action)
- **`BqlCompiler`** — exemplary single responsibility: compile BQL → parameterized SQL fragment.
  Clean lexer→parser→AST→emitter, no I/O, no DB. The model the rest should imitate. **Leave alone.**
- **`KpiService`'s privacy model** — field-level security + no-drill-down enforced in the service layer.

---

## Suggested PR sequence (safest, highest-impact first)
1. **PR B1 (S, risk-free):** extract `AiHeuristics` — finding 2 step 1.
2. **PR B2 (S):** extract `DeveloperWorkspaceDao` — finding 7; establishes the DAO pattern.
3. **PR B4 (M, gated):** `BqlQueryExecutor`; migrate `KpiService` + `AutomationService` — findings 4 + 6.
4. **(Lane C) PR (L, sliced):** `WorkItemService` + `WorkItemQueryService` — finding 1.
5. **(Lane C) PR (M):** split `Iteration15AiService` (finding 5) + `CommandBarService` (finding 2 step 2).
6. **(Lane C, ongoing):** drain the ~19 raw-SQL controllers — finding 3.
