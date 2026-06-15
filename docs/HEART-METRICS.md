# bSmart Works — HEART Metrics & Activation Funnel Spec

> **What this is:** the binding specification for the HEART measurement framework and activation
> funnel. Produced by WI-08 (UIUX Program Milestone 1). Every subsequent instrumentation PR
> (WI-09), dashboard (WI-10), and feature-flag rollout (WI-11) references this document as its
> source of truth for what to measure and why.
>
> Version 1.0 · created 2026-06-15 · owner: Deepak Pandey
> Governed by: RB-40 §3 (no raw PII in events; DPDP-safe, server-side only); RB-10 §3 (events
> table, append-only); RB-20 §5 (audit as first-class data). Do not instrument without consulting
> RB-40 §1 (workspace scoping) and §3 (data boundary).

---

## 1. Why measure first

bSmart Works has mastered the interface layer but has never built the behavioral or measurement
layer (benchmark audit, `UX-CODEBASE-ANALYSIS.md`). Every engagement-improvement hypothesis —
onboarding, HEART, A/B variants — is blind without a baseline. This spec defines the metrics
before any instrumentation is built, so there is no ambiguity about what WI-09 must emit or what
WI-10 must display.

---

## 2. HEART framework — Goals → Signals → Metrics

The five dimensions of Google's HEART model, translated to bSmart Works. Each row is a binding
spec: the **Goal** is the outcome we care about, the **Signal** is the observable behaviour that
indicates progress toward the goal, and the **Metric** is the quantification we will compute from
the events store.

| Dimension | Goal | Signal | Metric | Priority |
|-----------|------|--------|--------|----------|
| **Happiness** | Users trust and feel satisfied with the tool | In-app sentiment at meaningful moments (post-sprint-complete, post-first-item) | Micro-survey CSAT score (1–5); % positive responses (≥ 4) per workspace per week | P2 |
| **Engagement** | Teams return daily and perform meaningful work | Users returning on consecutive days; action depth per session | DAU / WAU ratio; meaningful actions per active day (create / update / comment / plan); session depth (actions per visit) | P1 |
| **Adoption** | New workspaces reach their first value moment | Setup completion steps performed; "first value" event fired | % workspaces reaching the **first-value event** within 7 days of creation; setup-completeness score (0–100) at day 1, 3, 7 | P1 |
| **Retention** | Teams continue using the product week-over-week | Workspace returning at W1, W4 | W1 workspace retention rate; W4 workspace retention rate; per-cohort (workspace created in week N) tracking | P1 |
| **Task success** | Core jobs complete quickly and reliably | Funnel completion rate; time-on-task for the two highest-frequency jobs | Create-work-item success rate + median time; Plan-sprint success rate + median time; funnel drop-off rate at each step | P1 |

> **Instrumentation contract (for WI-09):** all signals are derived from events in the `events`
> table (RB-10 §3). No raw PII leaves the server. Each event carries `workspace_id` for tenant
> isolation (RB-40 §1). Metrics are aggregated server-side and exposed via BQL / the Dashboard
> stack (WI-10). Zero third-party analytics SDKs.

---

## 3. The "first value" event — canonical definition

**Name:** `WORKSPACE_FIRST_VALUE`

**Definition:** fires once per workspace, the moment a real work item is created inside a
real (non-template, non-seed) project by any workspace member.

**Criteria for "real":**
- The project was created by a workspace member (not seeded by system migration).
- The work item has a non-empty `title`.
- The work item type is any type in the 17-type taxonomy (not a system/internal type).

**Why this event:** it is the earliest moment the workspace has transitioned from "set up" to
"doing real work." It is measurable, unambiguous, and directly correlated with retention
(a workspace that creates its first real item within 7 days is significantly more likely to be
active at W4 — standard SaaS activation-funnel research).

**Idempotency:** the event fires exactly once per workspace (guarded by a `workspace_id` check
before emission). A second item creation in the same workspace does not re-fire it.

**Event schema (extends the standard `AppEvent` shape):**
```
type:         WORKSPACE_FIRST_VALUE
workspace_id: <workspace UUID>
actor_id:     <user UUID>        -- tokenized; no raw PII
payload: {
  project_id:    <project UUID>,
  work_item_id:  <item UUID>,
  work_item_type: <type string>,
}
```

---

## 4. Activation funnel — steps to instrument

The funnel maps the journey from account creation to a retained team. Each step is an event
that WI-09 will emit. Steps are ordered; a workspace's progress through the funnel is computed
server-side by joining events.

```
[Step 1] WORKSPACE_CREATED              ← deferred to WI-12 (onboarding wizard)
         → A new workspace is created (or accepted via invite).

[Step 2] WORKSPACE_TEMPLATE_APPLIED  (or WORKSPACE_SETUP_SKIPPED)
         → A config template is applied via ConfigTemplateService.apply().

[Step 3] WORKSPACE_FIRST_VALUE       ← canonical "first value" event (§3)
         → First real work item created in a real project (idempotent per workspace).

[Step 4] WORKSPACE_TEAMMATE_INVITED
         → A workspace invitation is sent via WorkspaceService.addMember().

[Step 5] WORKSPACE_DAY_2_RETURN
         → Any workspace member performs a meaningful action on day 1–30 after
           workspace creation (idempotent per workspace; uses workspaces.created_at / V91).
```

