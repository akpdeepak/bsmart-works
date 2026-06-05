# Iteration 12 — KPI Framework with Privacy Guardrails (completion)

Iteration 12 delivers layered delivery metrics **without** the trust-destroying surveillance pattern
of individual comparison. The headline guarantee is **privacy by design (commitment 4, RB-40 §1):
individual data is private by default, team/project/org data is aggregated, and the manager view
cannot drill into individuals — enforced at the API, not the UI.**

## 1. Privacy model (the differentiator)

- **Personal view is self-or-shared only.** `KpiService.personal(ws, requester, target)` returns
  another user's metrics **only** if that user has a `metric_shares` row granting the requester —
  otherwise it throws `403`. There is no parameter a manager can pass to bypass this.
- **Manager view exposes no individual path.** `KpiService.manager(ws)` returns aggregated metrics
  **per team** and deliberately accepts no user id. The UI carries the locked-by-design
  *"Individual engineer comparison is unavailable by design"* callout.
- **Custom metrics can never target INDIVIDUAL scope.** `MetricFormula.validateDefinition` rejects
  it (`400 INVALID_SCOPE`), so an aggregate metric can't become a back-door into one person's numbers.
- **Snapshots are immutable** (`metric_snapshots`, append-only) — historical metrics never change
  retroactively (audit-safe, RB-20 §5).

## 2. What shipped

- **Migration `V43__kpi_framework.sql`** — `metric_definitions`, `metric_snapshots`, `metric_shares`,
  plus `view_team_metrics` (LEAD) and `manage_metrics` (ADMIN) permissions. Plural, workspace-scoped,
  indexed.
- **Default catalog** (`MetricCatalog`): velocity, commitment accuracy, cycle time, lead time, rework,
  WIP, blocked time, bug-escape, PR turnaround, throughput, completion rate.
- **Safe formula builder** (`MetricFormula`): `SUM / AVG / PERCENTILE / COUNT / RATIO` — no raw SQL,
  no row-level access.
- **`KpiService`**: personal / team / project / manager / org layers, team-health composite
  (predictability, scope stability, flow efficiency), cycle-time distribution (median, P85, outliers),
  immutable snapshots + history, voluntary sharing, and an **AI team-health narrative** routed through
  the iteration-11 control plane (`KPI_NARRATIVE`) with a deterministic fallback (RB-40 §2).
- **API** `/api/v1/kpi` — catalog, definitions, personal, team, project, manager, org, health,
  distribution, narrative, shares. RBAC in the service boundary; every endpoint workspace-scoped.
- **UI**: `PerformancePanel` — Individual / Manager / Org layer switcher, a privacy banner, the
  manager guardrail callout, metric cards, loading/empty/error states; tokens only, WCAG-AA.

## 3. Tests

- `MetricFormulaTest` — primitives + the INDIVIDUAL-scope privacy rejection.
- `MetricCatalogTest` — the default set + private-vs-aggregate split.
- `KpiServiceTest` — **personal cross-user denied without a share, allowed with one; manager has no
  individual path; custom INDIVIDUAL rejected; narrative falls back deterministically**; pure calcs.
- `KpiControllerAccessTest` — unauthorized + cross-tenant + the read/write permission split.
- Frontend `performance-panel.test.jsx` — personal layer + the manager guardrail callout.

## 4. Not in scope (logged)

- Inline team/project metric pickers in the UI (the endpoints exist and are tested; the panel ships
  the no-id Individual/Manager/Org layers that carry the privacy story).
- A scheduled snapshot job (the snapshot API exists; wiring a cron writer is follow-up).
