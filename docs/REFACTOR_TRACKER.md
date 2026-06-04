# bSmart Works — Spec Refactor Tracker

> Living ledger for the spec-refactor engine ([REFACTOR-MASTER-PROMPT.md](./REFACTOR-MASTER-PROMPT.md)).
> One row per capability-tagged feature block in Part 7 of
> [docs/specifications/06-iteration-guide.md](./specifications/06-iteration-guide.md).
> **224 specs across 20 iterations** (count verified against the committed guide).
>
> Mode: **frontier-forward** — the engine works the current build frontier (close iteration-6
> gaps, then build iterations 7→20). Already-shipped iterations are `Baseline` and are *not*
> re-refactored unless deliberately re-queued. Generated 2026-06-04.

---

## Status legend

| Status | Meaning | Actionable? |
|--------|---------|-------------|
| `Baseline` | Shipped before this engine existed. Out of refactor scope under frontier-forward. | No |
| `Partial` | Implemented but incomplete vs the spec — a real gap to close. | **Yes** |
| `Review` | Implementation appears present; completeness unverified. Phase 1 confirms → close or mark `Baseline`. | **Yes** |
| `In progress` | Actively being built (this engine, or recent team PRs not yet spec-complete). | **Yes** |
| `Missing` | Not yet built. Build to spec via the full pipeline. | **Yes** |
| `Done` | Completed by this engine; PR merged, post-merge validation passed. | — |
| `Blocked (reason)` | Stopped after 3-strike; reason recorded. | — |

**Selection rule (frontier-forward):** pick the first **actionable** spec in tracker order
(`Partial` → `Review` → `In progress` → `Missing`), skipping `Baseline`/`Done`. `TARGET_SPEC`
overrides. Iterations still complete in sequence — do not start iteration N+1 while N has an
actionable spec, unless N's remainder is `Baseline`.

---

## Frontier pointer

- **Next actionable spec:** `I06-S02 · Widget library (20+ widgets)` — backend has ~10 widget
  types vs the spec's 20+.
- **Then:** `I06-S06 · Drill-down navigation` (Review) → `I07-S01 · Rule definition (visual
  builder)` (In progress: V34 data model + service exist; controller + UI pending) → iteration 7
  remainder → iterations 8–20.

## Roll-up

| Status | Count |
|--------|------:|
| Baseline | 54 |
| Partial | 1 |
| Review | 1 |
| In progress | 1 |
| Missing | 167 |
| Done | 0 |
| **Total** | **224** |

