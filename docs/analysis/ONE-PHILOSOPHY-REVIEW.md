# bSmart Works — The ONE Philosophy Review

> **A ruthless, codebase-wide architecture & UX audit through the lens of the ONE Philosophy:
> singularity of purpose at every layer of software.**
>
> Reviewer role: Principal Software Architect + UX Expert.
> Date: 2026-06-13 · Scope: `works-backend` (596 Java files) + `works-frontend` (292 JS/JSX files).
> Companion deep-dives: [`ONE-backend.md`](./ONE-backend.md), [`ONE-frontend.md`](./ONE-frontend.md),
> [`ONE-source.md`](./ONE-source.md).

This review evaluates the code against four dimensions of singularity and, for every violation,
gives **The Problem**, **The ONE Solution**, and **Refactored Code**. The closing section maps each
finding to a concrete pull request — every solution is **built and pushed, with the merge held**
for review (per the request and RB-05 Stage 7: agents do not self-merge).

The codebase is, on the whole, **mature and disciplined**: a single `apiClient`, a real design-token
system, `guardrails.sh` enforcement, a clean BQL compiler, event-sourcing, and an established
extraction history (TD-003). The violations below are concentrated in a handful of God-objects and a
systemic single-source-of-truth gap between the two stacks — exactly where a fast-moving 20-iteration
product accretes entropy.

---

## How the four dimensions scored

| Dimension | Verdict | Worst offender |
|-----------|---------|----------------|
| **1 · ONE Function & Feature** (single responsibility) | ⚠️ Concentrated debt | `App.jsx` (4385 lines, ~150 `useState`); `WorkItemController` (801, 14 deps + raw SQL); `AiAssistService` (841, 13 capabilities) |
| **2 · ONE Source** (single source of truth) | ❌ Systemic | TanStack Query configured but **unused** — server state mirrored into 275 `useState`s; ~10 vocabularies hand-duplicated backend↔frontend (already drifting) |
| **3 · ONE Architecture** (clean boundaries & APIs) | ⚠️ Leaky in places | 19 of 122 controllers run raw `JdbcTemplate` SQL in HTTP handlers; three hand-typed copies of the tenant predicate |
| **4 · ONE Design** (UI/UX minimalism & focus) | ⚠️ Mostly good | 9/11/7-tab "kitchen-sink" hubs dilute single-intent; a few real token violations (`#94A3B8`, `neutral-400` for readable text) |

---

## 1 · ONE Function & Feature — single responsibility

### 1.1 `App.jsx` is the prime God-component — the whole app in one function  (`App.jsx:144`)
- **The Problem:** One `App()` (line 144) owns **~150 `useState` declarations**, **79 `fetch*`
  functions**, **44 `handle*` functions**, **13 `useEffect`s**, the keyboard-shortcut engine, the
  realtime/presence loop, URL routing, the full auth state machine, and a **40-branch view switch**
  (`view === 'dashboard' && …`). State for **18 different iterations** lives in one closure. The view
  components are already extracted, but *all their state and data-fetching are not* — so `App.jsx` is a
  4000-line state-and-fetch hub, not a router. It carries a file-level `eslint-disable` (line 1)
  precisely because it can no longer be reasoned about. This is ONE-Function broken at the largest
  possible scale: the component *is* the application.
- **The ONE Solution:** `App.jsx` should shrink to a **routing shell + providers** (~150 lines).
  Cross-cutting state moves into focused Context providers (`SessionProvider`, `WorkspaceProvider`,
  `WorkItemsProvider`, `ToastProvider`); cross-cutting effects become hooks (`useGlobalShortcuts`,
  `useRouterSync`, `usePresence`); the 40 `view ===` conditionals collapse to a route table. Extract in
  ascending blast-radius: **(1) module-scope leaf components and pure helpers, (2) self-contained
  effect hooks, (3) inline modals/auth screens, (4) ToastProvider, (5) Session→Workspace providers,
  (6) WorkItemsProvider, (7) per-cockpit state co-located with its view, (8) AppRoutes last.**
- **Refactored Code (goal state):**
  ```jsx
  export default function App() {
    const { user } = useSession();
    if (!user) return <AuthScreens onAuthenticated={signIn} />;
    return (
      <ToastProvider><WorkspaceProvider><WorkItemsProvider>
        <AppShell><AppRoutes /></AppShell>
      </WorkItemsProvider></WorkspaceProvider></ToastProvider>
    );
  }
  ```
