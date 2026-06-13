# BQL — Improvement Analysis & Roadmap

> Analysis of the bSmart Query Language (BQL) subsystem: current state, defects,
> language/feature gaps, and the UX program. BQL is one of the seven unification layers
> (RB-10 §6, RB-40 §1) — the single query language across filters, saved views, automations,
> compliance rules, KPI definitions, SLA policies, and dashboard widgets.
>
> Last verified 2026-06-13 · owner: Deepak Pandey

---

## 1. Current state (as built)

| Area | File | Notes |
|------|------|-------|
| Compiler | `BqlCompiler.java` | Regex translator → parameterized SQL `WHERE` fragment |
| User endpoint | `BqlController.java` | `/api/v1/bql/execute`, `/validate`, saved-filter CRUD |
| Saved filters | `BqlFilter.java`, `BqlFilterRepository.java` | Workspace + user scoped |
| Frontend | `views/bql-view.jsx` | Textarea + run/save + NL→BQL panel + saved views |
| NL→BQL (AI) | `AiAssistService.deterministicNlToBql` | Keyword → BQL fallback for the AI feature |

**BQL is genuinely the unification layer.** `BqlCompiler` is consumed by 8 services:
`BqlController`, `KpiService`, `WidgetDataService`, `AutomationService`, `SlaPolicyController`,
`SlaEvaluationService`, `ComplianceEvaluationService`, `ComplianceRuleController`. Any improvement
to the compiler benefits every surface — and any defect is correspondingly amplified.

Grammar before this work:

```
query     := condition ( (AND|OR) condition )*       -- flat, no precedence, no grouping
condition := field IN ( value (,value)* ) | field op value
op        := = != <> >= <= > < CONTAINS STARTSWITH
value     := currentUser() | today() | now() | 'quoted' | number | bareword
```

---

## 2. Critical issues (correctness / security)

### 2.1 `execute()` was not workspace-scoped — cross-tenant leak *(P0)*
`BqlController.execute()` ran `SELECT … FROM work_items WHERE deleted_at IS NULL [AND <bql>]`
with **no `workspace_id` predicate**. Every other BQL consumer scopes via
`project_id IN (SELECT id FROM projects WHERE workspace_id = ?)`; the user-facing endpoint did not.
This is the single catastrophic risk named in RB-40 §1 — any authenticated user could read every
tenant's work items. **Fixed:** scoping is now applied centrally for the user query path, and a
cross-tenant integration test guards it.

### 2.2 NL→BQL emitted a dialect the compiler could not parse *(P1)*
`deterministicNlToBql()` produced `assigneeId = @me`, `createdAt > @startOfWeek`,
`assigneeId = null`, `type = "Bug"`. The compiler understood none of these: `@me` bound as a literal
string, `assigneeId` resolved to a non-existent column, `null` bound as the string `"null"`. The
headline "ask in plain English" feature generated queries that silently returned wrong results or
threw. **Fixed:** the translator now emits canonical BQL (`assignee = currentUser()`,
`createdAt >= startOfWeek()`, `assignee IS EMPTY`).

### 2.3 Inconsistent scoping idiom; one path silently broken *(P0)*
`KpiService` queried `FROM work_items WHERE workspace_id = ?`, but `work_items` has no
`workspace_id` column (it scopes through `projects`). The query threw and was swallowed by
`catch (Exception ignored)`, so every custom BQL-formula KPI silently returned nothing.
**Fixed:** unified on the `project_id → projects.workspace_id` idiom.

### 2.4 Field allow-list was open by default *(P0)*
`BqlCompiler.field()` mapped ~10 aliases, then let **any** `[a-z0-9_]+` token through as a real
column — a denylist, not an allow-list. RB-40 §1 requires field-level security (per-field,
per-role, server-enforced). **Fixed:** a closed allow-list (`BqlFieldRegistry`) with a typed field
catalogue and a sensitive-field gate keyed off `RbacService`.

---

## 3. Language & feature upgrades *(P2)*

The regex translator was replaced with a real **lexer → recursive-descent parser → AST → SQL**
pipeline. New capabilities, available to every consumer at once:

- **Grouping & precedence** — parentheses, correct `OR` < `AND` < `NOT` < primary precedence.
  `status = Open AND (priority = High OR priority = Critical)` now works.
