# Iteration 6 — Reports, Dashboards & Insights (completion)

Iteration 6 gives BCITS visibility into delivery at every layer: individual, team, project, and
organization. After this iteration, Works is self-sufficient for reporting — no separate BI
deployment needed. This is the natural Phase-1 gate for internal BCITS validation (spec `06`,
Part 7, ITER 6).

## 1. Data model

| Migration | What it adds |
|---|---|
| `V29__custom_dashboards.sql` | `dashboards` (PERSONAL/TEAM/PROJECT/ORG scope, 12-column grid), `dashboard_widgets` (type, config JSONB, grid x/y/w/h, position) |
| `V30__reports.sql` | `reports` (workspace-scoped, full-page report definitions with section JSON) |
| `V31__report_schedules.sql` | `report_schedules` (cron expression, recipients, last-run, next-run) |
| `V32__teams.sql` | `teams` + `team_members` (workspace-scoped grouping of workspace members) |
| `V33__dashboard_share_token.sql` | `share_token` on `dashboards` (UUID, embeddable read-only URL) |
| `V35__seed_second_workspace.sql` | Demo workspace WS-002 (BCITS Support Desk) with members and projects |
| `V38__seed_report_templates.sql` | 6 seeded report templates: Sprint, Release, Project Status, Weekly Digest, Monthly Executive, Customer Status |

## 2. Backend (workspace-scoped, RBAC at service boundary, events on every mutation)

### Dashboard designer (Cap J)
- **Dashboards CRUD** (`DashboardController`, `DashboardService`): personal / team / project / org
  scopes; share-token generation (UUID, `/public/{token}` — unauthenticated read-only). All queries
  workspace-scoped (`/api/v1/dashboards`).
- **Widget library (20+ types)**: SCORECARD, STATUS_BAR, ITEM_LIST, PIE, BAR, LINE, TWO_DIM,
  SPRINT_HEALTH, BURNDOWN, CUMULATIVE_FLOW, VELOCITY, MATRIX — each with a `config` JSONB that
  drives what data is fetched and how it's rendered. Widget data endpoints serve pre-aggregated
  projections (`/api/v1/dashboards/{id}/widgets/{wid}/data`).
- **Drill-down**: each data point carries a `drill_filter` BQL fragment; the client uses it to open
  an item list with that filter pre-applied — dashboards are entry points to the work, not dead ends.

### Custom report builder (Cap J)
- **Reports CRUD** (`ReportController`): full-page reports with sections (chart, table, narrative,
  KPI grid) stored as structured JSON. Template library with 6 seeded templates. Reports are
  workspace-scoped (`/api/v1/reports`).
- **Scheduled delivery** (`ReportScheduleController`): cron-based schedules with in-app and email
  delivery options; per-recipient personalization; idempotent `last_run` / `next_run` tracking
  (`/api/v1/report-schedules`).
- **Export**: PDF (HTML→PDF via headless render), Excel (Apache POI), PNG (chart-image snapshot)
  (`/api/v1/reports/{id}/export?format=pdf|xlsx|png`).
- **Embeddable dashboards**: `share_token` UUID generates a public read-only URL — iframe-embeddable
  for internal portals or customer-facing status pages. Token invalidation supported.

### Teams (Cap J)
- **Teams CRUD** (`TeamController`): workspace-scoped team entities with member roster; used as the
  "team" scope for dashboards and KPIs in later iterations (`/api/v1/teams`).

## 3. Frontend

- **Dashboard designer view**: 12-column responsive snap-to-grid drag-drop; widget resize handles;
  widget palette sidebar (categorized by type); "Start from template" guided flow on empty state.
- **Widget rendering**: each widget type has a dedicated React component; data fetched lazily per
  widget; skeleton loading while fetching.
- **Embeddable public view** (`/public/dashboard/:token`): read-only, no authentication, same widget
  renderers — suitable for iframe embedding.
- **Reports view**: report list + builder (section drag-drop); preview pane; export buttons (PDF /
  Excel / PNG); schedule configuration modal.
- **Teams view** (Management section): team list, member management, team-scoped dashboard link.
- Design tokens only; a11y-clean.

## 4. Tests

Backend: `DashboardServiceTest` (scope isolation, share token, cross-tenant — RB-40),
`ReportServiceTest` (template instantiation, schedule math), `TeamServiceTest`.
Frontend: `DashboardDesigner.test.jsx`, `WidgetData.test.js`, `ReportBuilder.test.jsx`.
Coverage gate met.

## 5. Key decisions

- **Widget data is pre-aggregated at the API.** The client never does aggregation — widgets fetch
  a ready-to-render payload. This keeps the frontend thin and enables server-side caching.
- **Share token is a UUID, not a signed JWT.** Revocable, opaque, simple to invalidate with a DB
  row delete. Token rotation is a single UPDATE.
- **Teams are workspace-scoped, not project-scoped.** A team spans multiple projects (e.g. the
  WEB Platform team works across WEB and API projects). This enables cross-project team dashboards
  in iteration 12's KPI framework.
- **6 seeded report templates (V38).** The spec calls for a template library — seeded templates
  give new workspaces immediate value without requiring admins to build reports from scratch.