- **Delivered now (safest slice):** **PR F1** extracts the three module-scope units that already live
  *outside* `App()` and are merely passed in as props — `getTimeOfDay`, `AiComplianceSuggestion`,
  `SprintItemList` — into their own files, continuing the TD-003 pattern with zero behaviour change. The
  provider/hook decomposition (steps 2–8) is **large/risky** and, per RB-05, is staged as a
  Deepak-checkpointed sequence rather than landed blind overnight (see §5).

### 1.2 `WorkItemController` — HTTP + business logic + raw SQL + RBAC + notifications in one class  (`WorkItemController.java:29`)
- **The Problem:** 14 collaborators plus a hand-built `ObjectMapper`. It does repository work (raw
  `JdbcTemplate` throughout, a 75-line `mapRow`), business logic (`updateWorkItem` is a 180-line
  transaction script with ~12 per-field event diffs), RBAC in the handler, and notification/email
  dispatch — at least eight responsibilities behind one `@RestController`.
- **The ONE Solution:** A `WorkItemService` owns create/update/delete/move business logic + RBAC +
  tenant scope + events; a `WorkItemQueryService` owns the `JdbcTemplate` read surface + `mapRow`; the
  controller shrinks to parse→delegate→return. Slice **per endpoint** so each step is independently
  shippable and guarded by the existing MockMvc + `WorkspaceTenantIsolationIT` tests.
- **Refactored Code:**
  ```java
  @PostMapping public WorkItem create(@Valid @RequestBody WorkItem body) {
      return service.create(authenticatedUser.id(), body);     // was a 60-line handler
  }
  @GetMapping public List<WorkItem> list(@RequestParam(required=false) String parentId, ...) {
      return queries.listForUser(authenticatedUser.id(), parentId, page, size);
  }
  ```
- **Status:** **Large/risky** (core write path; needs Testcontainers integration to verify, which is not
  runnable in this environment). Staged for the Deepak checkpoint (§5) — not landed blind.

### 1.3 `AiAssistService` — 13 unrelated AI capabilities in one service  (`AiAssistService.java:31`)
- **The Problem:** One `@Service` with 10 collaborators implements command-bar, triage, anomaly,
  generation, KB, routing, compliance, SLA, NL→BQL and summarization. Worse, `executePlan`/`executeStep`
  **re-implement** work-item writes + events + RBAC — `WorkItemService`'s job, duplicated inside an
  "assist" service. It also embeds a natural-language parser and a keyword→BQL translator.
- **The ONE Solution:** Three seams: (1) extract the **pure static** NL/heuristic helpers into a
  stateless `AiHeuristics` (zero behaviour change); (2) extract command-bar execution into a
  `CommandBarService` that *delegates* writes to `WorkItemService`; (3) leave `AiAssistService` as the
  thin per-capability orchestrator.
- **Delivered now:** **PR B1** lands seam (1) — `AiHeuristics` — the risk-free pure relocation. Seams
  (2)/(3) depend on 1.2 and are staged (§5).

### 1.4 Frontend tabbed God-views — `dashboard-view` (1300), `settings3-view` (1183), `scrum-master-cockpit-view` (937), `work-item-detail-panel` (1007), `customization-view` (988)
- **The Problem:** Each packs many independent surfaces into one file behind tabs: `dashboard-view`
  holds **5 role dashboards + 5 widget registries**; `settings3-view` destructures **52 props** for 9
  unrelated config features with 3 separate drag-drop impls; `scrum-master-cockpit-view` takes **44
  props** and renders **11 tabs inline**; `work-item-detail-panel` takes **61 props** across 6
  responsibilities. A developer editing the exec dashboard scrolls past the entire developer dashboard.
- **The ONE Solution:** One file per surface; the parent becomes a thin router; each panel owns its own
  data via a hook (killing the prop-drill). The same extraction simultaneously fixes the ONE-Design
  "single intent per screen" violation (§4.1).
- **Delivered now:** **PR F2** splits `dashboard-view` into per-role files behind a thin role-router (the
  best-tested, lowest-risk split). `settings3` / cockpit / detail-panel splits are M–L each and pair
  with the App.jsx provider work — staged (§5).

---

## 2 · ONE Source — single source of truth