- **Negation** — `NOT (…)` prefix.
- **Null checks** — `IS EMPTY` / `IS NOT EMPTY` (replaces the broken `= null`).
- **Set operators** — `IN (…)`, `NOT IN (…)`.
- **Range** — `BETWEEN x AND y`.
- **String operators** — `CONTAINS`, `STARTSWITH`, `ENDSWITH`.
- **Relative-date functions** — `today()`, `now()`, `startOfWeek()`, `endOfWeek()`,
  `startOfMonth()`, `endOfMonth()`, `daysAgo(n)`, `daysFromNow(n)` — compiled to parameterized SQL.
- **Typed fields** — numeric/date/text/enum awareness for correct coercion and validation.

Every value remains a bind parameter; field names are resolved through the closed registry. The
injection guarantee (WRK-BUG-07 / TD-004) is preserved and strengthened.

---

## 4. UX program *(P3)*

- **Schema/metadata endpoint** (`GET /api/v1/bql/schema`) — fields, operators, functions, and enum
  values, so the client never hard-codes the grammar.
- **Autocomplete** — field, operator, function and enum-value suggestions as you type.
- **Live validation** — debounced `/validate` with the error surfaced inline before running.
- **Visual builder** — a clause/chip builder that round-trips to BQL text. RB-40 §2 *mandates* a
  manual builder as the AI-off fallback; this fulfils it.
- **Field/operator reference** kept in sync with the schema endpoint instead of static copy.

---

## 5. Fallback contract (RB-40 §2)

| AI state | Behaviour |
|----------|-----------|
| AI on, in budget | NL→BQL uses the model, returns confidence |
| AI off / over budget / unavailable | Deterministic keyword→BQL translator (canonical dialect) |
| User prefers manual | Visual builder + autocomplete — no AI required |

NL→BQL never executes directly: it populates the editor for review, then the normal compile +
workspace-scope + RBAC path runs.

---

## 6. Status

- [x] P0 — workspace scoping, unified idiom, closed field allow-list, field-level security gate
- [x] P1 — NL→BQL dialect unified with the compiler
- [x] P2 — parser/AST grammar upgrade (grouping, NOT, BETWEEN, NOT IN, IS EMPTY, relative dates)
- [x] P3 — schema endpoint, autocomplete, live validation, visual builder

---

## 7. Round 2 — stored-BQL compatibility (regression fix, #242)

The stricter P2 parser + closed allow-list broke BQL **already stored in seed data** (compiled
with no try/catch in `ComplianceEvaluationService`):

- **Multi-word bare values** — `status = In Progress` threw "Unexpected token". `parseValue` now
  consumes consecutive non-reserved words into one value (stops at a keyword / operator / paren /
  comma / EOF). Also a UX win — no quoting needed.
- **Missing long-text fields** — `acceptance_criteria`, `steps_to_reproduce`, `definition_of_done`,
  `expected_result`, `actual_result` registered as `TEXT`.
- Guard test compiles every scope/assertion pair from the V37 seed templates.

## 8. Round 3 — depth & cleanup

- **Custom fields are queryable** *(closes the biggest unification gap)* — `field_def` /
  `work_item_field_value` custom fields resolve by `field_key` and compile to a membership subquery
  against the value store (`value_text` / `value_number`), supporting `=`, `!=`, relational,
  `CONTAINS`/`STARTSWITH`/`ENDSWITH`, `IN`/`NOT IN`, `BETWEEN`, `IS [NOT] EMPTY`. Carried on
  `BqlContext`; surfaced in `/schema` (`custom: true`) so autocomplete + the visual builder include
  them. System-side consumers (KPI/SLA/compliance) compile trusted with no custom fields.
- **Operator / field-type validation** — the typed registry now rejects nonsensical pairings
  (`CONTAINS` on a number, relational/`BETWEEN` on text/enum) at compile time.
- **Pagination** — `/execute` accepts `page` + `size` (clamped 1..500, default 100) instead of a
  hard `LIMIT 500`; the editor gained a **Show more** control.
- **Filters/Views consolidation** — the redundant "Saved Filter" surface is gone; **Saved Views**
  is the single concept. The saved-filter endpoints now scope to the active workspace
  (`resolveWorkspace`) instead of `users.workspace_id`.

## 9. Round 4 — closing the two follow-ups

- **`bql_filter` contract migration (done)** — `V83` migrates any existing saved filters into
  `saved_views` (data preserved, keyed `SV-<id>`) then `DROP`s the legacy table. The
  `/api/v1/bql/filters` endpoints, the `BqlFilter` entity, the repository, and the App.jsx plumbing
  are removed. Saved Views is now the sole saved-query store end to end (expand→contract complete,
  RB-10 §3).