> Classification confidence: iterations 1–5 `Baseline` per orchestrator §6 ("iteration 5
> complete"); iteration 6 verified against migrations V29–V33 + backend controllers + the
> `App.jsx` UI monolith + `lib/export.js`; iteration 7 against V34 + the compliance model/service
> (#65). Iterations 8–20 are `Missing` by roadmap position — each spec's precise
> Implemented/Partial/Missing call is made at its run's Phase 1, as the engine intends.

---

## Iteration 1 — Release 1.0 · Foundation — The Works MVP

| ID | Cap | Spec | Status | Branch | PR | Date | Notes |
|----|-----|------|--------|--------|----|----|-------|
| I01-S01 | A | Authentication & identity | Baseline | — | — | — | shipped |
| I01-S02 | A | Workspaces | Baseline | — | — | — | shipped |
| I01-S03 | A | App shell — topbar, sidenav, workspace switcher | Baseline | — | — | — | shipped |
| I01-S04 | A | Event store foundation | Baseline | — | — | — | `events` table |
| I01-S05 | B | Projects | Baseline | — | — | — | shipped |
| I01-S06 | B | Default WorkItem types | Baseline | — | — | — | shipped |
| I01-S07 | B | WorkItem CRUD with rich text | Baseline | — | — | — | shipped |
| I01-S08 | F | Kanban board (basic) | Baseline | — | — | — | shipped |
| I01-S09 | G | Comments with @mentions | Baseline | — | — | — | shipped |
| I01-S10 | G | Notifications — in-app + email | Baseline | — | — | — | shipped |
| I01-S11 | E | Full-text search | Baseline | — | — | — | shipped |
| I01-S12 | J | Personal home (My Works) | Baseline | — | — | — | shipped |

## Iteration 2 — Release 2.0 · Sprints — Scrum + Reports

| ID | Cap | Spec | Status | Branch | PR | Date | Notes |
|----|-----|------|--------|--------|----|----|-------|
| I02-S01 | F | Backlog with capacity bar | Baseline | — | — | — | shipped |
| I02-S02 | F | Sprints (Scrum) | Baseline | — | — | — | shipped |
| I02-S03 | B | WorkItem links & parent / sub-task | Baseline | — | — | — | shipped |
| I02-S04 | F | Swimlanes and quick filters | Baseline | — | — | — | shipped |
| I02-S05 | J | Sprint reports | Baseline | — | — | — | shipped |
| I02-S06 | E | Saved filters | Baseline | — | — | — | shipped |
| I02-S07 | G | Attachments | Baseline | — | — | — | shipped |
| I02-S08 | G | Activity log per work item | Baseline | — | — | — | shipped |

## Iteration 3 — Release 3.0 · Workflows, Permissions & Custom Fields

| ID | Cap | Spec | Status | Branch | PR | Date | Notes |
|----|-----|------|--------|--------|----|----|-------|
| I03-S01 | C | Visual workflow editor | Baseline | — | — | — | shipped |
| I03-S02 | C | Roles and permissions matrix | Baseline | — | — | — | shipped |
| I03-S03 | C | Field visibility rules per role | Baseline | — | — | — | shipped |
| I03-S04 | D | Custom WorkItem types | Baseline | — | — | — | shipped |
| I03-S05 | D | Custom field library (17+ types) | Baseline | — | — | — | shipped |
| I03-S06 | D | Layout designer | Baseline | — | — | — | shipped |
| I03-S07 | C | Workflow conditions, validators, post-functions | Baseline | — | — | — | shipped |
| I03-S08 | E | BQL — bSmart Query Language | Baseline | — | — | — | renamed from WIQL (#39) |

## Iteration 4 — Release 4.0 · PM Artifacts — RAID, Decisions, Meetings

| ID | Cap | Spec | Status | Branch | PR | Date | Notes |
|----|-----|------|--------|--------|----|----|-------|
| I04-S01 | H | Risks register | Baseline | — | — | — | shipped |
| I04-S02 | H | Assumptions log | Baseline | — | — | — | shipped |
| I04-S03 | H | PM-style issues log | Baseline | — | — | — | shipped |
| I04-S04 | H | Dependencies tracker | Baseline | — | — | — | shipped |
| I04-S05 | H | Decisions register | Baseline | — | — | — | shipped |
| I04-S06 | H | Meeting notes | Baseline | — | — | — | shipped |
| I04-S07 | H | Action items | Baseline | — | — | — | shipped |
| I04-S08 | H | RAID dashboard per project | Baseline | — | — | — | shipped |
| I04-S09 | H | Stakeholder register | Baseline | — | — | — | shipped |
| I04-S10 | H | Lessons learned | Baseline | — | — | — | shipped |

## Iteration 5 — Release 5.0 · Knowledge Repository + Versions

| ID | Cap | Spec | Status | Branch | PR | Date | Notes |
|----|-----|------|--------|--------|----|----|-------|
| I05-S01 | I | Knowledge spaces | Baseline | — | — | — | shipped |
| I05-S02 | I | Rich article editor | Baseline | — | — | — | shipped |
| I05-S03 | I | Article templates | Baseline | — | — | — | shipped |
| I05-S04 | I | Version history & restore | Baseline | — | — | — | shipped |
| I05-S05 | I | Article ↔ WorkItem linking | Baseline | — | — | — | shipped |
| I05-S06 | I | Inline comments on articles | Baseline | — | — | — | V27 |
| I05-S07 | I | Drafts & publishing workflow | Baseline | — | — | — | V27 |
| I05-S08 | I | Article analytics | Baseline | — | — | — | V28 search terms |
| I05-S09 | J | Versions and Releases | Baseline | — | — | — | V25 |
| I05-S10 | J | Time tracking and worklogs | Baseline | — | — | — | V25 worklogs |

## Iteration 6 — Release 6.0 · Reports, Dashboards & Insights

| ID | Cap | Spec | Status | Branch | PR | Date | Notes |
|----|-----|------|--------|--------|----|----|-------|
| I06-S01 | J | Dashboard designer | Baseline | — | — | — | V29 custom dashboards + layout service |
| I06-S02 | J | Widget library (20+ widgets) | **Partial** | — | — | — | **frontier** — ~10 widget types vs 20+ |
| I06-S03 | J | Custom report builder | Baseline | — | — | — | V30 reports |
| I06-S04 | J | Scheduled report delivery | Baseline | — | — | — | V31 + ReportDeliveryScheduler |
| I06-S05 | J | Report templates | Baseline | — | — | — | V30 seeded templates |
| I06-S06 | J | Drill-down navigation | **Review** | — | — | — | present in App.jsx/dashboard-metrics; verify completeness |
| I06-S07 | J | Export PDF / Excel / PNG | Baseline | — | — | — | `lib/export.js` (Excel = CSV by design — xlsx CVE) |
| I06-S08 | J | Embeddable read-only dashboards | Baseline | — | — | — | V33 share token + PublicDashboardController |

## Iteration 7 — Release 7.0 · Compliance Rules Engine

| ID | Cap | Spec | Status | Branch | PR | Date | Notes |
|----|-----|------|--------|--------|----|----|-------|
| I07-S01 | K | Rule definition (visual builder) | **In progress** | — | [#65](../../pull/65) | — | V34 model + service; controller + visual builder UI pending |
| I07-S02 | K | Seeded rule library (20+ templates) | Missing | — | — | — | — |
| I07-S03 | K | Continuous rule evaluation | Missing | — | — | — | — |
| I07-S04 | K | Violation lifecycle | Missing | — | — | — | — |
| I07-S05 | K | Severity routing | Missing | — | — | — | — |
| I07-S06 | K | Escalation policies | Missing | — | — | — | — |
| I07-S07 | K | Compliance dashboard | Missing | — | — | — | — |
| I07-S08 | K | Compliance audit log | Missing | — | — | — | — |
| I07-S09 | B | Auto status duration tracking | Missing | — | — | — | — |

## Iteration 8 — Release 8.0 · SLA Engine — Internal & Generalized

| ID | Cap | Spec | Status | Branch | PR | Date | Notes |
|----|-----|------|--------|--------|----|----|-------|
| I08-S01 | M | SLA policy definition | Missing | — | — | — | — |
| I08-S02 | M | Business-hours calendars | Missing | — | — | — | — |
| I08-S03 | M | Multiple SLA targets per policy | Missing | — | — | — | — |
| I08-S04 | M | Pause / resume triggers | Missing | — | — | — | — |
| I08-S05 | M | Visible countdown timers | Missing | — | — | — | — |
| I08-S06 | M | SLA escalation | Missing | — | — | — | — |
| I08-S07 | M | SLA reporting | Missing | — | — | — | — |
| I08-S08 | M | SLA audit log | Missing | — | — | — | — |
| I08-S09 | M | Bulk SLA application | Missing | — | — | — | — |

## Iteration 9 — Release 9.0 · Service Management — Customer Portal

| ID | Cap | Spec | Status | Branch | PR | Date | Notes |
|----|-----|------|--------|--------|----|----|-------|
| I09-S01 | N | Customer accounts | Missing | — | — | — | — |
| I09-S02 | N | Branded customer portal | Missing | — | — | — | — |
| I09-S03 | N | Request types | Missing | — | — | — | — |
| I09-S04 | N | Portal forms per request type | Missing | — | — | — | — |
| I09-S05 | N | Agent queues | Missing | — | — | — | — |
| I09-S06 | M | Customer-facing SLA | Missing | — | — | — | — |
| I09-S07 | N | Customer-facing knowledge base | Missing | — | — | — | — |
| I09-S08 | N | Customer satisfaction (CSAT) | Missing | — | — | — | — |
| I09-S09 | N | Customer dashboard | Missing | — | — | — | — |
| I09-S10 | N | Multi-tier customer SLAs | Missing | — | — | — | — |

## Iteration 10 — Release 10.0 · AI Orchestration Foundation + AI Control Plane

| ID | Cap | Spec | Status | Branch | PR | Date | Notes |
|----|-----|------|--------|--------|----|----|-------|
| I10-S01 | O | AI Orchestration service | Missing | — | — | — | — |
| I10-S02 | O | Confirmation-first pattern | Missing | — | — | — | — |
| I10-S03 | Z | Workspace AI policy | Missing | — | — | — | — |
| I10-S04 | Z | Per-capability AI toggle | Missing | — | — | — | — |
| I10-S05 | Z | Per-user AI preference | Missing | — | — | — | — |
| I10-S06 | Z | AI budget caps | Missing | — | — | — | — |
| I10-S07 | Z | AI usage dashboard | Missing | — | — | — | — |
| I10-S08 | Z | AI audit log | Missing | — | — | — | — |
| I10-S09 | Z | Fallback documentation | Missing | — | — | — | — |
| I10-S10 | Z | Model tier selection | Missing | — | — | — | — |
| I10-S11 | Z | Data boundary controls | Missing | — | — | — | — |
| I10-S12 | O | Natural language → BQL | Missing | — | — | — | — |
| I10-S13 | O | Summarization | Missing | — | — | — | — |

## Iteration 11 — Release 11.0 · AI Expansion + Conversational Command Bar

| ID | Cap | Spec | Status | Branch | PR | Date | Notes |
|----|-----|------|--------|--------|----|----|-------|
| I11-S01 | P | Conversational command bar | Missing | — | — | — | — |
| I11-S02 | P | Multi-action plans | Missing | — | — | — | — |
| I11-S03 | P | Plan preview & inline edit | Missing | — | — | — | — |
| I11-S04 | P | Voice input | Missing | — | — | — | — |
| I11-S05 | P | Multilingual command | Missing | — | — | — | — |
| I11-S06 | O | Smart triage on incoming items | Missing | — | — | — | — |
| I11-S07 | O | Story / AC / test case generation | Missing | — | — | — | — |
| I11-S08 | O | AI comment drafting | Missing | — | — | — | — |
| I11-S09 | O | Anomaly explanation on charts | Missing | — | — | — | — |
| I11-S10 | K | AI-suggested compliance rules | Missing | — | — | — | — |
| I11-S11 | M | SLA breach prediction | Missing | — | — | — | — |
| I11-S12 | I | RAG over knowledge base | Missing | — | — | — | — |
| I11-S13 | I | AI article drafting | Missing | — | — | — | — |
| I11-S14 | N | Article suggestion at intake | Missing | — | — | — | — |
| I11-S15 | N | Smart customer request routing | Missing | — | — | — | — |

## Iteration 12 — Release 12.0 · KPI Framework with Privacy Guardrails

| ID | Cap | Spec | Status | Branch | PR | Date | Notes |
|----|-----|------|--------|--------|----|----|-------|
| I12-S01 | L | Metric definitions and snapshots | Missing | — | — | — | — |
| I12-S02 | L | Default metric catalog | Missing | — | — | — | — |
| I12-S03 | L | Custom metric builder | Missing | — | — | — | — |
| I12-S04 | L | Personal view (private) | Missing | — | — | — | — |
| I12-S05 | L | Team view (aggregated) | Missing | — | — | — | — |
| I12-S06 | L | Project view | Missing | — | — | — | — |
| I12-S07 | L | Manager view (privacy-enforced) | Missing | — | — | — | — |
| I12-S08 | L | Executive / Org view | Missing | — | — | — | — |
| I12-S09 | L | Voluntary individual sharing | Missing | — | — | — | — |
| I12-S10 | L | Team health composite | Missing | — | — | — | — |
| I12-S11 | L | Cycle time distribution | Missing | — | — | — | — |
| I12-S12 | L | AI team-health narrative | Missing | — | — | — | — |

## Iteration 13 — Release 13.0 · Automation Engine + Integrations

| ID | Cap | Spec | Status | Branch | PR | Date | Notes |
|----|-----|------|--------|--------|----|----|-------|
| I13-S01 | C | Automation engine | Missing | — | — | — | — |
| I13-S02 | C | Scheduled automations | Missing | — | — | — | — |
| I13-S03 | C | Automation library / templates | Missing | — | — | — | — |
| I13-S04 | C | Test mode for automations | Missing | — | — | — | — |
| I13-S05 | C | Automation audit log | Missing | — | — | — | — |
| I13-S06 | Q | Outbound webhooks | Missing | — | — | — | — |
| I13-S07 | Q | Public REST API + OAuth 2.0 | Missing | — | — | — | — |
| I13-S08 | A | SSO (SAML, OIDC) and SCIM | Missing | — | — | — | — |
| I13-S09 | Q | Slack connector (native) | Missing | — | — | — | — |
| I13-S10 | Q | GitHub / GitLab connector | Missing | — | — | — | — |
| I13-S11 | Q | Email connector | Missing | — | — | — | — |
| I13-S12 | Q | Calendar (Google / Outlook) | Missing | — | — | — | — |

## Iteration 14 — Release 14.0 · Developer Workspace + IDE Extension

| ID | Cap | Spec | Status | Branch | PR | Date | Notes |
|----|-----|------|--------|--------|----|----|-------|
| I14-S01 | U | Developer Workspace home | Missing | — | — | — | — |
| I14-S02 | U | VS Code extension | Missing | — | — | — | — |
| I14-S03 | U | JetBrains extension | Missing | — | — | — | — |
| I14-S04 | U | Code review queue | Missing | — | — | — | — |
| I14-S05 | U | Focus mode | Missing | — | — | — | — |
| I14-S06 | U | Standup helper | Missing | — | — | — | — |
| I14-S07 | U | Personal velocity (private) | Missing | — | — | — | — |
| I14-S08 | U | Time blocking | Missing | — | — | — | — |
| I14-S09 | U | Definition-of-done checklists | Missing | — | — | — | — |
| I14-S10 | U | CLI tool (works command) | Missing | — | — | — | — |
| I14-S11 | U | Code context on work item | Missing | — | — | — | — |

## Iteration 15 — Release 15.0 · Scrum Master Cockpit + Product Owner Workspace

| ID | Cap | Spec | Status | Branch | PR | Date | Notes |
|----|-----|------|--------|--------|----|----|-------|
| I15-S01 | V | Sprint planning helper | Missing | — | — | — | — |
| I15-S02 | V | Standup facilitator | Missing | — | — | — | — |
| I15-S03 | V | Impediment tracker | Missing | — | — | — | — |
| I15-S04 | V | Mid-sprint risk panel | Missing | — | — | — | — |
| I15-S05 | V | Retro toolkit | Missing | — | — | — | — |
| I15-S06 | V | Sprint review prep | Missing | — | — | — | — |
| I15-S07 | V | Cross-sprint pattern detection | Missing | — | — | — | — |
| I15-S08 | W | Product roadmap | Missing | — | — | — | — |
| I15-S09 | W | Backlog refinement helper | Missing | — | — | — | — |
| I15-S10 | W | Idea capture inbox | Missing | — | — | — | — |
| I15-S11 | W | Customer feedback aggregation | Missing | — | — | — | — |
| I15-S12 | W | OKR linkage | Missing | — | — | — | — |
| I15-S13 | W | Release notes auto-draft | Missing | — | — | — | — |
| I15-S14 | W | Stakeholder map | Missing | — | — | — | — |

## Iteration 16 — Release 16.0 · Leadership Console + Admin Operations Center

| ID | Cap | Spec | Status | Branch | PR | Date | Notes |
|----|-----|------|--------|--------|----|----|-------|
| I16-S01 | X | Cross-team rollup dashboard | Missing | — | — | — | — |
| I16-S02 | X | AI executive briefing | Missing | — | — | — | — |
| I16-S03 | X | Strategic theme tracker | Missing | — | — | — | — |
| I16-S04 | X | Resource allocation view | Missing | — | — | — | — |
| I16-S05 | X | Risk portfolio | Missing | — | — | — | — |
| I16-S06 | X | Customer health dashboard | Missing | — | — | — | — |
| I16-S07 | X | Strategy-to-execution map | Missing | — | — | — | — |
| I16-S08 | X | Board deck auto-draft | Missing | — | — | — | — |
| I16-S09 | Y | User lifecycle automation | Missing | — | — | — | — |
| I16-S10 | Y | License / seat management | Missing | — | — | — | — |
| I16-S11 | Y | Workspace health monitor | Missing | — | — | — | — |
| I16-S12 | Y | AI cost dashboard | Missing | — | — | — | — |
| I16-S13 | Y | Audit log explorer | Missing | — | — | — | — |
| I16-S14 | Y | Integration health dashboard | Missing | — | — | — | — |
| I16-S15 | Y | Access review | Missing | — | — | — | — |
| I16-S16 | Y | Compliance evidence package | Missing | — | — | — | — |

## Iteration 17 — Release 17.0 · Universal Customization Engine

| ID | Cap | Spec | Status | Branch | PR | Date | Notes |
|----|-----|------|--------|--------|----|----|-------|
| I17-S01 | R | Workspace settings (centralized) | Missing | — | — | — | — |
| I17-S02 | R | Configuration templates | Missing | — | — | — | — |
| I17-S03 | R | Configuration versioning | Missing | — | — | — | — |
| I17-S04 | R | Sandbox mode | Missing | — | — | — | — |
| I17-S05 | R | Config import / export | Missing | — | — | — | — |
| I17-S06 | R | Lockable settings | Missing | — | — | — | — |
| I17-S07 | R | Configuration diff | Missing | — | — | — | — |
| I17-S08 | R | Config impact analysis | Missing | — | — | — | — |
| I17-S09 | R | Custom forms designer | Missing | — | — | — | — |
| I17-S10 | R | Custom views / pages | Missing | — | — | — | — |
| I17-S11 | R | Extension API (code-level) | Missing | — | — | — | — |

## Iteration 18 — Release 18.0 · Mobile + Real-time + Performance

| ID | Cap | Spec | Status | Branch | PR | Date | Notes |
|----|-----|------|--------|--------|----|----|-------|
| I18-S01 | S | Native iOS app | Missing | — | — | — | — |
| I18-S02 | S | Native Android app | Missing | — | — | — | — |
| I18-S03 | S | Mobile-optimized PWA | Missing | — | — | — | — |
| I18-S04 | S | Offline mode | Missing | — | — | — | — |
| I18-S05 | S | Push notifications | Missing | — | — | — | — |
| I18-S06 | S | Biometric auth | Missing | — | — | — | — |
| I18-S07 | S | Real-time co-presence | Missing | — | — | — | — |
| I18-S08 | S | Real-time updates | Missing | — | — | — | — |
| I18-S09 | S | Command palette | Missing | — | — | — | — |
| I18-S10 | S | Keyboard shortcuts | Missing | — | — | — | — |
| I18-S11 | S | Performance SLAs | Missing | — | — | — | — |
| I18-S12 | S | Observability | Missing | — | — | — | — |

## Iteration 19 — Release 19.0 · Enterprise Security + Compliance Certifications

| ID | Cap | Spec | Status | Branch | PR | Date | Notes |
|----|-----|------|--------|--------|----|----|-------|
| I19-S01 | T | Passkeys (WebAuthn) | Missing | — | — | — | — |
| I19-S02 | T | Conditional access policies | Missing | — | — | — | — |
| I19-S03 | T | Append-only audit log (enhanced) | Missing | — | — | — | — |
| I19-S04 | T | Audit log UI (browsable) | Missing | — | — | — | — |
| I19-S05 | T | Audit log streaming | Missing | — | — | — | — |
| I19-S06 | T | Data residency options | Missing | — | — | — | — |
| I19-S07 | T | Encryption at rest with BYOK | Missing | — | — | — | — |
| I19-S08 | T | Anomaly detection on access | Missing | — | — | — | — |
| I19-S09 | T | Data export (GDPR / DPDP) | Missing | — | — | — | — |
| I19-S10 | T | Right to be forgotten | Missing | — | — | — | — |
| I19-S11 | T | Penetration test program | Missing | — | — | — | — |
| I19-S12 | T | Compliance certifications | Missing | — | — | — | — |

## Iteration 20 — Release 20.0 · Polish, Advanced AI, Marketplace Foundation

| ID | Cap | Spec | Status | Branch | PR | Date | Notes |
|----|-----|------|--------|--------|----|----|-------|
| I20-S01 | O | Multi-step AI agents | Missing | — | — | — | — |
| I20-S02 | O | Custom AI assistants | Missing | — | — | — | — |
| I20-S03 | O | AI memory / context | Missing | — | — | — | — |
| I20-S04 | R | App marketplace (foundation) | Missing | — | — | — | — |
| I20-S05 | R | Developer portal | Missing | — | — | — | — |
| I20-S06 | O | Conversational dashboards | Missing | — | — | — | — |
| I20-S07 | S | Performance hardening (final) | Missing | — | — | — | — |
| I20-S08 | A | Accessibility audit (WCAG 2.2 AA) | Missing | — | — | — | — |
| I20-S09 | T | Final security hardening | Missing | — | — | — | — |
| I20-S10 | A | Localization (10+ languages) | Missing | — | — | — | — |
| I20-S11 | I | Advanced knowledge features | Missing | — | — | — | — |
| I20-S12 | N | Customer chat support | Missing | — | — | — | — |

---

*Bootstrapped 2026-06-04 on branch `docs/refactor-engine-bootstrap`. Spec names transcribed
verbatim from Part 7 of the committed iteration guide. Update each row through
`In progress → Done` (or `Blocked`) as the engine runs.*
