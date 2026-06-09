# Iteration 8 — SLA Engine: Internal & Generalized (completion)

Iteration 8 delivers the unified SLA engine that powers internal delivery commitments (P0 bugs
in 4 hours, code review in 24 hours) and, by design, folds into the customer-facing SLA tiers
built in iteration 9. After this iteration, BCITS engineering teams have explicit, tracked SLA
commitments visible in every work-item view (spec `06`, Part 7, ITER 8, Cap M).

> **Note on delivery order.** The spec placed iteration 8 between iteration 7 (Compliance) and
> iteration 9 (Service Management). In practice, iteration 9's customer portal was built first
> (with a self-contained `customer_sla_tiers`-based SLA implementation noted as a follow-up).
> The generalized engine (`V46__sla_engine.sql`) landed after iteration 9 and supersedes that
> self-contained implementation — the customer-facing SLA tiers in `customer_sla_tiers` fold
> into the generalized engine's `customer_tier` field on `sla_policies`.

## 1. Data model (`V46__sla_engine.sql`)

| Table | What it holds |
|---|---|
| `sla_calendars` | Business-hours definitions (per-weekday windows, holidays, timezone — IST default) |
| `sla_policies` | BQL-scoped policies with `calendar_id`, `customer_tier` (for iter-9 multi-tier), `active` flag |
| `sla_targets` | Multiple targets per policy (FIRST_RESPONSE / RESOLUTION / custom), each with `target_minutes`, start/stop/pause statuses |
| `sla_instances` | Live clocks (RUNNING / PAUSED / MET / BREACHED / STOPPED), elapsed minutes, projected `due_at`, `escalated_steps` JSONB |
| `sla_escalations` | Per-policy threshold-percent or on-breach actions (NOTIFY / REASSIGN) with routing targets |

New permission: `manage_sla` (LEAD tier). All tables workspace-scoped (`workspace_id` on every row).
Every lifecycle transition emits to the append-only `events` table — the SLA audit log is
rebuildable from events without a separate audit store.

## 2. Backend (workspace-scoped, RBAC at service boundary)

### Policy and calendar management (Cap M)
- **SlaCalendarController / SlaCalendarService**: business-hours calendar CRUD with per-weekday
  windows and holiday arrays (`/api/v1/sla/calendars`).
- **SlaPolicyController / SlaPolicyService**: policy CRUD; clone-from-template; test-mode dry-run
  (shows items that would be in scope); bulk-apply with preview (shows N items affected before
  committing); activate / deactivate (`/api/v1/sla/policies`). The `customer_tier` field makes
  policies compatible with iteration-9 multi-tier SLAs.
- **SlaTargetController**: multiple targets per policy — FIRST_RESPONSE, RESOLUTION, and custom
  metric names; start/stop/pause-status lists drive the clock lifecycle.

### SLA clock engine (Cap M)
- **SlaClockService**: evaluates all active policies on work-item creation and status change;
  creates / starts / pauses / resumes / meets / breaches `sla_instances` via business-minute
  arithmetic against the policy's calendar. Business minutes are computed accurately (skipping
  off-hours, weekends, holidays). The service is idempotent — re-evaluating an item that already
  has a clock updates it rather than creating a duplicate.
- **Countdown timers**: `due_at` is recomputed on every clock tick; the API returns `remaining_minutes`
  and a `breach_state` (OK / WARN / BREACHED) for each instance so the frontend can render the
  timer badge without local time-zone arithmetic.

### Escalation engine (Cap M)
- **SlaEscalationService**: at each clock tick, checks `escalated_steps` JSONB to avoid re-firing;
  triggers NOTIFY or REASSIGN actions when `threshold_percent` consumed or on breach. Multi-step
  escalation: each step fires once, guarded by the `escalated_steps` idempotency array.

### SLA reporting (Cap M)
- Met / breached rates by period, team, policy; trend analysis over the last N sprints/months.
  Computed from `sla_instances` snapshots (`/api/v1/sla/reports`).

### SLA audit log (Cap M)
- Projection over `events` filtered to SLA event types (INSTANCE_STARTED, INSTANCE_PAUSED,
  INSTANCE_BREACHED, …); exportable as CSV for compliance review.
- Bulk-apply with preview: `/api/v1/sla/policies/{id}/bulk-apply` — returns a preview of affected
  items before committing; committed in a single transaction.

## 3. Frontend

- **SLA timer badge** on work-item cards and detail header: green (>50% remaining), amber (<50%),
  red-pulsing (breached). Color is never the only signal — the remaining time (e.g., "2h 14m") is
  always shown as text (RB-30 §6).
- **SLA panel** on work-item detail: full timeline — started, paused events, resumed, projected
  breach — with business-hours context ("clock paused outside business hours").
- **SLA policies view** (admin, Management section): calendar builder, policy list + editor,
  target configuration, bulk-apply flow with preview.
- **SLA reports view**: met/breached bar charts, trend line, top-breaching policies table.
- Design tokens only; a11y-clean.

## 4. Tests

Backend: `SlaClockServiceTest` (business-minute arithmetic, pause/resume, breach detection),
`SlaEscalationServiceTest` (idempotency, multi-step), `SlaPolicyServiceTest` (bulk-apply preview
+ cross-tenant — RB-40), `SlaCalendarServiceTest`. Frontend: `SlaBadge.test.jsx`,
`SlaPanel.test.jsx`. Coverage gate met.

## 5. Key decisions

- **"One engine, two contexts" (Architectural Commitment 2).** The `customer_tier` column on
  `sla_policies` makes iteration-8's engine directly reusable for iteration-9's external customer
  SLAs — no second implementation. The spec commitment is structural, not just aspirational.
- **Business-minute arithmetic at the server, not the client.** The client receives `remaining_minutes`
  and `due_at` — never a raw start timestamp to compute locally with timezone logic.
- **Pause statuses in `sla_targets.pause_statuses` JSONB.** Different policies need different
  pause triggers (e.g., "Waiting on Customer" for service requests vs. "Blocked" for engineering
  items). Per-target pause lists make this flexible without schema changes.
- **`escalated_steps` JSONB for idempotency.** Escalation steps fire exactly once per instance;
  the JSONB list of already-fired step IDs prevents re-notification without a separate audit table.