### 2.1 TanStack Query is configured but **never used** — server state mirrored into local `useState`  (`App.jsx` ↔ everywhere)
- **The Problem:** `query-client.js` builds a `QueryClient` and `main.jsx` provides it, but a repo-wide
  search finds **zero** `useQuery`/`useMutation` outside those two files. Every server resource is
  fetched imperatively (`api.send` inside `useEffect`) and **mirrored into local `useState`**, then
  hand-reconciled (e.g. a manual refetch-and-merge on HTTP 409). The same resource is fetched
  independently in multiple places: `GET /users?workspaceId` in `App.jsx:762`,
  `metric-share-control.jsx:29`, and `performance-panel.jsx`; `GET /projects` in `App.jsx:761` and
  `performance-panel.jsx:165`; `GET /users/me` in `i18n.jsx:36` separately from App's identity load.
  There are **no shared query hooks and no query-key constants** — the "keys" are duplicated raw URL
  strings. This is the single biggest SSoT violation; the 275-`useState` God-component is its symptom.
- **The ONE Solution:** Adopt the cache that already ships. A `src/hooks/queries/` layer with one hook
  per resource (`useWorkspaceUsers`, `useProjects`, `useCurrentUser`, `useWorkItem`…) over the existing
  `apiClient`, each with a shared query-key factory. Components read from the cache; the local mirrors
  and manual reconciliation delete themselves.
- **Refactored Code:**
  ```js
  // src/hooks/queries/useWorkspaceUsers.js
  export const usersKeys = { list: (ws) => ['users', ws] };
  export function useWorkspaceUsers(workspaceId) {
    return useQuery({
      queryKey: usersKeys.list(workspaceId),
      queryFn: () => api.send(`/users?workspaceId=${encodeURIComponent(workspaceId)}`),
      enabled: !!workspaceId,
    });
  }
  ```
- **Delivered now:** **PR F3** introduces the hooks layer + key factories with tests, and migrates the
  two low-risk duplicate consumers (`metric-share-control`, `performance-panel`) off their private
  fetch-and-mirror. App.jsx migration is deferred to the provider work (§5). A `guardrails`/ESLint rule
  ("no `api.send` outside `hooks/queries` + `lib/*`") is recommended to stop the pattern eroding again.

### 2.2 Cross-stack vocabularies hand-duplicated — and already drifting
- **The Problem:** The same enumerations are typed independently in Java and JS, with nothing enforcing
  equality. Confirmed duplications, **already drifting in two cases**:
  | Vocabulary | Backend source | Frontend copy | Drift? |
  |---|---|---|---|
  | 16-type work-item taxonomy + `VALID_CHILDREN` + auto-ID prefixes + colours | `DefaultWorkItemTypes.java` | `work-item-types.js` (comment: *"mirrors DefaultWorkItemTypes"*) | ✅ colours diverge (`PRODUCT` = `#334155` vs `bg-neutral-700`; backend `#475569` ≠ frontend `bg-neutral-600`) |
  | Role keys `{developer, scrum-master, product-owner, executive, admin}` | `TodayLayoutService.ROLE_KEYS` | `today-layouts.js`, `nav-model.js` | ✅ `executive` vs `leadership` |
  | Priority `CRITICAL/HIGH/MEDIUM/LOW` | `RequestTypeService.PRIORITIES` | 10+ literal arrays | ✅ phantom `HIGHEST` in `dashboard-metrics.js:14` |
  | Raise types, status categories, outcomes, RBAC tier ladder, SLA snapshot states, supported locales | various | various | values match (yet) |
- **The ONE Solution:** Backend owns each list and exposes it via an endpoint; the frontend consumes it
  (the pattern `ChartType` already uses correctly). Where a build-time mirror must remain for ergonomics,
  generate it — never hand-type. Highest priority: the work-item taxonomy and role keys (already drifted).
- **Delivered now:** **PR B3** consolidates the backend's *own* duplicated supported-locale list (it is
  hand-typed in `UserController` **and** `User.java`, and the DB default `en-IN` even fails the
  controller's own validator) into one `SupportedLocales` constant — a safe, self-contained first cut of
  the SSoT discipline. The full cross-stack taxonomy/role-key unification touches the data model and RBAC
  and is **Deepak-checkpointed** (§5, Orchestrator §5).

### 2.3 Three hand-typed copies of the tenant predicate  (`KpiService.java:507` ↔ `AutomationService.java:275` ↔ `WorkItemController.java:91`)
- **The Problem:** `applyTargetsAndCustomMetrics`, `conditionMatchesBql`, and `MEMBER_PROJECTS` each
  hand-build the workspace-scope predicate (`project_id IN (SELECT id FROM projects WHERE
  workspace_id = ?)`) as a string literal. Three copies of the one rule RB-40 §1 says must be applied
  *centrally* — and `AutomationService` keeps **two parallel condition engines** whose BQL path silently
  swallows every exception and falls back to a legacy matcher, so the two can disagree invisibly.
