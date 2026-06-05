# Iteration 15 — Scrum Master Cockpit (Cap V) + Product Owner Workspace (Cap W) (completion)

Iteration 15 adds two **role-tuned surfaces** on top of the existing data model (sprints, work
items, releases, stakeholders, action items) and the iteration-10/11 **AI Control Plane**. After
this iteration, BCITS Scrum Masters and Product Owners have meaningfully better workflows — the most
demo-able product addition. No new visual language: both surfaces reuse the MVP design system with
tuned layouts (RB-30).

> **Owner-directed, built ahead of 12–14.** The active iteration in the roadmap is 11; this work was
> built on explicit instruction from the project owner to complete iteration 15 end-to-end. It is
> layered cleanly on the AI Control Plane and the existing PM artifacts, and does not disturb the
> iterations beneath it. Orchestrator §6 records the delivery.

> **No live model in this build.** Every AI capability routes through `AiControlPlaneService` and the
> deterministic offline provider, exactly like iteration 11. AI-on and the fallback differ in
> narrative richness and cost accounting, never in correctness — the structured result is always
> computed deterministically from real, workspace-scoped data.

## 1. Cap V — Scrum Master Cockpit

A dashboard-style cockpit with prominent action buttons (Plan sprint · Start standup · Run retro) and
seven tabbed surfaces:

| Sub-feature | What shipped | Key endpoint(s) |
|---|---|---|
| I15-S01 Sprint planning helper | Rolling-velocity capacity (last 3 completed sprints − time-off) + AI-suggested commit from refined, ready backlog items | `POST /api/v1/cockpit/sprint-planning` |
| I15-S02 Standup facilitator | Sequential, time-boxed per-member flow; auto-records yesterday/today/blockers; advances the cursor; flags still-pending members MISSING on complete | `/api/v1/standups` (+ `/advance`, `/complete`, `/entries/{id}/record`) |
| I15-S03 Impediment tracker | First-class blocker artifact — owner, severity, category, age, escalation, resolve | `/api/v1/impediments` |
| I15-S04 Mid-sprint risk panel | Deterministic live view: scope creep (from events), stale in-progress items, unassigned work, breach predictions, composite risk score | `GET /api/v1/cockpit/risk-panel` |
| I15-S05 Retro toolkit | Template gallery (Start-Stop-Continue / 4Ls / Mad-Sad-Glad), per-column notes, voting, anonymous mode, note → tracked `ActionItem` | `/api/v1/retros` (+ `/notes`, `/notes/{id}/vote`, `/notes/{id}/convert`) |
| I15-S06 Sprint review prep | AI summary + demo list + shipped/slipped metrics for stakeholders | `POST /api/v1/cockpit/review-prep` |
| I15-S07 Cross-sprint pattern detection | Recurring impediment categories, repeated estimation misses, common scope-creep sources | `POST /api/v1/cockpit/patterns` |

## 2. Cap W — Product Owner Workspace

A timeline-and-card strategic surface with six tabbed surfaces:

| Sub-feature | What shipped | Key endpoint(s) |
|---|---|---|
| I15-S08 Product roadmap | Strategic themes across quarters — status, scope, dates; optional link to an objective | `/api/v1/roadmap-themes` |
| I15-S09 Backlog refinement helper | AI ranking by weighted value / effort / strategic-fit; flags items needing detail | `POST /api/v1/po/backlog-refine` |
| I15-S10 Idea capture inbox | Lightweight capture, auto-classified by area, vote, promote to a story | `/api/v1/ideas` (+ `/promote`, `/vote`) |
| I15-S11 Customer feedback aggregation | Sources + lexicon sentiment; AI clusters into themes with sentiment breakdown | `/api/v1/customer-feedback`, `POST /api/v1/po/feedback-cluster` |
| I15-S12 OKR linkage | Objectives → key results with progress roll-up; link work items / epics / themes to key results | `/api/v1/objectives` (+ `/key-results`, `/key-results/{id}/links`) |
| I15-S13 Release notes auto-draft | AI changelog from completed items, grouped by type; editable markdown | `POST /api/v1/po/release-notes` |
| I15-S14 Stakeholder map / communication | Targeted release/status communication built on the existing stakeholder map | `/api/v1/stakeholder-communications` (+ `/send`) |

## 3. Governance & engineering (RB-10 / RB-40)

- **Tenant isolation (RB-40 §1):** every new table carries `workspace_id`; every service resolves the
  workspace (from the project, or the entity's own `workspace_id`) and asserts membership before any
  read/write — a non-member gets a 404, never another tenant's data. Project-scoped analytics assert
  the project belongs to the acting workspace (cross-tenant guard).
- **RBAC in the service, never the controller (RB-10 §2):** controllers are thin and delegate;
  `RbacService` gates writes (`create_items` / `delete_items` / `manage_sprints`).
- **AI Control Plane (RB-40 §2):** six new capabilities registered with documented deterministic
  fallbacks; every invocation flows through `AiControlPlaneService` (scope → budget → cache → audit),
  and the UI shows the honest verdict (AI / cached / degraded / fallback) via `AiMetaBadge`.
- **Event-sourced (RB-10 §3):** state changes emit workspace-scoped events (`IMPEDIMENT_RAISED`,
  `STANDUP_COMPLETED`, `RETRO_ACTION_CAPTURED`, `IDEA_PROMOTED`, `OKR_LINKED`, …).
- **Flyway-only (V41):** one forward-only migration, all new tables plural/`snake_case`.
- **Design system (RB-30):** tokens only (no raw hex / `gray-*` / arbitrary z-index); reuses the
  existing component patterns, the three-zone shell, and the five interactive states.

## 4. Verification

- Backend: `./mvnw compile` + `test-compile` clean; all `@Tag("unit")` tests green (new pure-logic
  tests for impediment age, standup turn order, retro/idea/feedback/roadmap helpers, OKR progress,
  and the iteration-15 AI scoring/ranking/release-note helpers). Schema validates against the entities
  (`ddl-auto=validate`).
- Frontend: `eslint` 0 errors, `vitest` 114 tests green, `vite build` clean.
- Guardrails: `scripts/guardrails.sh` passes (plural tables, RBAC-not-in-controller, Flyway naming,
  tokens, no inline fetch); `generate-ai-rules.mjs --check` and `check-dod-sync.sh` in sync.

> Testcontainers integration tests (real Postgres, including the V41 migration apply) run in CI —
> Docker is not available in the authoring sandbox.
