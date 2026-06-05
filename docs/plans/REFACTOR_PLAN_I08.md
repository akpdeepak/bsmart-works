# Refactor Plan — Iteration 8 · Cap M · SLA Engine (Internal & Generalized)

> Iteration 8 (Release 8.0) — *"Unified SLA engine for internal delivery commitments, ready for
> external customer SLAs in iteration 9."*
> Branch: `claude/iteration-10-complete-y6ls0` · Pipeline: `docs/REFACTOR_MASTER_PROMPT.md`
> Status: **implemented + green** (backend + frontend), pending PR review.

> **Scope note (batching).** This run delivers all nine iteration-8 specs (I08-S01…S09) on one
> branch. They share the same data model and engine and splitting would leave the build in a
> half-built state between runs (master prompt §2 rule 4). This was an explicit owner directive to
> complete the iteration in one pass. Iteration 8 is the genuine next iteration in sequence
> (iteration 7 is `Done` in the tracker); nothing was built ahead of it.

---

## Classification: **Missing** (built to spec)

No SLA code, schema, or UI existed. The engine was built fresh, deliberately on the proven shape of
the iteration-7 Compliance engine (BQL scope → workspace-scoped parameterized query → scheduled
sweep → event-sourced audit), so the two cross-cutting engines stay structurally consistent (one
mental model, RB-10 §2 / §6).

### Phase-1 findings by lens
- **Architect:** SLA is a unification concern, not a per-feature add-on ("one SLA engine, two
  contexts" — architectural commitment 2). Built as one engine the iteration-9 customer portal will
  reuse (the policy carries a nullable `customer_tier` for the multi-tier customer SLAs). No second
  parallel implementation. The pure business-time math is isolated from I/O so it is fully testable.
- **System designer:** event-sourced — every clock transition (start/pause/resume/breach/met/
  escalated) is appended to the `events` table; the audit log and reports are projections, never a
  second write path. Idempotent escalation firing (`escalated_steps`). Graceful degradation: a
  malformed policy or calendar is skipped, never aborting a sweep.
- **Product manager:** delivers the chapter's use cases — P0 resolution windows, code-review SLAs,
  incident acknowledge/resolve, business-hours fairness, visible countdown, escalate-before-breach.
- **UI/UX lead:** the countdown is the signature surface — a coloured badge ("Resolve in 2h 14m",
  green→amber→red-pulsing) that never relies on colour alone. Management UI is a four-tab side
  surface with explicit loading/empty/error states and keyboard-operable controls.
- **Developer:** new migration `V44` (forward-only); RBAC via `manage_sla` (LEAD tier) in the
  service boundary; every query workspace-scoped. New entities added to the JaCoCo exclude list per
  the established convention.

---

## In-scope changes (numbered)

1. **I08-S01 SLA policy definition** — `sla_policies` (scope BQL, calendar, active) + `SlaPolicyController`
   CRUD; scope BQL validated before save; test-before-activate (`/preview`); activation requires ≥1 target.
2. **I08-S02 Business-hours calendars** — `sla_calendars` (per-weekday windows + holidays + tz) +
   `SlaCalendarController`; `SlaCalculationService.businessMinutesBetween` / `addBusinessMinutes`.
3. **I08-S03 Multiple targets per policy** — `sla_targets` (metric, budget, triggers); replace-all
   targets endpoint; independent clock per target.
4. **I08-S04 Pause / resume triggers** — pause-statuses freeze accrual; auto-resume recomputes the
   deadline; transitions recorded as events.
5. **I08-S05 Visible countdown timers** — `SlaInstanceController` live view (remaining/percent/band) +
   `SlaCountdownBadge` molecule.
6. **I08-S06 SLA escalation** — `sla_escalations` (threshold-percent / on-breach, NOTIFY / REASSIGN);
   `SlaNotificationService`; idempotent firing.
7. **I08-S07 SLA reporting** — `SlaReportController#report`: met/breached/at-risk overall + per policy.
8. **I08-S08 SLA audit log** — append-only SLA events view + CSV export (workspace-scoped).
9. **I08-S09 Bulk SLA application** — `/policies/{id}/apply` starts clocks across the current scope,
   with `/preview` as the pre-commit count.

Driver: `SlaEvaluationService` (find in-scope items, start/advance clocks, fire escalations) on a
1-minute `SlaClockScheduler` sweep.

## Out of scope (parked)
- AI SLA-breach prediction → iteration 11 (per guide).
- Customer-facing SLA surface + multi-tier-by-customer → iteration 9 (the engine is ready; the
  `customer_tier` column and tier-aware policy selection are wired but the portal is iteration 9).
- Real Slack/broker delivery for notifications → on service extraction (ADR-0001); routed in-app/email now.

## Test plan & results
- **Unit (pure):** `SlaCalculationServiceTest` (business-time math incl. weekend/holiday roll-over,
  consumption/band, full clock state-machine) + `SlaPolicyServiceTest` (defaults/normalization). 
- **Access (mandatory RB-40 categories):** `SlaPolicyControllerAccessTest` — unauthorized + cross-tenant
  on every write, plus not-found and bad-request.
- **Frontend:** `SlaCountdownBadge` (all bands + a11y) and `SlaView` (tabs, role-gated controls, error state).
- **Result:** backend 224 unit tests green + JaCoCo gate met + guardrails clean; frontend 115 tests
  green + eslint clean + production build OK.
- **Not run here (honest gap):** Testcontainers row-level isolation tests and live browser/perf
  validation — no Docker daemon or browser in this environment; tracked as the project's standing
  integration-test follow-up.

## Risk & rollback
- `V44` is forward-only and additive (new tables only); rollback is a new forward migration.
- The scheduler is defensive (per-rule try/catch); a bad policy cannot stall the sweep.
- Reversible: the feature is isolated behind its own tables, endpoints, and nav entry.
