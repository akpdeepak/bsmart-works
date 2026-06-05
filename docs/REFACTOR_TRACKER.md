# bSmart Works — Spec Refactor Tracker

> **Generated on first run of `docs/REFACTOR_MASTER_PROMPT.md`** by parsing Part 7 of
> [`docs/bsmart-works-iteration-guide.md`](bsmart-works-iteration-guide.md) (`GUIDE_PATH`).
> This is the authoritative spec list and progress ledger — **224 specs across 20 iterations**.
> One row per capability-tagged feature block, in document order. Updated every run.
>
> Status values: `Pending` · `In-Progress` · `Done` · `Blocked (reason)`.
> Bootstrapped: 2026-06-04.

## Progress summary

| Iteration | Release | Theme | Specs | Done |
|---|---|---|---:|---:|
| 1 | 1.0 | Foundation — The Works MVP | 12 | 12 |
| 2 | 2.0 | Sprints — Scrum + Reports | 8 | 0 |
| 3 | 3.0 | Workflows, Permissions & Custom Fields | 8 | 0 |
| 4 | 4.0 | PM Artifacts — RAID, Decisions, Meetings | 10 | 0 |
| 5 | 5.0 | Knowledge Repository + Versions | 10 | 0 |
| 6 | 6.0 | Reports, Dashboards & Insights | 8 | 8 |
| 7 | 7.0 | Compliance Rules Engine | 9 | 9 |
| 8 | 8.0 | SLA Engine — Internal & Generalized | 9 | 9 |
| 9 | 9.0 | Service Management — Customer Portal | 10 | 10 |
| 10 | 10.0 | AI Orchestration Foundation + AI Control Plane | 13 | 0 |
| 11 | 11.0 | AI Expansion + Conversational Command Bar | 15 | 0 |
| 12 | 12.0 | KPI Framework with Privacy Guardrails | 12 | 0 |
| 13 | 13.0 | Automation Engine + Integrations | 12 | 0 |
| 14 | 14.0 | Developer Workspace + IDE Extension | 11 | 0 |
| 15 | 15.0 | Scrum Master Cockpit + Product Owner Workspace | 14 | 0 |
| 16 | 16.0 | Leadership Console + Admin Operations Center | 16 | 0 |
| 17 | 17.0 | Universal Customization Engine | 11 | 0 |
| 18 | 18.0 | Mobile + Real-time + Performance | 12 | 0 |
| 19 | 19.0 | Enterprise Security + Compliance Certifications | 12 | 0 |
| 20 | 20.0 | Polish, Advanced AI, Marketplace Foundation | 12 | 0 |
| **Total** | | | **224** | **48** |

## Specs


### Iteration 1 — Release 1.0 · Foundation — The Works MVP

