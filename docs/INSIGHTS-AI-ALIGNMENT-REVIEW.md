# Insights — AI-Alignment & Improvement-Opportunities Review

> End-to-end review of the **Insights** section: every surface, page, sub-section, control,
> spec, and layer (controller → service → repository → migration → frontend view → client).
> Produced as an analysis artifact (RB-05 Stage 0–3); each item routes to its rule book so it can
> be lifted into issues. **No production code is changed by this document.**
>
> Date: 2026-06-13 · Branch: `claude/insights-ai-alignment-review-59gyu7` · Reviewer: Claude Code

---

## 0. Scope reviewed

Insights spans **Capability J** (Reports, Dashboards & Insights, iter 6), **Capability L** (KPI
Framework with Privacy Guardrails, iter 12), the **Cap O** conversational-dashboard surface
(iter 20), and the **Leadership Console (Cap X)** + **BQL** satellites that hang off the `insight`
nav mode.

**Pinned surfaces** (`nav-model.js` → mode `insight`): Reports · Dashboards · Report Builder ·
Performance. **Satellites mapped to `insight`:** Leadership · BQL.

**Layers inventoried:**
- Backend controllers: `AggregationController`, `CustomDashboardController`, `DashboardController`,
  `PublicDashboardController`, `TodayLayoutController`, `KpiController`, `WidgetDataController`,
  `BqlController`, `ReportController`, `ReportScheduleController`, `ComplianceDashboardController`,
  `SlaReportController`, `RaidDashboardController`, `AdvancedAiController` (conversational dashboards).
- Backend services: `AggregationService`, `DashboardService`, `KpiService`, `WidgetDataService`,
  `DashboardLayoutService`, `ConversationalDashboardService`, `ReportService`, `BqlCompiler`,
  `AiControlPlaneService`, `AiCapabilities`, `CockpitCoachService`.
- Frontend: `reports-view`, `dashboards-view`, `reportbuilder-view`, `leadership-console-view`,
  `bql-view`, `performance-panel`, `dashboard-widget-card`, `dashboard-drill-modal`, chart molecules
  (`bar-chart`, `donut-chart`, `segment-bar`, `day-bars`, `paired-bars`), `ai-meta-badge`, and the
  `kpi`/`leadership`/`dashboard-metrics` clients.

Findings are graded **P0 (blocker / governance)**, **P1**, **P2**, **P3**.

---

## 1. P0 — Tenant isolation & RBAC (RB-40 §1; Orchestrator §5 "stop and ask")

> Cross-tenant leakage is the single catastrophic risk for a product sold to multiple DISCOMs.
> These items touch tenant isolation / RBAC, so per Orchestrator §5 and RB-05 Stage 0 they require
> **Deepak's explicit sign-off before code** — captured here, not silently changed.

### 1.1 `AggregationController` (`GET /api/v1/insights/work-items`) is cross-tenant readable
Still powers the **Dashboards scope selector** (`App.jsx` → `api.raw('/insights/work-items?...')`).
Three compounding defects:

- **No RBAC.** No `rbac.require(...)` in the controller or `AggregationService`; it only reads
  `authenticatedUser.id()`. Violates RB-10 §2 (RBAC in the service layer).
- **IDOR via request params.** `workspaceId`, `projectId`, `teamId` are taken from the query string
  and trusted with no membership verification. A user in tenant A can pass tenant B's `workspaceId`
  (or any `projectId`) and read B's aggregates.
- **`ORG` scope with no `workspaceId` → `WHERE 1 = 1`** (`AggregationService.resolve`, case `ORG`):
  returns counts and the 10 most-recent items **across every workspace in the database**.
  `PERSONAL` scopes only by `assignee_id` (no `workspace_id`); `PROJECT`/`TEAM` never validate the
  project/team belongs to the caller's tenant.