**Funnel completion** is defined as reaching Step 3 (`WORKSPACE_FIRST_VALUE`). Steps 4 and 5
are depth indicators — they predict long-term retention but are not required for the "activated"
label.

**Drop-off metric:** for each consecutive step pair, `(workspaces reaching step N+1) /
(workspaces reaching step N)` gives the conversion rate. The WI-10 dashboard will surface
this as a funnel chart.

---

## 5. Micro-survey — Happiness signal

A lightweight in-app survey (1 question, 5-star scale) surfaced at two moments:

| Trigger | Question | Timing |
|---------|----------|--------|
| Sprint completed | "How satisfied are you with this sprint's tools?" | Immediately on sprint-complete confirmation |
| First value event | "How easy was it to get started?" | 30 seconds after `WORKSPACE_FIRST_VALUE` fires |

**Rules:**
- One survey per user per 30 days maximum (never spam).
- Dismissed surveys record a `SURVEY_DISMISSED` event (not a negative score).
- Responses stored as an event `SURVEY_RESPONSE` with the score and trigger context.
- No open-text in V1 — score only. Free-text is a later addition (separate data-governance review).

---

## 6. Engagement metric — meaningful actions

Not all actions are equal. The following action types count as "meaningful" for the
Engagement DAU/WAU and session-depth metrics:

| Action | Event type |
|--------|-----------|
| Create work item | `WORK_ITEM_CREATED` |
| Update work item status | `STATUS_CHANGED` |
| Add a comment | `COMMENT_ADDED` |
| Plan sprint (add/remove item) | `SPRINT_ITEM_ADDED` / `SPRINT_ITEM_REMOVED` |
| Create a report | `REPORT_CREATED` |
| Execute a BQL saved view | `BQL_RUN` (audited runs only, `bql_run_audit`) |
| Invite a teammate | `WORKSPACE_TEAMMATE_INVITED` |

Page views and navigation events are **not** counted as meaningful actions (they are low-signal
noise for an engagement metric).

---

## 7. Metrics delivery — how WI-10 will surface these

The WI-10 HEART/funnel dashboard is an **internal dogfood dashboard** (role: ADMIN within the
bSmart Works workspace used internally). It is built on the existing `Dashboard` + BQL stack —
no new infrastructure.

**Planned widgets:**

| Widget | Type | Metric sourced |
|--------|------|---------------|
| Activation funnel | Funnel / step-bar chart | Steps 1–5 conversion rates |
| DAU / WAU trend | Line chart | Engagement meaningful-action count per day |
| First-value rate (7-day) | KPI ring | Adoption — % workspaces reaching FV in 7d |
| W1 / W4 retention | Cohort table | Retention — per-creation-week cohort |
| CSAT score | KPI + sparkline | Happiness — rolling 30-day micro-survey score |
| Task-success funnel: create item | Step-bar | Task success — time + completion |

---

## 8. DPDP / data-governance constraints (binding for WI-09)

These are non-negotiable (RB-40 §2–3):

1. **No raw PII in events.** User identity in events is the opaque `actor_id` (UUID); display
   names, emails, and phone numbers are never in the event payload. They resolve via the PII
   vault at query time.
2. **No third-party analytics SDKs.** All telemetry is server-side, in the `events` table,
   workspace-scoped. No client-side tracking pixels, no Segment, no Mixpanel.
3. **Workspace-scoped at write time.** Every event carries `workspace_id`; the Hibernate
   workspace filter applies at read time (RB-40 §1).
4. **Survey responses are not PII.** A 1–5 score with a trigger context is not personal data
   under DPDP. If free-text is added later, it requires a separate PII review.
5. **Data retention.** Funnel and HEART events follow the same retention policy as all `events`
   rows. Right-to-be-forgotten (crypto-shredding) applies if the `actor_id` resolves to a
   subject exercising erasure — the event structure supports this (no raw PII embedded).

---

## 9. Implementation readiness checklist (for WI-09)

WI-09 is complete. The following were confirmed and implemented:

- [x] `EventService.recordInWorkspace()` used for all funnel events — workspace_id stamped.
- [x] `EventRepository.existsByWorkspaceIdAndEventType()` added for idempotency.
- [x] `workspaces.created_at` added via V91 migration; backfilled from earliest workspace event.
- [x] `FunnelService` — 4 methods (Steps 2–5); non-fatal; guard-null; idempotent where required.
- [x] Step 1 (`WORKSPACE_CREATED`) deferred to WI-12 (no workspace-creation API yet).

---

*This document is the spec. The ledger (UIUX-EXECUTION-PLAN.md §5) tracks execution status.
Update this file if goals, signals, or metrics change — never the other way around.*