| ID | Cap | Spec | Status | Branch | PR | Date | Notes |
|---|---|---|---|---|---|---|---|
| I01-S01 | A | Authentication & identity | Done | refactor/iter-01/s01-authentication-identity | [#73](https://github.com/akpdeepak/bsmart-works/pull/73) | 2026-06-04 | Partial→completed: token-based password reset, real email, MFA JWT-principal fix, rate limiting, tests. No schema change. |
| I01-S02 | A | Workspaces | Done | claude/spec-refactor-i01-s02-pdVrC | [#77](https://github.com/akpdeepak/bsmart-works/pull/77) | 2026-06-04 | Partial→refactored: WorkspaceService (RBAC + data access out of controller), membership-enforced reads (404 cross-tenant, RB-40 §1), branding on entity, workspace events, /workspaces/mine, real multi-workspace switcher, V35 seed. No schema change beyond seed. |
| I01-S03 | A | App shell — topbar, sidenav, workspace switcher | Done | claude/spec-refactor-i01-s03-app-shell | [#80](https://github.com/akpdeepak/bsmart-works/pull/80) | 2026-06-04 | Topbar notifications bell + tested UserMenu organism; a11y polish. Also repaired main (concurrent #75/#78 skew). |
| I01-S04 | A | Event store foundation | Done | claude/spec-refactor-i01-s04-event-store | [#85](https://github.com/akpdeepak/bsmart-works/pull/85) | 2026-06-04 | workspace_id on events (RB-40 §1) + append-only immutability trigger (V40); recordInWorkspace. |
| I01-S05 | B | Projects | Done | claude/spec-refactor-i01-s05-projects | [#86](https://github.com/akpdeepak/bsmart-works/pull/86) | 2026-06-04 | ProjectService (RBAC→service), tenant-isolated reads (no findAll leak), workspace-scoped events. |
| I01-S06 | B | Default WorkItem types | Done | claude/spec-refactor-i01-s06-workitem-types | [#87](https://github.com/akpdeepak/bsmart-works/pull/87) | 2026-06-04 | 7 defaults → on-brand single source of truth (DefaultWorkItemTypes) + test. |
| I01-S07 | B | WorkItem CRUD with rich text | Done | claude/spec-refactor-i01-s07-workitem-crud | [#88](https://github.com/akpdeepak/bsmart-works/pull/88) | 2026-06-04 | Tenant-scope list/search/backlog/trash reads (RB-40 §1); guard restore/reorder writes. |
| I01-S08 | F | Kanban board (basic) | Done | claude/spec-refactor-i01-s08-kanban | [#89](https://github.com/akpdeepak/bsmart-works/pull/89) | 2026-06-04 | Board loading uses the column skeleton, not a spinner (Part-4); drag-drop optimistic+revert + density already met spec. |
| I01-S09 | G | Comments with @mentions | Done | claude/spec-refactor-i01-s09-comments | [#90](https://github.com/akpdeepak/bsmart-works/pull/90) | 2026-06-04 | Membership-gated comment read/add/delete (RB-40 §1); author-only delete; mentions confined to workspace. |
| I01-S10 | G | Notifications — in-app + email | Done | claude/spec-refactor-i01-s10-notifications | [#91](https://github.com/akpdeepak/bsmart-works/pull/91) | 2026-06-04 | Fix markRead IDOR (own-notification only, 404 otherwise); prefs/batching/digest already met spec. |
| I01-S11 | E | Full-text search | Done | claude/spec-refactor-i01-s11-search | [#92](https://github.com/akpdeepak/bsmart-works/pull/92) | 2026-06-04 | Escape LIKE wildcards + blank-query guard; title/desc/comments + starred/recent boosts + tenant scope (S07) already met spec. |
| I01-S12 | J | Personal home (My Works) | Done | claude/spec-refactor-i01-s12-my-works | [#93](https://github.com/akpdeepak/bsmart-works/pull/93) | 2026-06-04 | Verified Implemented (assigned/starred/mentions/activity + empty states); removed dead userId param on /my. |

### Iteration 2 — Release 2.0 · Sprints — Scrum + Reports

| ID | Cap | Spec | Status | Branch | PR | Date | Notes |
|---|---|---|---|---|---|---|---|
| I02-S01 | F | Backlog with capacity bar | Pending | — | — | — | — |
| I02-S02 | F | Sprints (Scrum) | Pending | — | — | — | — |
| I02-S03 | B | WorkItem links & parent / sub-task | Pending | — | — | — | — |
| I02-S04 | F | Swimlanes and quick filters | Pending | — | — | — | — |
| I02-S05 | J | Sprint reports | Pending | — | — | — | — |
| I02-S06 | E | Saved filters | Pending | — | — | — | — |
| I02-S07 | G | Attachments | Pending | — | — | — | — |
| I02-S08 | G | Activity log per work item | Pending | — | — | — | — |

### Iteration 3 — Release 3.0 · Workflows, Permissions & Custom Fields

| ID | Cap | Spec | Status | Branch | PR | Date | Notes |
|---|---|---|---|---|---|---|---|
| I03-S01 | C | Visual workflow editor | Pending | — | — | — | — |
| I03-S02 | C | Roles and permissions matrix | Pending | — | — | — | — |
| I03-S03 | C | Field visibility rules per role | Pending | — | — | — | — |
| I03-S04 | D | Custom WorkItem types | Pending | — | — | — | — |
| I03-S05 | D | Custom field library (17+ types) | Pending | — | — | — | — |
| I03-S06 | D | Layout designer | Pending | — | — | — | — |
| I03-S07 | C | Workflow conditions, validators, post-functions | Pending | — | — | — | — |
| I03-S08 | E | WIQL — Work Item Query Language | Pending | — | — | — | — |

### Iteration 4 — Release 4.0 · PM Artifacts — RAID, Decisions, Meetings

| ID | Cap | Spec | Status | Branch | PR | Date | Notes |
|---|---|---|---|---|---|---|---|
| I04-S01 | H | Risks register | Pending | — | — | — | — |
| I04-S02 | H | Assumptions log | Pending | — | — | — | — |
| I04-S03 | H | PM-style issues log | Pending | — | — | — | — |
| I04-S04 | H | Dependencies tracker | Pending | — | — | — | — |
| I04-S05 | H | Decisions register | Pending | — | — | — | — |
| I04-S06 | H | Meeting notes | Pending | — | — | — | — |
| I04-S07 | H | Action items | Pending | — | — | — | — |
| I04-S08 | H | RAID dashboard per project | Pending | — | — | — | — |
| I04-S09 | H | Stakeholder register | Pending | — | — | — | — |
| I04-S10 | H | Lessons learned | Pending | — | — | — | — |

### Iteration 5 — Release 5.0 · Knowledge Repository + Versions

| ID | Cap | Spec | Status | Branch | PR | Date | Notes |
|---|---|---|---|---|---|---|---|
| I05-S01 | I | Knowledge spaces | Pending | — | — | — | — |
| I05-S02 | I | Rich article editor | Pending | — | — | — | — |
| I05-S03 | I | Article templates | Pending | — | — | — | — |
| I05-S04 | I | Version history & restore | Pending | — | — | — | — |
| I05-S05 | I | Article ↔ WorkItem linking | Pending | — | — | — | — |
| I05-S06 | I | Inline comments on articles | Pending | — | — | — | — |
| I05-S07 | I | Drafts & publishing workflow | Pending | — | — | — | — |
| I05-S08 | I | Article analytics | Pending | — | — | — | — |
| I05-S09 | J | Versions and Releases | Pending | — | — | — | — |
| I05-S10 | J | Time tracking and worklogs | Pending | — | — | — | — |

### Iteration 6 — Release 6.0 · Reports, Dashboards & Insights

| ID | Cap | Spec | Status | Branch | PR | Date | Notes |
|---|---|---|---|---|---|---|---|
| I06-S01 | J | Dashboard designer | Done | (pre-existing on main) | — | 2026-06-04 | Drag-drop grid + personal/team/project/org scopes (CustomDashboardController, V29) |
| I06-S02 | J | Widget library (20+ widgets) | Done | claude/iteration-6-remaining-work | [#84](https://github.com/akpdeepak/bsmart-works/pull/84) | 2026-06-04 | Palette expanded 11→21 presets over 10 render types; +unassigned/dueSoon filters |
| I06-S03 | J | Custom report builder | Done | (pre-existing on main) | — | 2026-06-04 | Section-based builder (kpi/chart/table/narrative), ReportController, V30 |
| I06-S04 | J | Scheduled report delivery | Done | claude/iteration-6-remaining-work | [#84](https://github.com/akpdeepak/bsmart-works/pull/84) | 2026-06-04 | UI added over existing backend: cadence/channel/recipients, pause/resume/remove |
| I06-S05 | J | Report templates | Done | claude/iteration-6-remaining-work | [#84](https://github.com/akpdeepak/bsmart-works/pull/84) | 2026-06-04 | V38 adds Release / Monthly-exec / Customer templates (6 total) |
| I06-S06 | J | Drill-down navigation | Done | (pre-existing on main) | — | 2026-06-04 | DashboardDrillModal; widget elements open underlying items |
| I06-S07 | J | Export PDF / Excel / PNG | Done | (pre-existing on main) | — | 2026-06-04 | PDF+PNG+CSV; XLSX intentionally CSV (SheetJS advisory, export.js) |
| I06-S08 | J | Embeddable read-only dashboards | Done | (pre-existing on main) | — | 2026-06-04 | Share tokens + PublicDashboardController + embed (V33) |

### Iteration 7 — Release 7.0 · Compliance Rules Engine

| ID | Cap | Spec | Status | Branch | PR | Date | Notes |
|---|---|---|---|---|---|---|---|
| I07-S01 | K | Rule definition (visual builder) | Done | claude/iteration-7-remaining-work-LzUso | — | 2026-06-04 | V34 model (PR #65) + controller (CRUD/clone/test/activate) + builder UI; BQL validated before save |
| I07-S02 | K | Seeded rule library (20+ templates) | Done | claude/iteration-7-remaining-work-LzUso | — | 2026-06-04 | V36 seeds 22 templates; one-click clone-to-workspace |
| I07-S03 | K | Continuous rule evaluation | Done | claude/iteration-7-remaining-work-LzUso | — | 2026-06-04 | Workspace-scoped scope+assertion engine; continuous (2m) + scheduled (hourly) sweeps + on-demand |
| I07-S04 | K | Violation lifecycle | Done | claude/iteration-7-remaining-work-LzUso | — | 2026-06-04 | OPEN→ACK→RESOLVED/WONT_FIX, auto-resolve, bulk ack; events recorded |
| I07-S05 | K | Severity routing | Done | claude/iteration-7-remaining-work-LzUso | — | 2026-06-04 | ITEM_OWNER/PROJECT_ADMIN/USER/EMAIL/SLACK targets; Slack stubbed (no broker yet) |
| I07-S06 | K | Escalation policies | Done | claude/iteration-7-remaining-work-LzUso | — | 2026-06-04 | Escalate-after-hours window; 15m runner; acknowledged stops the clock |
| I07-S07 | K | Compliance dashboard | Done | claude/iteration-7-remaining-work-LzUso | — | 2026-06-04 | Severity/status totals, 30-day trend, rules×projects heatmap, top rules |
| I07-S08 | K | Compliance audit log | Done | claude/iteration-7-remaining-work-LzUso | — | 2026-06-04 | Append-only events view + regulator-ready CSV export |
| I07-S09 | B | Auto status duration tracking | Done | claude/iteration-7-remaining-work-LzUso | — | 2026-06-04 | Per-status time projected from the event log; shown on the work item |

### Iteration 8 — Release 8.0 · SLA Engine — Internal & Generalized

| ID | Cap | Spec | Status | Branch | PR | Date | Notes |
|---|---|---|---|---|---|---|---|
| I08-S01 | M | SLA policy definition | Done | claude/iteration-8-bFw95 | — | 2026-06-04 | Built: SlaPolicy entity/repo, SlaPolicyService (pure) + SlaConfigService (RBAC manage_sla, workspace-scoped, events), CRUD + activate + clone-template. V36 migration; 2 seeded templates. |
| I08-S02 | M | Business-hours calendars | Done | claude/iteration-8-bFw95 | — | 2026-06-04 | Built: BusinessCalendar entity/repo + BusinessHoursCalculator (pure, DST-safe, 14 unit tests); default Mon–Fri 09:00–18:00 IST calendar seeded per workspace; holidays + timezones. |
| I08-S03 | M | Multiple SLA targets per policy | Done | claude/iteration-8-bFw95 | — | 2026-06-04 | Built: SlaTarget (FIRST_RESPONSE / RESOLUTION / CUSTOM) with start/stop statuses; add/remove via SlaConfigService; UI in SLA admin. |
| I08-S04 | M | Pause / resume triggers | Done | claude/iteration-8-bFw95 | — | 2026-06-04 | Built: policy pause_statuses; SlaEngineService auto-pauses/resumes clocks on work-item status change; consumed-time frozen on pause; full audit events. |
| I08-S05 | M | Visible countdown timers | Done | claude/iteration-8-bFw95 | — | 2026-06-04 | Built: sla_instances with recomputed due_at; GET /sla/work-items/{id} returns remaining/percent/colour; SlaBadge component (green/amber/red-pulse) + tests. |
| I08-S06 | M | SLA escalation | Done | claude/iteration-8-bFw95 | — | 2026-06-04 | Built: SlaEscalation (threshold NOTIFY/REASSIGN); SlaEvaluationScheduler fires steps + marks breaches each minute; events recorded. |
| I08-S07 | M | SLA reporting | Done | claude/iteration-8-bFw95 | — | 2026-06-04 | Built: GET /sla/report — met/breached/in-flight + compliance % per policy; summary cards in the SLA admin UI. |
| I08-S08 | M | SLA audit log | Done | claude/iteration-8-bFw95 | — | 2026-06-04 | Built: every start/pause/resume/met/breach/escalation recorded immutably in the event store; GET /sla/work-items/{id}/audit reads SLA_* events. |
| I08-S09 | M | Bulk SLA application | Done | claude/iteration-8-bFw95 | — | 2026-06-04 | Built: preview (count + sample of matching items via project + BQL scope) then commit; SlaConfigService.commitBulkApply; UI preview→apply flow. |

### Iteration 9 — Release 9.0 · Service Management — Customer Portal

| ID | Cap | Spec | Status | Branch | PR | Date | Notes |
|---|---|---|---|---|---|---|---|
| I09-S01 | N | Customer accounts | Done | claude/iteration-9-complete-FPl1v | — | 2026-06-04 | V38 customer_accounts + customer_users (separate identity); workspace-scoped CRUD + portal-user provisioning (manage_service); password hashes never returned |
| I09-S02 | N | Branded customer portal | Done | claude/iteration-9-complete-FPl1v | — | 2026-06-04 | Separate /portal app (main.jsx path route), lighter identity, per-account branding (logo/colour/subdomain), separate customer session |
| I09-S03 | N | Request types | Done | claude/iteration-9-complete-FPl1v | — | 2026-06-04 | Incident/Change/Service seeded as system types + admin-defined custom; workspace-scoped CRUD |
| I09-S04 | N | Portal forms per request type | Done | claude/iteration-9-complete-FPl1v | — | 2026-06-04 | JSON form_schema per type with conditional showIf fields; validated as JSON on save; portal renders + validates |
| I09-S05 | N | Agent queues | Done | claude/iteration-9-complete-FPl1v | — | 2026-06-04 | All open · Mine · Unassigned · High priority; pick-up, assign, status lifecycle (work_service) |
| I09-S06 | M | Customer-facing SLA | Done | claude/iteration-9-complete-FPl1v | — | 2026-06-04 | Server-computed countdown (ON_TRACK/AT_RISK/BREACHED/MET) shown to both agent and customer — one engine, two contexts. Self-contained tier engine (iteration 8 not yet built) |
| I09-S07 | N | Customer-facing knowledge base | Done | claude/iteration-9-complete-FPl1v | — | 2026-06-04 | articles.portal_published flag + agent publish/unpublish; workspace-scoped portal read/search |
| I09-S08 | N | Customer satisfaction (CSAT) | Done | claude/iteration-9-complete-FPl1v | — | 2026-06-04 | 1–5 + comment, one per resolved request; workspace-scoped trends (count/avg/distribution/%satisfied) |
| I09-S09 | N | Customer dashboard | Done | claude/iteration-9-complete-FPl1v | — | 2026-06-04 | Open/resolved/total + SLA-breached counts + recent resolutions, account-scoped |
| I09-S10 | M | Multi-tier customer SLAs | Done | claude/iteration-9-complete-FPl1v | — | 2026-06-04 | Per-workspace tiers (Platinum/Gold/Silver); account tier selects response/resolution targets applied on submit |

### Iteration 10 — Release 10.0 · AI Orchestration Foundation + AI Control Plane

| ID | Cap | Spec | Status | Branch | PR | Date | Notes |
|---|---|---|---|---|---|---|---|
| I10-S01 | O | AI Orchestration service | Pending | — | — | — | — |
| I10-S02 | O | Confirmation-first pattern | Pending | — | — | — | — |
| I10-S03 | Z | Workspace AI policy | Pending | — | — | — | — |
| I10-S04 | Z | Per-capability AI toggle | Pending | — | — | — | — |
| I10-S05 | Z | Per-user AI preference | Pending | — | — | — | — |
| I10-S06 | Z | AI budget caps | Pending | — | — | — | — |
| I10-S07 | Z | AI usage dashboard | Pending | — | — | — | — |
| I10-S08 | Z | AI audit log | Pending | — | — | — | — |
| I10-S09 | Z | Fallback documentation | Pending | — | — | — | — |
| I10-S10 | Z | Model tier selection | Pending | — | — | — | — |
| I10-S11 | Z | Data boundary controls | Pending | — | — | — | — |
| I10-S12 | O | Natural language → WIQL | Pending | — | — | — | — |
| I10-S13 | O | Summarization | Pending | — | — | — | — |

### Iteration 11 — Release 11.0 · AI Expansion + Conversational Command Bar

| ID | Cap | Spec | Status | Branch | PR | Date | Notes |
|---|---|---|---|---|---|---|---|
| I11-S01 | P | Conversational command bar | Pending | — | — | — | — |
| I11-S02 | P | Multi-action plans | Pending | — | — | — | — |
| I11-S03 | P | Plan preview & inline edit | Pending | — | — | — | — |
| I11-S04 | P | Voice input | Pending | — | — | — | — |
| I11-S05 | P | Multilingual command | Pending | — | — | — | — |
| I11-S06 | O | Smart triage on incoming items | Pending | — | — | — | — |
| I11-S07 | O | Story / AC / test case generation | Pending | — | — | — | — |
| I11-S08 | O | AI comment drafting | Pending | — | — | — | — |
| I11-S09 | O | Anomaly explanation on charts | Pending | — | — | — | — |
| I11-S10 | K | AI-suggested compliance rules | Pending | — | — | — | — |
| I11-S11 | M | SLA breach prediction | Pending | — | — | — | — |
| I11-S12 | I | RAG over knowledge base | Pending | — | — | — | — |
| I11-S13 | I | AI article drafting | Pending | — | — | — | — |
| I11-S14 | N | Article suggestion at intake | Pending | — | — | — | — |
| I11-S15 | N | Smart customer request routing | Pending | — | — | — | — |

### Iteration 12 — Release 12.0 · KPI Framework with Privacy Guardrails

| ID | Cap | Spec | Status | Branch | PR | Date | Notes |
|---|---|---|---|---|---|---|---|
| I12-S01 | L | Metric definitions and snapshots | Pending | — | — | — | — |
| I12-S02 | L | Default metric catalog | Pending | — | — | — | — |
| I12-S03 | L | Custom metric builder | Pending | — | — | — | — |
| I12-S04 | L | Personal view (private) | Pending | — | — | — | — |
| I12-S05 | L | Team view (aggregated) | Pending | — | — | — | — |
| I12-S06 | L | Project view | Pending | — | — | — | — |
| I12-S07 | L | Manager view (privacy-enforced) | Pending | — | — | — | — |
| I12-S08 | L | Executive / Org view | Pending | — | — | — | — |
| I12-S09 | L | Voluntary individual sharing | Pending | — | — | — | — |
| I12-S10 | L | Team health composite | Pending | — | — | — | — |
| I12-S11 | L | Cycle time distribution | Pending | — | — | — | — |
| I12-S12 | L | AI team-health narrative | Pending | — | — | — | — |

### Iteration 13 — Release 13.0 · Automation Engine + Integrations

| ID | Cap | Spec | Status | Branch | PR | Date | Notes |
|---|---|---|---|---|---|---|---|
| I13-S01 | C | Automation engine | Pending | — | — | — | — |
| I13-S02 | C | Scheduled automations | Pending | — | — | — | — |
| I13-S03 | C | Automation library / templates | Pending | — | — | — | — |
| I13-S04 | C | Test mode for automations | Pending | — | — | — | — |
| I13-S05 | C | Automation audit log | Pending | — | — | — | — |
| I13-S06 | Q | Outbound webhooks | Pending | — | — | — | — |
| I13-S07 | Q | Public REST API + OAuth 2.0 | Pending | — | — | — | — |
| I13-S08 | A | SSO (SAML, OIDC) and SCIM | Pending | — | — | — | — |
| I13-S09 | Q | Slack connector (native) | Pending | — | — | — | — |
| I13-S10 | Q | GitHub / GitLab connector | Pending | — | — | — | — |
| I13-S11 | Q | Email connector | Pending | — | — | — | — |
| I13-S12 | Q | Calendar (Google / Outlook) | Pending | — | — | — | — |

### Iteration 14 — Release 14.0 · Developer Workspace + IDE Extension

| ID | Cap | Spec | Status | Branch | PR | Date | Notes |
|---|---|---|---|---|---|---|---|
| I14-S01 | U | Developer Workspace home | Pending | — | — | — | — |
| I14-S02 | U | VS Code extension | Pending | — | — | — | — |
| I14-S03 | U | JetBrains extension | Pending | — | — | — | — |
| I14-S04 | U | Code review queue | Pending | — | — | — | — |
| I14-S05 | U | Focus mode | Pending | — | — | — | — |
| I14-S06 | U | Standup helper | Pending | — | — | — | — |
| I14-S07 | U | Personal velocity (private) | Pending | — | — | — | — |
| I14-S08 | U | Time blocking | Pending | — | — | — | — |
| I14-S09 | U | Definition-of-done checklists | Pending | — | — | — | — |
| I14-S10 | U | CLI tool (works command) | Pending | — | — | — | — |
| I14-S11 | U | Code context on work item | Pending | — | — | — | — |

### Iteration 15 — Release 15.0 · Scrum Master Cockpit + Product Owner Workspace

| ID | Cap | Spec | Status | Branch | PR | Date | Notes |
|---|---|---|---|---|---|---|---|
| I15-S01 | V | Sprint planning helper | Done | claude/iteration-15-complete-LlY2f | — | 2026-06-05 | — |
| I15-S02 | V | Standup facilitator | Done | claude/iteration-15-complete-LlY2f | — | 2026-06-05 | — |
| I15-S03 | V | Impediment tracker | Done | claude/iteration-15-complete-LlY2f | — | 2026-06-05 | — |
| I15-S04 | V | Mid-sprint risk panel | Done | claude/iteration-15-complete-LlY2f | — | 2026-06-05 | — |
| I15-S05 | V | Retro toolkit | Done | claude/iteration-15-complete-LlY2f | — | 2026-06-05 | — |
| I15-S06 | V | Sprint review prep | Done | claude/iteration-15-complete-LlY2f | — | 2026-06-05 | — |
| I15-S07 | V | Cross-sprint pattern detection | Done | claude/iteration-15-complete-LlY2f | — | 2026-06-05 | — |
| I15-S08 | W | Product roadmap | Done | claude/iteration-15-complete-LlY2f | — | 2026-06-05 | — |
| I15-S09 | W | Backlog refinement helper | Done | claude/iteration-15-complete-LlY2f | — | 2026-06-05 | — |
| I15-S10 | W | Idea capture inbox | Done | claude/iteration-15-complete-LlY2f | — | 2026-06-05 | — |
| I15-S11 | W | Customer feedback aggregation | Done | claude/iteration-15-complete-LlY2f | — | 2026-06-05 | — |
| I15-S12 | W | OKR linkage | Done | claude/iteration-15-complete-LlY2f | — | 2026-06-05 | — |
| I15-S13 | W | Release notes auto-draft | Done | claude/iteration-15-complete-LlY2f | — | 2026-06-05 | — |
| I15-S14 | W | Stakeholder map | Done | claude/iteration-15-complete-LlY2f | — | 2026-06-05 | — |

### Iteration 16 — Release 16.0 · Leadership Console + Admin Operations Center

| ID | Cap | Spec | Status | Branch | PR | Date | Notes |
|---|---|---|---|---|---|---|---|
| I16-S01 | X | Cross-team rollup dashboard | Pending | — | — | — | — |
| I16-S02 | X | AI executive briefing | Pending | — | — | — | — |
| I16-S03 | X | Strategic theme tracker | Pending | — | — | — | — |
| I16-S04 | X | Resource allocation view | Pending | — | — | — | — |
| I16-S05 | X | Risk portfolio | Pending | — | — | — | — |
| I16-S06 | X | Customer health dashboard | Pending | — | — | — | — |
| I16-S07 | X | Strategy-to-execution map | Pending | — | — | — | — |
| I16-S08 | X | Board deck auto-draft | Pending | — | — | — | — |
| I16-S09 | Y | User lifecycle automation | Pending | — | — | — | — |
| I16-S10 | Y | License / seat management | Pending | — | — | — | — |
| I16-S11 | Y | Workspace health monitor | Pending | — | — | — | — |
| I16-S12 | Y | AI cost dashboard | Pending | — | — | — | — |
| I16-S13 | Y | Audit log explorer | Pending | — | — | — | — |
| I16-S14 | Y | Integration health dashboard | Pending | — | — | — | — |
| I16-S15 | Y | Access review | Pending | — | — | — | — |
| I16-S16 | Y | Compliance evidence package | Pending | — | — | — | — |

### Iteration 17 — Release 17.0 · Universal Customization Engine

| ID | Cap | Spec | Status | Branch | PR | Date | Notes |
|---|---|---|---|---|---|---|---|
| I17-S01 | R | Workspace settings (centralized) | Pending | — | — | — | — |
| I17-S02 | R | Configuration templates | Pending | — | — | — | — |
| I17-S03 | R | Configuration versioning | Pending | — | — | — | — |
| I17-S04 | R | Sandbox mode | Pending | — | — | — | — |
| I17-S05 | R | Config import / export | Pending | — | — | — | — |
| I17-S06 | R | Lockable settings | Pending | — | — | — | — |
| I17-S07 | R | Configuration diff | Pending | — | — | — | — |
| I17-S08 | R | Config impact analysis | Pending | — | — | — | — |
| I17-S09 | R | Custom forms designer | Pending | — | — | — | — |
| I17-S10 | R | Custom views / pages | Pending | — | — | — | — |
| I17-S11 | R | Extension API (code-level) | Pending | — | — | — | — |

### Iteration 18 — Release 18.0 · Mobile + Real-time + Performance

| ID | Cap | Spec | Status | Branch | PR | Date | Notes |
|---|---|---|---|---|---|---|---|
| I18-S01 | S | Native iOS app | Pending | — | — | — | — |
| I18-S02 | S | Native Android app | Pending | — | — | — | — |
| I18-S03 | S | Mobile-optimized PWA | Pending | — | — | — | — |
| I18-S04 | S | Offline mode | Pending | — | — | — | — |
| I18-S05 | S | Push notifications | Pending | — | — | — | — |
| I18-S06 | S | Biometric auth | Pending | — | — | — | — |
| I18-S07 | S | Real-time co-presence | Pending | — | — | — | — |
| I18-S08 | S | Real-time updates | Pending | — | — | — | — |
| I18-S09 | S | Command palette | Pending | — | — | — | — |
| I18-S10 | S | Keyboard shortcuts | Pending | — | — | — | — |
| I18-S11 | S | Performance SLAs | Pending | — | — | — | — |
| I18-S12 | S | Observability | Pending | — | — | — | — |

### Iteration 19 — Release 19.0 · Enterprise Security + Compliance Certifications

| ID | Cap | Spec | Status | Branch | PR | Date | Notes |
|---|---|---|---|---|---|---|---|
| I19-S01 | T | Passkeys (WebAuthn) | Pending | — | — | — | — |
| I19-S02 | T | Conditional access policies | Pending | — | — | — | — |
| I19-S03 | T | Append-only audit log (enhanced) | Pending | — | — | — | — |
| I19-S04 | T | Audit log UI (browsable) | Pending | — | — | — | — |
| I19-S05 | T | Audit log streaming | Pending | — | — | — | — |
| I19-S06 | T | Data residency options | Pending | — | — | — | — |
| I19-S07 | T | Encryption at rest with BYOK | Pending | — | — | — | — |
| I19-S08 | T | Anomaly detection on access | Pending | — | — | — | — |
| I19-S09 | T | Data export (GDPR / DPDP) | Pending | — | — | — | — |
| I19-S10 | T | Right to be forgotten | Pending | — | — | — | — |
| I19-S11 | T | Penetration test program | Pending | — | — | — | — |
| I19-S12 | T | Compliance certifications | Pending | — | — | — | — |

### Iteration 20 — Release 20.0 · Polish, Advanced AI, Marketplace Foundation

| ID | Cap | Spec | Status | Branch | PR | Date | Notes |
|---|---|---|---|---|---|---|---|
| I20-S01 | O | Multi-step AI agents | Pending | — | — | — | — |
| I20-S02 | O | Custom AI assistants | Pending | — | — | — | — |
| I20-S03 | O | AI memory / context | Pending | — | — | — | — |
| I20-S04 | R | App marketplace (foundation) | Pending | — | — | — | — |
| I20-S05 | R | Developer portal | Pending | — | — | — | — |
| I20-S06 | O | Conversational dashboards | Pending | — | — | — | — |
| I20-S07 | S | Performance hardening (final) | Pending | — | — | — | — |
| I20-S08 | A | Accessibility audit (WCAG 2.2 AA) | Pending | — | — | — | — |
| I20-S09 | T | Final security hardening | Pending | — | — | — | — |
| I20-S10 | A | Localization (10+ languages) | Pending | — | — | — | — |
| I20-S11 | I | Advanced knowledge features | Pending | — | — | — | — |
| I20-S12 | N | Customer chat support | Pending | — | — | — | — |

