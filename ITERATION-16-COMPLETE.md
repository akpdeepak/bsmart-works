# Iteration 16 — Leadership Console (Cap X) + Admin Operations Center (Cap Y) (completion)

Iteration 16 adds the **last two role surfaces** on top of the existing data model and the
iteration-10/11 **AI Control Plane**. After this iteration, all five role surfaces are live —
Developer, Scrum Master, Product Owner, Leadership, and Admin — and BCITS leadership and
administration have meaningfully better daily workflows. No new visual language: both surfaces reuse
the MVP design system with tuned layouts (RB-30).

> **Built on the foundation, not ahead of it.** The Leadership Console is overwhelmingly a
> *read/aggregation* surface over data that already exists (work items via projects, teams, RAID
> risks, customer accounts + service requests + SLA + CSAT, objectives/key-results/OKR-links, roadmap
> themes, AI invocations/budgets, integrations/webhooks, the event log). The only genuinely new state
> is the schedulable executive-briefing card and the Admin-Ops lifecycle/seat/audit-query/access-review/
> evidence records — V50, one forward-only migration.
>
> **No live model in this build.** Every AI capability routes through `AiControlPlaneService` over
> the deterministic offline provider, exactly like iterations 11/14/15. AI-on and the fallback differ
> in narrative richness and cost accounting, never in correctness — the structured result is always
> computed deterministically from real, workspace-scoped data.

## 1. Cap X — Leadership Console

A glance-and-go console with large stat cards and eight tabbed surfaces.

| Sub-feature | What shipped | Key endpoint(s) |
|---|---|---|
| Cross-team rollup dashboard | Workspace totals + per-project delivery (completion, overdue, unassigned) + teams, all permission-aware | `GET /api/v1/leadership/rollup` |
| AI executive briefing | Schedulable, editable card; narrative (re)generated from live rollup/customer/risk data through the control plane | `/api/v1/executive-briefings` (+ `/{id}/generate`) |
| Strategic theme tracker | Roadmap themes with progress derived from the linked objective's key results | `GET /api/v1/leadership/strategic-themes` |
| Resource allocation view | Open work per member with over/under-allocation flags vs the team mean + rebalancing suggestions | `GET /api/v1/leadership/resource-allocation` |
| Risk portfolio | Open RAID risks ranked by impact × probability (1–9), with status breakdown | `GET /api/v1/leadership/risk-portfolio` |
| Customer health dashboard | Per-account composite of open/overdue requests, avg CSAT and a churn-risk band | `GET /api/v1/leadership/customer-health` |
| Strategy-to-execution map | Objectives → key results → linked work items (titles + status) | `GET /api/v1/leadership/strategy-execution` |
| Board deck auto-draft | Quarterly slide outline from rollup + themes + risks, through the control plane | `POST /api/v1/leadership/board-deck` |

## 2. Cap Y — Admin Operations Center

An operational admin surface (checklists, status indicators, action buttons) with eight tabs.

| Sub-feature | What shipped | Key endpoint(s) |
|---|---|---|
| User lifecycle automation | Onboarding/offboarding playbooks; a run snapshots steps into an audited checklist that auto-completes | `/api/v1/onboarding/*` |
| License / seat management | Plan, total/active/available seats, cost, utilization, renewal alert, growth projection | `/api/v1/admin/license-seats` |
| Workspace health monitor | Members, projects, items, storage, events today, integrations down, failed webhooks, AI budget | `GET /api/v1/admin/health` |
| AI cost dashboard | Spend vs cap; by capability / user / tier; degrade/disable threshold alerts; budget set | `GET /api/v1/admin/ai-cost`, `PUT /api/v1/admin/ai-budget` |
| Audit log explorer | Filterable (allow-listed, parameter-bound), paginated browse of the event log + saved queries | `/api/v1/audit-log` (+ `/saved-queries`) |
| Integration health dashboard | Connection status + webhook delivery stats + failed-delivery retry/replay | `GET /api/v1/admin/integration-health`, `POST /api/v1/admin/integration-health/retry/{id}` |
| Access review | Members with last-activity + inactivity flag; tenant-safe bulk-deactivate; complete with summary | `/api/v1/access-reviews` (+ `/members`, `/{id}/deactivate`, `/{id}/complete`) |
| Compliance evidence package | On-demand SOC 2 / ISO 27001 bundle from MFA adoption, audit trail, AI governance, compliance + SLA posture | `/api/v1/evidence-packages` |

## 3. Governance & engineering (RB-10 / RB-40)

- **Tenant isolation (RB-40 §1):** every new table carries `workspace_id` and is indexed on it;
  every service resolves and asserts workspace membership before any read/write. Work-item rollups
  reach rows only via `projects.workspace_id = ?`, so a leader can never roll up another tenant.
  The audit-log explorer is strictly `workspace_id`-scoped; access-review deactivation is guarded so
  a target must be a member of the acting workspace.
- **RBAC in the service, never the controller (RB-10 §2):** controllers are thin and delegate. The
  Leadership Console requires `view_items` (briefing writes require `manage_projects`); the Admin
  Operations Center requires **admin tier** (a non-member gets 404, a non-admin member 403).
- **AI Control Plane (RB-40 §2):** two new capabilities (`exec_briefing`, `board_deck`) registered
  with documented deterministic fallbacks; every invocation flows through `AiControlPlaneService`
  (scope → budget → cache → audit), and the UI shows the honest verdict via `AiMetaBadge`.
- **Event-sourced (RB-10 §3):** state changes emit workspace-scoped events (`EXEC_BRIEFING_GENERATED`,
  `ONBOARDING_STARTED/COMPLETED`, `OFFBOARDING_STARTED/COMPLETED`, `ACCESS_REVIEW_STARTED/COMPLETED`,
  `USER_DEACTIVATED`, `LICENSE_SEATS_UPDATED`, `AI_BUDGET_UPDATED`, `WEBHOOK_DELIVERY_RETRIED`,
  `EVIDENCE_PACKAGE_GENERATED`).
- **Flyway-only (V50):** one forward-only migration, all new tables plural/`snake_case`, with a
  populated walking-skeleton seed for WS-001 (two playbooks + steps, a license-seat config, a briefing).
- **Design system (RB-30):** tokens only (no raw hex / `gray-*` / arbitrary z-index); both surfaces
  reuse the existing component patterns, the five interactive states, and the loading/empty/error
  states; self-contained like the Developer Workspace (own data fetching via lib client → apiClient).

## 4. Verification

- Backend: `./mvnw compile` clean; **468 `@Tag("unit")` tests green**, including the new
  `Iteration16LeadershipTest` (allocation/risk/health scoring, briefing + board-deck fallbacks,
  seat renewal/growth, evidence-bundle rendering). Entities map to V50 via implicit snake_case so the
  schema validates (`ddl-auto=validate`).
- Frontend: `eslint` 0 errors on the new files, **272 Vitest tests green** (6 new across the two
  views — rollup render, AI briefing generate, error/retry, evidence generate, webhook retry, health),
  `vite build` clean.
- Guardrails: `scripts/guardrails.sh` blocking rules all pass (plural tables, RBAC-not-in-controller,
  Flyway naming, no `@Transactional`/`System.out` in controllers); the audit-log query uses bound
  parameters only. `generate-ai-rules.mjs --check` and `check-dod-sync.sh` in sync (§6 updated:
  active iteration 16, high-water V50, next V51).

> Testcontainers integration tests (real Postgres, including the V50 migration apply) run in CI —
> Docker is not available in the authoring sandbox.
