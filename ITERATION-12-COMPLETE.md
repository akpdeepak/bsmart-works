# Iteration 12 — KPI Framework with Privacy Guardrails (completion)

Layered metrics where individual data is **private by default**, aggregated upward, and the privacy
guarantee is **enforced at the API**, not the UI: a manager (or anyone) can never drill into an
individual engineer's data, even via the API. Closes all 12 specs (I12-S01…S12, Cap L).

## The defining principle

Tenant isolation (RB-40 §1) protects one workspace from another; this iteration adds the **intra-tenant
privacy model** the spec calls for. The layers — Individual / Team / Project / Manager / Org — each
carry their own access rule, and the guarantees live in one pure guard, `KpiPrivacyService`:

- **PERSONAL** — your own metrics; visible only to you, or to people you have voluntarily shared with.
- **TEAM / PROJECT / MANAGER** — aggregated only. Passing an individual identifier to any of these is a
  hard **403**, not a silent filter — the exact "manager drills into an engineer" attack, blocked.
- **ORG** — workspace-wide aggregate (`view_org_metrics`).
- **Anonymity floor** — an aggregate with fewer than `min_aggregation_size` (default 3, per-workspace
  stricter-allowed) distinct contributors is **suppressed** so a "team of one" can't be de-anonymised.

## What was built

### Data (V44)
- `metric_definitions` — the catalog (global defaults + per-workspace custom), built from safe formula
  primitives, never raw SQL.
- `metric_snapshots` — **immutable**, append-only per-period values (no update path in code) so history
  is audit-safe; only aggregated scopes are ever recorded.
- `metric_shares` — voluntary individual sharing (owner → specific recipients).
- `workspace_kpi_settings` — per-workspace privacy policy (can only tighten the default).
- Three permissions: `view_team_metrics` (LEAD), `view_org_metrics` (ADMIN), `manage_metrics` (LEAD).
- Seeds **11 default metrics**: velocity, commitment accuracy, cycle time, lead time, rework, WIP,
  blocked time, bug escape, PR turnaround, throughput, completion rate.

### Services
- `KpiPrivacyService` — the single privacy guard (layer permissions, individual-scope block, share
  gating, suppression). Pure + exhaustively unit-tested.
- `MetricFormulaService` — safe formula-primitive validation and field logic for the custom builder.
- `KpiComputationService` — honest, data-derived metrics from work items + the append-only event log;
  cycle/lead time projected from `STATUS_CHANGED` events; never groups by individual above PERSONAL.
- `CycleTimeStatsService` — median / P85 / day-bucketed histogram / outlier threshold (pure).
- `TeamHealthService` — predictability · scope stability · flow efficiency → composite + band (pure).
- `TeamHealthNarrativeService` — **deterministic** team-health narrative. Per the AI Control Plane
  fallback contract (RB-40 §2 — *no fallback = it does not ship*), this is the mandatory fallback for
  the "AI team-health narrative" spec; a documented seam lets the iteration-10/11 AI orchestrator enrich
  it later under the **same** privacy guardrails (aggregated inputs only, server-side, falls back here).
- `KpiService` — orchestrates scope resolution + privacy + catalog merge into each layered view.
- `MetricSnapshotService` + `MetricSnapshotScheduler` — weekly immutable snapshots (idempotent).

### API
- `GET /api/v1/kpi/view` — the unified layered view (per-layer RBAC + privacy enforced).
- `GET /api/v1/kpi/team-health`, `/cycle-time`, `GET|PUT /api/v1/kpi/settings`.
- `/api/v1/metrics/definitions` — catalog + custom-metric CRUD + clone-from-default.
- `/api/v1/metrics/shares` — voluntary share grant/list/revoke (owner-only).
- `/api/v1/metrics/snapshots` — read the immutable series + on-demand capture.

### UI
- New **Performance** section with a prominent layer switcher (Individual / Team / Project / Manager /
  Org), a privacy banner on aggregated views, metric cards (with suppressed/unavailable states), the
  team-health composite + narrative, the cycle-time distribution chart with outlier drill-down, a
  voluntary-sharing panel on the personal view, and a locked-by-design *"Individual engineer comparison
  unavailable — by design"* callout.

## Tests
- `KpiPrivacyServiceTest` (11), `MetricFormulaServiceTest` (5), `CycleTimeStatsServiceTest` (4),
  `TeamHealthServiceTest` (5), `TeamHealthNarrativeServiceTest` (3), `KpiControllerAccessTest` (4) —
  including the **unauthorized** and **cross-boundary** (manager-cannot-drill, share-gated personal)
  scenarios mandated by RB-05 Stage 3 / RB-40. All 223 unit tests green; frontend 111 green.

## Honest software (RB-20 §4)
Metrics whose data source is not yet wired are reported as **unavailable** with a reason, never faked:
`pr_turnaround` (needs the iteration-13 Git integration) and `blocked_time` (needs status-duration
aggregation — logged follow-up).

## Key decisions
- All privacy verdicts are pure and centralized so they hold for **every** caller, UI or API.
- Snapshots are append-only by construction (no update/delete endpoint) — historical metrics never
  change retroactively.
- A per-workspace policy may only make privacy **stricter** than the product default, never weaker.
- The migration is `V44` (rebased onto current `main`, whose high-water mark is `V43`; the orchestrator §6 reference to `V33`
  is stale and is reconciled here in the codebase per the "code is the present" rule).