- **Relational queries on custom date fields (done)** — `V82` adds a typed `value_date` column to
  `work_item_field_value` (backfilled from ISO-prefixed `value_text`). DATE custom fields now map to
  `BqlType.DATE` and compile against `value_date`, so `>`, `<`, `>=`, `<=`, `BETWEEN` work;
  `FieldDefController` keeps `value_date` in sync on write. Date literals bind as `?::date` (custom
  *and* built-in date fields) so a string param no longer mismatches a date column.

## 10. Round 5 — JIRA-style navigator + JQL parity

Brings the BQL screen (top-bar **BQL** button → `navigate('bql')`) to JIRA filter / JQL parity and
fixes several long-standing JQL pain points.

**JIRA-filter parity**
- **Results are a sortable issue navigator** (`bql-results-table.jsx`): click a column header to sort
  (compiles to the backend's allow-listed `ORDER BY`), a **column chooser** (persisted per user in
  `localStorage`), and **CSV export**. `/execute` now returns a wider column set to choose from.
- **Rows always open their work item** — like JIRA, clicking any result opens the detail panel; if
  the item isn't in the local cache the view fetches it by id (`GET /work-items/{id}`). Previously a
  result not in the cache silently did nothing.
- **Shareable / bookmarkable query URL** — a run reflects `?bql=…&bqlSort=…` into the URL
  (`replaceState`), seeded back on load + auto-run; a **Copy link** button shares without saving.

**JQL pain points addressed**
- **Inline, caret-aware autocomplete** in the editor (fields → operators → enum values → connectors),
  keyboard-navigable (↑/↓/Enter/Esc) — the signature JQL editor experience, schema-driven.
- **Positional parse errors** — `BqlException` carries a character offset, surfaced by `/validate`
  and shown as "At position N: …", instead of JQL's opaque, locationless errors.
- **Recent-query history** (last 8, `localStorage`) for one-click re-run — something JIRA lacks.

## 11. Round 6 — language batch 1 (more JQL parity)

First batch of the "add everything" follow-ups — compiler-contained, low risk:

- **In-syntax `ORDER BY`** — `… ORDER BY priority DESC, dueDate ASC`. The controller strips the
  trailing clause, resolves aliases→columns, validates each against the sortable allow-list
  (multi-column), and it takes precedence over the `sort` param. `/validate` strips it too so the
  predicate validates like it runs.
- **More date functions** — `startOfQuarter()`, `endOfQuarter()`, `startOfYear()`, `endOfYear()`,
  `startOfDay()`, `endOfDay()` (compiled to parameterized `date_trunc`/interval SQL).
- **Full-text search** — `~` operator (fuzzy "contains" on any text field) and a virtual **`text`**
  field that searches `title` + `description` together (`text ~ "login"`). Surfaced in `/schema`
  for autocomplete; `~` is type-checked (rejected on number/date).

### Remaining batches (sequenced)
- **Batch 2 — everyday UX:** ID→name resolution in autocomplete + results, saved-view persists
  columns/sort, global `/` shortcut + "explain this query".
- **Batch 3 — historical:** `WAS` / `CHANGED` operators over the event store.
- **Batch 4 — collections & context fns:** `labels CONTAINS ANY (...)` (tags), `currentSprint()`,
  `membersOf(team)`.
- **Batch 5 — workflow/governance (needs design sign-off):** filter subscriptions/alerts, bulk
  actions on results, group-by/board view, BQL execution audit + row-count preview.

## 12. Round 7 — historical queries (WAS / CHANGED)

Batch 3 — the marquee JQL differentiator, powered by the append-only event store:

- **`field WAS value`** — the field held `value` at some point (matches either side of a recorded
  change). Compiles to `id IN (SELECT aggregate_id FROM events WHERE field_name = ? AND (new_value
  = ? OR old_value = ?))`.
- **`field CHANGED [FROM a] [TO b] [AFTER|BEFORE|ON when]`** — any transition, optionally
  constrained by from/to values and an `occurred_at` window (`when` is a date function or a
  `?::date` literal).
- History-tracked fields mirror `EventService.recordDiff`: status, assignee, priority, type, title,
  dueDate, storyPoints, parent. Untracked fields are rejected with a clear error.
- The outer `id IN (…)` is already workspace-scoped (work_items are), so the event subquery needs no
  extra tenant predicate. History values match the recorded display value (e.g. assignee = name).
- Surfaced in `/schema` operators (`WAS`, `CHANGED`). 59 compiler tests.

## 13. Round 8 — labels as a collection field (Batch 4, #277)

