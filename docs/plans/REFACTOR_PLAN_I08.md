# Refactor Plan — Iteration 8 · Cap M · SLA Engine (I08-S01 … I08-S09)

**Iteration:** 8 (SLA Engine — Internal & Generalized) · **Release 8.0**
**Spec source:** `docs/bsmart-works-iteration-guide.md` Part 7, Iteration 8.
**Branch:** `claude/iteration-8-bFw95`
**Classification:** **Missing** — no SLA tables, entities, services or UI existed; built to spec.
**Migration:** `V36__sla_engine.sql` (next after V35; high-water bumped to V36 in orchestrator §6).

> Batched the full 9-spec iteration in one run: the specs share the same tables/services and
> splitting would leave the build in a non-shippable in-between state (master-prompt batching
> exception). All five architectural commitments and the seven unification layers are honoured —
> **one** SLA engine in two contexts (internal now, customer in iteration 9), event-sourced audit,
> config-without-code policies, BQL as the one query language for scope.

---

## 1. Architecture

One engine, attached to the existing work-item lifecycle by two hooks in `WorkItemController`
(create + status-change). Layering follows RB-10 §2 strictly:

- **Pure (unit-tested, no I/O):** `BusinessHoursCalculator` (DST-safe business-hours arithmetic —
  `dueAt`, `elapsedBusinessSeconds`), `SlaPolicyService` (id/defaults/normalization + consumed/%
  maths).
- **Orchestration (RBAC + workspace scoping + events):** `SlaConfigService` (admin CRUD,
  templates, bulk apply — gated on the new `manage_sla` permission, tier ADMIN), `SlaEngineService`
  (runtime: start/pause/resume/met/breach, countdown read-model, audit, reporting).
- **Schedule:** `SlaEvaluationScheduler` (every minute → breach detection + escalation firing).
- **HTTP (parse + delegate only):** `SlaController` at `/api/v1/sla/**`.

### Data model (`V36`)
`business_calendars`, `sla_policies`, `sla_targets`, `sla_escalations`, `sla_instances` — all
plural, workspace-scoped, indexed on FKs + hot columns. `manage_sla` permission seeded; a default
IST calendar seeded per workspace; 2 global starter templates with targets.

### Tenant isolation (RB-40 §1)
Every read asserts workspace membership (404 for non-members — never reveals a foreign row);
every mutation goes through `RbacService.require(…, "manage_sla")`. Instances carry `workspace_id`.
Scope BQL is compiled to **parameterised** SQL (`BqlCompiler`) and tested with an `id = ?` predicate
— a policy can never escape its tenant.

---

## 2. Spec → implementation map

| Spec | Where |
|------|-------|
| S01 Policy definition | `sla_policies`, `SlaConfigService.createPolicy/updatePolicy/cloneTemplate` |
| S02 Business-hours calendars | `business_calendars`, `BusinessHoursCalculator` (14 unit tests) |
| S03 Multiple targets | `sla_targets`, `SlaConfigService.addTarget` |
| S04 Pause/resume | `pause_statuses` + `SlaEngineService.onStatusChange` (pause/resume, frozen consumed) |
| S05 Countdown timers | `sla_instances.due_at` + `GET /sla/work-items/{id}` + `SlaBadge` |
| S06 Escalation | `sla_escalations` + `SlaEvaluationScheduler` → `runEscalations` (NOTIFY/REASSIGN) |
| S07 Reporting | `GET /sla/report` (met/breached/in-flight + compliance %) |
| S08 Audit log | `SLA_*` events in the append-only event store; `GET /sla/work-items/{id}/audit` |
| S09 Bulk application | `GET /sla/policies/{id}/preview` → `POST …/apply` |

---

## 3. Verification

- **Backend:** `./mvnw -B -Dgroups=unit verify` → 160 tests green, JaCoCo coverage gate met, JAR
  builds. 25 new SLA unit tests (`BusinessHoursCalculatorTest`, `SlaPolicyServiceTest`) cover the
  business-hours edge cases: same-day, day rollover, weekend skip, holiday skip, out-of-hours start,
  pause maths, and the always-on fallback.
- **Frontend:** `npm run lint` (clean on new files), `npm test` (77 tests), `npm run build` all green.
- **Guardrails:** all blocking rules pass (plural tables, Flyway naming, RBAC-in-service, tokens,
  one apiClient). AI-rules regenerated + in sync; DoD version in sync.
- **Integration tests** (Testcontainers, real Postgres) were **not** run here — no Docker in this
  environment. They run in CI (`backend-unit-test` runs unit only; the DB-backed suite needs a
  runner with Docker). The runtime engine paths are covered by unit tests on the pure core; the
  DB-bound services rely on CI / a Docker-enabled run for end-to-end coverage.

## 4. Notes / follow-ups (logged, not smuggled in)
- AI SLA-breach prediction is explicitly **iteration 11**, not built here (per the guide).
- Customer-facing SLA (same engine, customer context) is **iteration 9**.
- Surfacing `SlaBadge` directly on the board card / item header is a small frontend follow-up; the
  component, read-model and audit endpoint are in place.
