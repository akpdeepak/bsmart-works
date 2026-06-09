# Iteration 7 — Compliance Rules Engine (completion)

Iteration 7 activates bSmart Works's strategic differentiator. After this iteration, BCITS has
native compliance posture visible at a glance — Works becomes meaningfully different from Jira /
Azure DevOps / OpenProject for regulated utility customers (spec `06`, Part 7, ITER 7, Cap K).

## 1. Data model

| Migration | What it adds |
|---|---|
| `V34__compliance_rules.sql` | `compliance_rules` (BQL scope + assertion, severity, notify_to JSONB, active/template flags, workspace-scoped) |
| `V36__compliance_engine.sql` | `compliance_violations` (rule_id → work_item_id, status OPEN/ACKNOWLEDGED/RESOLVED/WONT_FIX, owner, audit trail JSONB) |
| `V37__seed_compliance_rule_templates.sql` | 20+ seeded rule templates: Orphan Story, Stale Item, Missing Estimate, Scope Creep, Sprint Without Goal, Unassigned In-Progress, P0 Bug Without Owner, Missing AC Before In-Progress, … |

### Rule model
A compliance rule is: **scope BQL** (which items it watches) + **assertion BQL** (the condition
items must satisfy) + **severity** + **notify_to** routing targets. Items in scope that fail the
assertion generate violations. Rules start `active = FALSE` (test-before-activate pattern, mirroring
the SLA engine). Templates (`is_template = TRUE`, no owner) are cloned into workspace-owned rules.

## 2. Backend (workspace-scoped, RBAC at service boundary, events on every mutation)

### Rule definition and management (Cap K)
- **ComplianceRuleController / ComplianceRuleService**: full CRUD for rule definitions; clone-from-
  template action; test-mode dry-run (evaluate the rule without persisting violations); activate /
  deactivate toggle. New permission `manage_compliance` (ADMIN tier). All workspace-scoped
  (`/api/v1/compliance/rules`).

### Rule evaluation engine (Cap K)
- **ComplianceEngine**: evaluates active rules on-demand and on a scheduled sweep. For each active
  rule: executes `scope_bql` → items; for each item, evaluates `assertion_bql` → pass/fail.
  Items failing the assertion: existing open violation refreshed; items now passing: violation
  auto-resolved. The BQL compiler (`BqlCompiler`) is the single parse-and-execute path — no raw
  SQL string concatenation, no injection risk (RB-10 §6).
- **Violation lifecycle** (`ComplianceViolationController`): OPEN → ACKNOWLEDGED → RESOLVED or
  WON'T-FIX; bulk-acknowledge; every state change writes to `events` (append-only audit trail,
  RB-10 §3). Endpoints at `/api/v1/compliance/violations`.

### Severity routing (Cap K)
- `notify_to` JSONB on each rule carries routing targets: item owner, project admin, specific user,
  email list. Notification dispatch on first violation creation (or re-open after resolution).
  Escalation policies: if not acknowledged within `escalation_hours`, escalate to `escalation_target`
  (stored in `notify_to` escalation slot).

### Compliance dashboard (Cap K)
- **ComplianceDashboardController**: severity breakdown (CRITICAL / HIGH / MEDIUM / LOW / INFO
  counts), 30-day violation trend (daily snapshots from `events`), rules × projects heatmap (rule_id
  × project_id violation count matrix), drill-down to violation list (`/api/v1/compliance/dashboard`).

### Compliance audit log (Cap K)
- Append-only projection over the `events` table filtered to compliance event types (RULE_CREATED,
  RULE_ACTIVATED, VIOLATION_OPENED, VIOLATION_ACKNOWLEDGED, VIOLATION_RESOLVED, …).
  Export to CSV for regulator review (`/api/v1/compliance/audit-log`).

### Auto status-duration tracking (Cap B)
- Every work-item status transition emits a `WORK_ITEM_STATUS_CHANGED` event with the from-status.
  A projection computes time-in-status per item — no manual logging required. Exposed at
  `/api/v1/work-items/{id}/status-duration` and aggregated in compliance dashboard widgets.

## 3. Frontend

- **Compliance section** (Management sidebar group): Rules list + detail editor; Violations list +
  detail with acknowledge / resolve / won't-fix actions; Compliance Dashboard view.
- **Dashboard**: severity cards (top), 30-day trend line chart, top-rules table, rules × projects
  heatmap, recent violations table with inline Ack/Resolve buttons. Color usage restrained: red
  critical, amber warning, blue info — never orange (which is reserved for primary CTAs per RB-30).
- **Rule editor**: BQL `scope_bql` and `assertion_bql` text areas with syntax reference; severity
  and notify_to fields; test-mode "Dry Run" button that shows affected items without activating.
- Design tokens only; a11y-clean.

## 4. Tests

Backend: `ComplianceRuleServiceTest` (CRUD + activate/deactivate + test mode),
`ComplianceEngineTest` (evaluation logic — pass/fail/re-open/auto-resolve),
`ComplianceViolationServiceTest` (lifecycle + bulk-ack + cross-tenant — RB-40),
`ComplianceDashboardServiceTest` (severity breakdown math). Frontend:
`ComplianceDashboard.test.jsx`, `ComplianceRuleEditor.test.jsx`. Coverage gate met.

## 5. Key decisions

- **BQL as the rule language.** Both `scope_bql` and `assertion_bql` compile through `BqlCompiler`
  — one language across filters, automations, compliance, KPIs, dashboards (RB-10 §6 / Unification
  Layer 3). Custom syntax or a DSL would break this unification.
- **Rules start inactive.** "Test-before-activate" was learned from SLA policies — activating a
  broad rule without a dry-run can flood the violation log. Dry-run is a first-class API action.
- **20+ seeded templates (V37).** New workspaces get immediate compliance value. Templates are
  workspace-cloned before edit — the canonical templates never become drift-prone per-workspace forks.
- **Auto status-duration from events.** The architecture decision (event-sourced from day one, iter 1)
  pays dividends here: time-in-status required zero additional instrumentation — it falls directly
  out of `WORK_ITEM_STATUS_CHANGED` events that were already being written.
