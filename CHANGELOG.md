# Changelog

All notable changes to bSmart Works are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) · Versioning: [SemVer](https://semver.org/spec/v2.0.0.html)

---

## [Unreleased]

### Added
- SLA Engine (iteration 8, Cap M): one unified, business-hours-aware SLA engine for internal delivery commitments (ready to power external customer SLAs in iteration 9) — V44 migration
  - SLA policy definition: scope by project + BQL, a referenced business-hours calendar, pause statuses, and one-or-more targets; policies start inactive (test-before-activate); 2 seeded starter templates (P0 incident, code-review turnaround)
  - Business-hours calendars: per-policy timezone + weekly working windows + holidays; a DST-safe `BusinessHoursCalculator` so SLAs pause outside business hours, on weekends and on holidays; a default Mon–Fri 09:00–18:00 IST calendar seeded per workspace
  - Multiple targets per policy: first-response, resolution and custom targets, each with start/stop statuses
  - Pause/resume triggers: clocks auto-pause on configured statuses (e.g. "Waiting on customer") and resume on exit, with consumed business-time frozen across the pause — fully audited
  - Visible countdown timers: a per-(item, target) clock with a recomputed deadline; a green/amber/red-pulsing `SlaBadge` and a live `GET /sla/work-items/{id}` countdown
  - SLA escalation: threshold-based NOTIFY / REASSIGN steps fired by a once-a-minute evaluator that also marks breaches
  - SLA reporting: met / breached / in-flight counts and compliance % per policy
  - SLA audit log: every start, pause, resume, met, breach and escalation recorded immutably in the event store
  - Bulk SLA application: preview the matching items (project + BQL scope), then apply the policy's clocks in one commit
- Iteration 15 — **Scrum Master Cockpit (Cap V)**: impediment tracker (first-class blocker with owner/severity/age/escalation), standup facilitator (sequential, time-boxed, auto-recorded, flags missing members), retro toolkit (Start-Stop-Continue / 4Ls / Mad-Sad-Glad templates, voting, anonymous mode, notes → tracked action items), mid-sprint risk panel (scope creep, stale items, unassigned work, breach predictions), sprint planning helper (rolling-velocity capacity + AI-suggested commit), sprint review prep (AI summary + demo list + metrics), and cross-sprint pattern detection (recurring impediments, estimation misses, scope-creep sources) (V41)
- Iteration 15 — **Product Owner Workspace (Cap W)**: product roadmap (themes across quarters), idea capture inbox (auto-classified by area, promotable to a story), customer feedback aggregation (sources + sentiment + AI theme clustering), OKR linkage (objectives → key results with progress roll-up and entity links), release-notes auto-draft (AI changelog from completed items), and stakeholder communication on the existing stakeholder map (V41)
- Iteration 15 — six new AI capabilities registered in the AI Control Plane (`sprint_plan`, `sprint_review`, `sprint_patterns`, `backlog_refine`, `feedback_cluster`, `release_notes`), each with a documented deterministic fallback served when AI is off, over budget, or unavailable (RB-40 §2)
- AI Control Plane (iteration 11 / iteration-10 foundation, RB-40 §2): one orchestration layer with a scope hierarchy (workspace → capability → user → in-context, most-restrictive-wins), per-workspace monthly budget (80% → cheap tier, 100% → auto-disable + fallback), response caching, model tiering, PII-redacted server-side calls, and a per-invocation audit log — management API at `/api/v1/ai` (capabilities, policies, budget, audit log), pluggable `AiProvider` with a deterministic offline default (V39)
- AI (iteration 11): conversational command bar (Cap P) — multilingual (English / Hindi / Hinglish) natural-language → editable multi-action plan, previewed and confirmed before execution, with voice input; topbar AI button that disappears entirely when AI is off
- AI (iteration 11): smart triage (Cap O), story/AC/test-case/comment/article/release-note generation (Cap O/I), chart anomaly explanation (Cap O), AI-suggested compliance rules (Cap K), SLA breach prediction (Cap M), knowledge-base RAG Q&A and article-suggestion-at-intake (Cap I/N), and smart request routing (Cap N) — each routed through the control plane with a documented deterministic fallback
- Knowledge: inline article comments (threaded, resolvable) on knowledge articles
- Knowledge: Author → Review → Publish workflow (submit / publish / request-changes / archive / restore) with reviewer + submission tracking
- Knowledge: article analytics panel — views, helpful votes, work-item citations, open comments, versions, and stale-article detection
- Knowledge: article version history adds restore-to-version and line-level version diff
- Knowledge: knowledge-base search-term analytics (most-searched terms), completing article analytics
- Search: work-item search now matches comment bodies, not just title and description
- Dashboards (iteration 6): user-built custom dashboards — create/rename/delete, a 12-column widget grid with drag-reorder and resize, and a starter widget set (scorecard, status breakdown, item list) rendering live work-item data (V29)
- Dashboards (iteration 6): widget library expansion — categorized palette adds metric scorecards (overdue, my open, high priority, blocked, completed, bugs), sprint health, sprint burndown, velocity trend (line), cumulative flow, and a status × priority matrix, layered on top of the existing config-driven chart widgets + drill-down

### Fixed
- Knowledge: article search now honours the `search` query parameter (was silently ignored)
- Knowledge: the publish action now hits a real endpoint and enforces the review gate (previously a no-op route)

---

## [0.6.0] — 2026-05-31

### Added
- Role-tuned dashboards: Developer, Scrum Master, Product Owner, Executive, Admin surfaces
- Releases module: track software releases linked to sprints and work items
- Worklog logging: time tracking per work item with worklog entries
- Enforced quality gates: JaCoCo 60% line coverage gate, ESLint enforced in CI
- Branching strategy, environment definitions, secrets management, dependency policy (CLAUDE.md §7–§12)

---

## [0.5.0] — 2026-05-20

### Added
- Cross-project dependencies: link work items across projects
- Custom fields: user-defined fields on work items per project
- Knowledge repository: docs, decisions, and runbooks linked to projects
- PM artifacts: RAID (Risks, Assumptions, Issues, Dependencies) per project
- Saved filters and starred items

---

## [0.4.0] — 2026-04-15

### Added
- Sprint board: backlog, active sprint, sprint planning and completion flows
- Work item workflows: configurable statuses and transitions per project
- Notifications: in-app notification feed with preferences

---

## [0.3.0] — 2026-03-10

### Added
- Workspace and project management: create, configure, and manage workspaces and projects
- Work items: full CRUD, assignee, status, priority, labels, attachments, comments
- User authentication: JWT-based register, login, email verification, password reset
- RBAC: role-based access control with per-project membership and permissions
- Event sourcing: append-only `events` table for audit and compliance
- Flyway schema migrations (V1–V21)

---

## [0.1.0] — 2026-02-01

### Added
- Initial project scaffold: Spring Boot 4 backend + React 19 + Vite frontend
- Design system foundation: Tailwind tokens, three-zone layout, core components (Button, Badge, Input, Collapsible, Skeleton)
- CI pipeline: guardrails, AI-rules sync, DoD sync, conventional commits, unit tests