**Recommended fix (needs sign-off):** derive `workspaceId` from the authenticated context (never
trust the param); add `rbac.require(userId, workspaceId, "view_items")`; validate
project/team ⊂ workspace; make the workspace predicate mandatory for **all** scopes (incl. PERSONAL)
at the table level. Best option: retire this endpoint and route the scope selector through the
already-scoped `WidgetDataService`.

### 1.2 The central tenant-scope guardrail still doesn't exist
CLAUDE.md §4 and RB-40 §1 both list **"`guardrails.sh` tenant-scope check — TO BE ADDED."** Scoping
is re-typed per query (`WORKSPACE_SCOPE` in `WidgetDataService`, joins in `DashboardService`), so a
forgotten predicate — exactly like §1.1 — passes CI. Add the guardrail (fail any query over a
tenant table lacking a workspace predicate) and/or a central Hibernate tenant filter, so isolation
"cannot be forgotten" as the spec requires.

### 1.3 `RaidDashboardController` and `BqlController` scope by the wrong key (or not at all)
- `GET /api/v1/raid-dashboard?projectId=` — no visible RBAC; scopes only by `projectId` (same IDOR
  shape as §1.1).
- `POST /api/v1/bql/execute` — runs a user-authored query that is **not workspace-scoped at
  compilation**. RB-10 §6 / RB-40 §1 require BQL to be scoped at compile time so "a query cannot
  escape its tenant regardless of what the user types." Verify `BqlCompiler` injects a mandatory
  `workspace_id` predicate; if not, this is a second cross-tenant path into the Insights/BQL surface.

### 1.4 Field-level security absent on metrics (RB-40 §1, spec `06 §5.5`)
KPI privacy is enforced at the **layer/endpoint** level (no manager→individual endpoint) — good — but
there is no **per-field, per-role** server-side redaction for fields surfaced via custom metric
definitions or BQL columns. Flagged "Absent (RBAC ≠ field-level)" in SOURCE-OF-TRUTH §5; it is a spec
commitment.

---

## 2. AI-rules alignment — making Insights smart (RB-40 §2, AI Control Plane)

Plumbing is strong: `AiControlPlaneService` enforces scope hierarchy (most-restrictive-wins), budget
(80%→Haiku, 100%→disable), 24h cache, rate limits, PII redaction, and per-call audit; existing
Insights capabilities (`KPI_NARRATIVE`, `CONVERSATIONAL_DASHBOARD`, `COCKPIT_PROTIPS`,
`RETRO_CLUSTER`, `EXEC_BRIEFING`, `BOARD_DECK`) each declare a deterministic fallback. Gaps are about
**coverage and surfacing**:

| # | Pri | Opportunity | Rule / spec |
|---|-----|-------------|-------------|
| 2.1 | **P1** | **Anomaly detection + AI summary on charts/dashboards.** Today only the Performance panel has "Explain". Dashboards/Reports/widgets have no AI narrative layer. Add `DASHBOARD_SUMMARY` / `CHART_ANOMALY` capabilities rendered as an opt-in narrative band, **hidden** (not dimmed) when AI off; fallback = charts standalone. | spec `05 §J`, `06 §1155`, `8.2` |
| 2.2 | P2 | **AI-suggested dashboards** from captured usage data (spec iter-6 note). `DASHBOARD_SUGGESTION` capability; fallback = template gallery. | spec `06 §823` |
| 2.3 | P2 | **Surface the conversational dashboard.** Backend `ConversationalDashboardService` / `compile` exists but there is **no frontend surface** wiring NL→widget into Dashboards — the marquee iter-20 feature is invisible. Also: the BQL NL panel gate uses `anyCapabilityEnabled` instead of the specific capability's effective policy (wrong scope vs RB-40 §2). | RB-40 §2, spec `06 §1915` |
| 2.4 | P2 | **Consistent AI provenance.** `AiMetaBadge` shows on briefings/board-decks but not on Performance "Explain" or KPI narratives. Render it on every AI output; show an explicit "AI off — structured digest" state instead of silently dropping to fallback text. | RB-40 §2 |
| 2.5 | P2 | **Budget/degradation signal in UI.** Surface `BudgetStatus` (`degraded`/`disabled`) as a non-blocking notice on AI-bearing Insights panels (spec 8.4). | RB-40 §2, spec `8.4` |
| 2.6 | P3 | **Model tiering.** Confirm the classification half (is-this-anomalous? / intent) routes to Haiku and only generation uses Sonnet — `KPI_NARRATIVE` and `CONVERSATIONAL_DASHBOARD` default to Sonnet. | RB-40 §2 |

