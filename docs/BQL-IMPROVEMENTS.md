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
  (`resolveWorkspace`) instead of `users.workspace_id`. (The `bql_filter` table/endpoints remain for
  API compatibility — a later contract migration can drop them once nothing reads them.)