JQL has `labels IN (...)`; BQL now matches it. `labels` is a one-to-many collection (the `tags`
table), not a `work_items` column, so every operator compiles to a **membership subquery**:

- `labels = X` → `id IN (SELECT work_item_id FROM tags WHERE tag = ?)`; `labels != X` flips to
  `id NOT IN (...)`.
- `labels IN (a, b)` / `NOT IN (...)` → `... WHERE tag IN (?, ?)`.
- `labels CONTAINS x` / `~` / `STARTSWITH` / `ENDSWITH` → `... WHERE tag ILIKE ?`.
- `labels IS EMPTY` → `id NOT IN (SELECT work_item_id FROM tags)`; `IS NOT EMPTY` → `id IN (...)`.
- Relational operators are rejected (labels are textual). Surfaced in `/schema`; 9 new compiler
  tests. The outer `id IN (…)` only matches already-workspace-scoped rows, so no extra tenant
  predicate is needed (same guarantee as history/custom-field subqueries).

## 14. Round 9 — group-by / board view (Batch 5, #278)

The JIRA board parity feature, as a read-only aggregation:

- **`POST /api/v1/bql/group`** takes `{ query, groupBy }` and returns count-per-bucket
  (`SELECT COALESCE(<col>::text,'') AS value, COUNT(*) AS count … GROUP BY <col>`), with the same
  hard workspace scope + field-level security as `/execute`.
- `groupBy` resolves through the field allow-list and must be in a closed `GROUPABLE` set
  (status, type, priority, severity, assignee, project, sprint) — the GROUP BY target is never raw
  user SQL. `null` buckets come back as `''` (an "unassigned" lane). Exposed as `groupable` in
  `/schema`.
- **Frontend**: a Group-by control renders count bars in the BQL screen; assignee/project/sprint
  buckets resolve to display names; clicking a lane drills in by ANDing the bucket onto the query.
- 2 new workspace-scoped integration tests (count-per-bucket isolation; filter-before-count).

## 15. Round 10 — bulk actions (Batch 5)

Bulk-edit the navigator's results, JIRA-style: select rows → apply one change to all.

- **`POST /api/v1/work-items/bulk`** `{ ids, action, value }` where action ∈ {assignee, priority,
  addLabel, removeLabel}. Logic in `WorkItemBulkService` (RBAC in the service layer, RB-10).
- **Per-item RBAC** — each item is re-checked with `RbacService.canEdit`, which resolves the
  item's own workspace, so a caller can only ever change items in workspaces they belong to
  (RB-40 §1). Un-editable items are **skipped with a reason**, never mutated (partial-success
  contract). **Audited** — every applied change emits a per-field diff to the event store, exactly
  like the single-item update path (RB-20 §5).
- Status is deliberately **not** a bulk field — it must run the DoD gate + workflow rule engine per
  item; bulk-shortcutting those would be unsafe.
- **Frontend**: row checkboxes + a selection toolbar (set priority / add / remove label) in the BQL
  results table; applying re-runs the query so the change is reflected.
- Integration tests cover the mandatory unauthorized + cross-tenant scenarios plus add/remove-label
  and audit, against real Postgres.

## 16. Round 11 — audit of saved/automated runs (Batch 5)

The audit half of the "saved/automated runs only" decision. Automations already keep their own
`automation_runs` log, so the gap was **saved-view runs** (and, next, subscription runs).

- **`BqlExecutionService`** — extracted as the single place the workspace-scope predicate is applied
  to a BQL run (RB-40 §1: "scoping applied centrally, not re-typed per query"). The `/bql/execute`
  endpoint, the saved-view run, and the subscription scheduler all route through it, so none can
  forget the tenant predicate. `BqlContextFactory` likewise centralises field-level-security context
  construction.
- **`POST /api/v1/saved-views/{id}/run`** — runs a view server-side (workspace-scoped, field-secure)
  and appends a `bql_run_audit` row (who ran which view, when, current match count). Migration **V85**
  adds the append-only `bql_run_audit` table (`SAVED_VIEW` / `SUBSCRIPTION` source). Ad-hoc
  `/bql/execute` is intentionally not audited.
- **`GET /api/v1/saved-views/audit`** — admin-gated (`manage_projects`) read of the workspace's run log.
- **Frontend**: loading a saved view now runs through the audited endpoint instead of ad-hoc execute.
- Integration tests cover workspace-scoped run results, audit-row recording with match count, and the
  admin-gated read (unauthorized VIEWER rejected).