---

## 3. Spec-gap features — Cap J/L commitments not yet built

| # | Pri | Spec feature (Cap) | Status today | Opportunity |
|---|-----|--------------------|--------------|-------------|
| 3.1 | P1 | **Export PDF / Excel / PNG** (J) | Frontend `ExportButtons` (CSV/PDF); backend export only for compliance/SLA CSV | Server-side dashboard/report export incl. PNG + Excel (stakeholders without Works access) |
| 3.2 | P2 | **Scheduled delivery + per-recipient personalization** (J) | `ReportScheduleController` + scheduler exist (DAILY/WEEKLY/MONTHLY); no personalization; `report_schedules` not workspace-scoped (FK only) | Add recipients + personalization; scope schedules by workspace |
| 3.3 | P2 | **Embeddable read-only dashboards** (J) | `PublicDashboardController` share token exists | iframe-embed surface + CSP/security headers; customer-facing status page |
| 3.4 | P2 | **Drill-down maintains filters & context** (J) | `DashboardDrillModal` exists; aggregated widgets disable drill | Extend drill to carry the widget filter into a scoped item list for all widgets |
| 3.5 | P2 | **20+ widget library** (J) | ~16 widget types | Audit vs spec named set (cumulative flow, two-dim, filter-result, scorecard…) and close gaps |
| 3.6 | P2 | **Custom calculated metrics via safe formula builder** (L) | `MetricFormula` validation + `bql_formula` (V63) exist | Build the **visual formula-builder UI** (spec: "not raw SQL") — none today |
| 3.7 | P1 | **Cycle-time distribution histogram + P85 + outlier drill** (L) | `KpiService.distribution()` returns median/p85/buckets/outliers | Frontend has metric cards but **no histogram/outlier drill** — data exists, surface doesn't |
| 3.8 | P2 | **Voluntary individual sharing UI** (L) | `metric_shares` + `/kpi/shares` exist | No frontend share surface ("share before a 1:1") — wire into Individual layer |
| 3.9 | P3 | **Report templates** (J) | Sprint / Project / Weekly digest seeded (V38) | Add **monthly executive summary** + **customer status** templates |

---

## 4. Per-surface UX / UI / logic opportunities

### Reports (`reports-view.jsx`) — P2
- Fixed sprint-report, not the "self-service" experience implied; sprint selection is radio buttons,
  no range/compare beyond velocity. Add range/compare controls; make error states local + actionable
  (RB-30 §6) instead of parent-delegated.
- Token check: `bg-neutral-200` chart track (line ~39) is a surface (OK); confirm no `neutral-400`
  used for readable text (RB-30 §2).

### Dashboards (`dashboards-view.jsx`) — P1/P2
- **Two aggregation backends** (`/insights/work-items` legacy vs `/widget-data/batch` scoped) →
  inconsistent scoping + double maintenance. Consolidate onto the scoped path (ties to §1.1).
- Empty state should be the spec's **"Start from template" guided flow**, not blank canvas
  (`06 §819`).
- Confirm 12-column snap-to-grid + fluid resize parity and `prefers-reduced-motion` (RB-30 §5).
- **NFR:** dashboard load (10 widgets) P95 **1500 ms** (`06 §309`). 12-widget batch cap + 5s
  per-query timeout exist; add a P95 budget test (RB-40 §5).