- **The ONE Solution:** One `BqlQueryExecutor` that owns "compile BQL + apply the central workspace
  predicate + run the scoped query". `KpiService` and `AutomationService` call it; the legacy matcher
  becomes a last-resort only on *compile* failure, with a narrowed `catch`.
- **Delivered now (flagged):** **PR B4** introduces `BqlQueryExecutor` and migrates both consumers —
  behaviour-preserving, and it directly advances the documented central-predicate goal (#243). Because it
  touches tenant isolation, the **merge is explicitly held for Deepak's sign-off** (Orchestrator §5).

---

## 3 · ONE Architecture — clean boundaries & APIs

### 3.1 Controllers own raw `JdbcTemplate` SQL — the boundary is leaky across ~19 controllers
- **The Problem:** 19 of 122 controllers inject `JdbcTemplate` and run SQL in HTTP handlers, collapsing
  the controller and repository layers (`SprintController:64` grouped `SUM`; `ArticleController:32`;
  `WorkItemController:33`; `DeveloperWorkspaceService` is *also* its own DAO with ~10 inline queries).
  Every inlined query is a place the tenant predicate can be forgotten — exactly what the `guardrails.sh`
  raw-SQL tripwire watches for.
- **The ONE Solution:** Push each controller/service's SQL into the matching `@Repository`/read-DAO; the
  caller invokes one method instead of `jdbc.query(...)`. No endpoint or signature changes.
- **Refactored Code:**
  ```java
  @Component public class DeveloperWorkspaceDao {   // owns the JdbcTemplate read surface
      List<Map<String,Object>> todaysWork(String wsId, String userId) { /* moved verbatim */ }
      VelocityCounts velocity(String wsId, String userId) { /* … */ }
  }
  // service keeps RBAC + AI orchestration + assembly: var v = dao.velocity(wsId, userId);
  ```
- **Delivered now:** **PR B2** extracts `DeveloperWorkspaceDao` — the pure move that establishes the DAO
  pattern the rest of the long tail reuses. Draining the other ~18 controllers is a batch of small,
  independent follow-up PRs (§5).

### 3.2 What is already ONE-correct (leave alone)
- **`BqlCompiler` (650 lines)** — exemplary single responsibility: compile BQL → parameterized SQL
  fragment, nothing else. A clean lexer→parser→AST→emitter pipeline. It is the model the rest should
  imitate.
- **The single `apiClient`** — the only `fetch` caller; no inline `fetch`/`axios` anywhere. Sound.
- **`KpiService`'s privacy model** — field-level security + no-drill-down enforced server-side, correctly.

---

## 4 · ONE Design — UI/UX minimalism & focus

### 4.1 Tabbed "hubs" dilute single-intent  (`settings3-view` 9 tabs, `scrum-master-cockpit-view` 11, `customization-view` 7)
- **The Problem:** RB-20 §4 permits high information density, but density must serve *one* intent per
  screen. A 9-tab settings hub mixing workflow automation, field schema, RBAC, and taxonomy has no
  primary intent — the user must first decide *which of four products* they are configuring.
- **The ONE Solution:** Regroup tab clusters into focused nav destinations (RB-30 §7) — e.g. Settings →
  "Workflows", "Fields", "Roles & Permissions", "Item Types" as four sub-rail entries. The Scrum cockpit
  already hints at this with its Run-vs-Insights grouping; extend it. The design fix and the
  single-responsibility fix (§1.4) are the *same extraction*.
- **Status:** Paired with the §1.4 view splits — staged (§5); `dashboard-view` per-role split lands now
  (PR F2) as the first instance.

### 4.2 Real design-token violations
- **The Problem:** RB-30 §1 requires tokens never literals. Verified violations: raw hex fallback
  `'#94A3B8'` (`work-item-detail-panel.jsx:263`); `bg-neutral-400` encoding progress/priority meaning
  (`dashboard-view.jsx:629,714,786`); `text-neutral-400` on readable/informational text — including an
  "AI" label — (`scrum-master-cockpit-view.jsx:258,490`), which fails WCAG AA contrast (neutral-400 is
  the disabled/placeholder token).
- **The ONE Solution:** Hex fallback → `bg-neutral-300` token; meaning-bearing bars → semantic tokens
  (`semantic-danger/warning`, `brand-navy/40`); readable muted text → `neutral-600`.
- **Refactored Code:**
  ```jsx
  // status dot — token fallback, data-driven colour only when present
  <span className={statusMeta?.color ? 'h-2.5 w-2.5 rounded-full' : 'h-2.5 w-2.5 rounded-full bg-neutral-300'}
        style={statusMeta?.color ? { backgroundColor: statusMeta.color } : undefined} aria-hidden="true" />
  ```
- **Delivered now:** **PR F4** fixes all of the above (verified against `guardrails.sh`).
- **Verified non-violations:** `z-modal`/`z-dropdown`/`z-panel` are *defined* named tokens
  (`tailwind.config.js:100–109`, RB-30 §9) — correct usage, no action.

---

## 5 · What ships now vs. what waits for the Deepak checkpoint

Per the request, **every solution below is built and pushed as its own PR with the merge held.** They
split into two lanes by the rule book's own risk policy (RB-05 Stage 0; Orchestrator §5 — *"stop and ask
on data model, security, tenant isolation, RBAC, irreversible migration"*).

### Lane A — built, verified green locally, ready to merge on review
| PR | Dimension | Change | Verified by |
|----|-----------|--------|-------------|
| **DOCS** | all four | this review + the three deep-dives | n/a (docs) |
| **B1** `refactor/ai-heuristics` | 1 Function | extract pure `AiHeuristics` from `AiAssistService` | `mvnw verify` (compile+Checkstyle) + unit tests |
| **B2** `refactor/developer-workspace-dao` | 3 Architecture | extract `DeveloperWorkspaceDao` (one job per layer) | `mvnw verify` + unit tests |
| **B3** `refactor/locale-ssot` | 2 Source | one `SupportedLocales`; fix DB default `en-IN` | `mvnw verify` + unit tests |
| **F1** `refactor/app-extract-leaf-components` | 1 Function | move `getTimeOfDay`/`AiComplianceSuggestion`/`SprintItemList` out of `App.jsx` | `npm run lint` + `npm test` + `npm run build` |
| **F2** `refactor/dashboard-view-split` | 1 Function + 4 Design | split 5 role dashboards into per-role files | lint + test + build |
| **F3** `feat/query-hooks-ssot` | 2 Source | shared TanStack Query hooks; migrate 2 duplicate consumers | lint + test + build |
| **F4** `fix/design-token-violations` | 4 Design | hex/`neutral-400` → tokens | lint + test + build + guardrails |

### Lane B — built where safe, but merge **explicitly gated on Deepak** (touches tenant/AI/data-model/RBAC)
| PR | Why gated | State |
|----|-----------|-------|
| **B4** `refactor/bql-query-executor` | tenant isolation (RB-40 §1, #243) | built + verified, **flagged HOLD** |

### Lane C — staged, not landed blind (Large/risky per RB-05; need a checkpoint *before* code)
These are specified at code level in the deep-dive docs and the §1/§2 snippets above, but are too large
to land unverifiable overnight (the core write-path refactor needs Testcontainers integration that this
environment cannot run, and the App.jsx provider decomposition is an 8-step sequence):
1. `WorkItemController` → `WorkItemService` + `WorkItemQueryService`, sliced per endpoint (§1.2).
2. `App.jsx` provider/hook decomposition, steps 2–8 (§1.1).
3. `settings3` / `scrum-master-cockpit` / `work-item-detail-panel` per-tab splits (§1.4 + §4.1).
4. `CommandBarService` extraction from `AiAssistService` (§1.3, depends on #1).
5. Cross-stack taxonomy + role-key unification via backend endpoints (§2.2 — data model + RBAC).
6. Drain the remaining ~18 raw-SQL controllers into DAOs (§3.1, batched).
7. AI model-tier honesty (`OPUS` silently downgraded) and the 3-way risk-score unification — **AI/data
   governance, Deepak sign-off required** (Orchestrator §5).

Each Lane-C item is a tracked follow-up, not abandoned work — this is the rule book's
"propose, never silently expand scope; large/risky gets a checkpoint before code" discipline (RB-05
Stage 0) applied honestly.

---

## Closing assessment

The product is not architecturally adrift; it is a well-run codebase with its entropy **localized** in a
few God-objects and one systemic SSoT gap. The ONE Philosophy is mostly *already lived* — one API client,
one design system, one query language, one event store. The work is to finish what the codebase started:
let TanStack Query be the one source of server state, let services (not controllers) own logic, let the
backend own each vocabulary, and let `App.jsx` become the router it pretends to be. The PRs below take
the first, safe, reversible steps on every one of those fronts.