### Report Builder (`reportbuilder-view.jsx`) — P2
- Narrative sections are editable markdown but have **no AI-draft narrative** button — the natural
  Cap J "executive summary" surface. Add `Generate narrative` via the control plane.
- Confirm a **KPI-grid** section type exists (spec builder sections: chart, table, narrative, KPI grid).

### Performance panel (`performance-panel.jsx`) — P1/P2
- Privacy banner: spec wants a **locked-by-design "Individual engineer comparison unavailable"**
  callout framing it as deliberate (`06 §1273`); verify framing + **Aggregated** badge on all
  aggregated layers.
- Missing histogram/outlier drill (§3.7).
- "Explain" output lacks `AiMetaBadge` + clean AI-off state (§2.4).

### Leadership Console (`leadership-console-view.jsx`) — P1/P2
- **Verify `EXEC_BRIEFING` / `BOARD_DECK` endpoints exist.** Frontend already calls
  `generateBriefing` / `boardDeck`, but the backend inventory marked these "assumed future / N/A
  yet" — confirm wiring or these buttons 404 (correctness risk).
- Customer-health / churn tabs surface tenant + potentially personal data — confirm field-level
  security + workspace scoping on all `leadership/*` endpoints.

### BQL (`bql-view.jsx`) — P1/P2
- Workspace scoping of `bql/execute` (§1.3) — highest priority here.
- NL panel gate uses `anyCapabilityEnabled` — wrong scope (§2.3).
- Good: parameterized compilation (TD-004 closed), saved views/filters are workspace-scoped.

### Cross-surface — P2/P3
- **Pagination:** dashboard/report/KPI list endpoints "return all" — RB-10 §4 requires paginating
  list endpoints (`page/size/sort`).
- **Accessibility (RB-30 §6; WCAG 2.1 AA → 2.2 AA in iter 20):** charts must expose text
  alternatives / data tables + keyboard drill; status must not be color-only.
- **i18n (Cap A, 10 languages incl. RTL):** chart labels, metric names, AI narratives through the
  localization layer; RTL-aware grid.
- **Formatting (RB-30 §8):** metrics/dates via the single locale-aware layer, never hand-formatted.
- **States (RB-30 §6):** tighten Reports (parent-delegated errors) and Dashboards widget-level error
  toasts to explain *what to do next*.

---

## 5. Suggested priority order

1. **§1.1–1.4** tenant-isolation & RBAC on the legacy aggregation, RAID, and BQL paths + the missing
   `guardrails.sh` scope check — **blocker; needs Deepak sign-off** (data-model/security/tenant).
2. **§2.1** dashboard/chart anomaly + summary capability and **§2.3** surface the conversational
   dashboard + fix the NL gate — core "smart Insights" deliverables (Cap J/O).
3. **§4 Leadership endpoint verification** (briefing/board-deck 404 risk) and **§3.7/§3.8**
   histogram + voluntary-sharing UI (data exists, surfaces don't).
4. **§3.1–3.3** export / embed / scheduled-personalization and **§2.4–2.6** AI provenance / budget
   surfacing / tiering.
5. **§4** pagination, a11y, i18n, NFR budget tests — cross-cutting hardening.

---

## 6. What's verified vs. what to confirm

**Verified by direct read:** §1.1 (`AggregationController` + `AggregationService` — no RBAC, param
`workspaceId`, `ORG`→`1=1`). **To confirm in implementation:** §1.3 BQL compile-time scoping, §4
Leadership endpoint existence, §3.5 widget count vs spec, §3.6/§3.7 frontend surface gaps.

> Traceability: capability → iteration → this review → (issues) → (PRs). Rule books touched:
> RB-40 §1/§2, RB-10 §2/§4/§6, RB-30 §5/§6/§8, RB-20 §1/§4, spec Cap J/L/O.
