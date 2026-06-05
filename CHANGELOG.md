# Changelog

All notable changes to bSmart Works are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) · Versioning: [SemVer](https://semver.org/spec/v2.0.0.html)

---

## [Unreleased]

### Added
- AI Orchestration + AI Control Plane (iteration 10, Cap O + Z): AI as one opt-in orchestration layer with a deterministic fallback for everything — a four-level scope hierarchy (workspace → capability → user → in-context, most-restrictive-wins), per-workspace monthly budget caps that auto-degrade to a cheaper tier at 80% and auto-disable at 100%, model-tier selection, server-side data-boundary redaction (PII/financial) before egress, a per-call audit log with CSV export and a usage dashboard, a tested fallback registry, and two surfaces — natural language → BQL (rule-based, validated by the BQL compiler, confirmation-first preview) and extractive summarization — both fully functional without a live model via a pluggable provider (V40). A live LLM plugs into the same seam behind a key.
- Service Management / Customer Portal (iteration 9, Cap N + M): external customer accounts with a separate portal auth flow (BCrypt + portal JWT, org-bound), per-customer branded portals (logo/colour/subdomain/tier), request types with dynamic per-type forms + server-side validation, agent queues (All open / Mine / Unassigned / High priority) with triage, customer-facing SLA countdowns (reusing the iteration-8 engine), a published customer knowledge base with search, CSAT rating + trends, a customer dashboard strictly scoped to the customer's own organization, and multi-tier customer SLAs (V39). The external, sellable face of Works.
- SLA Engine (iteration 8, Cap M): unified internal SLA engine — policies scoped by BQL with multiple targets (first response, resolution, custom), business-hours calendars (per-weekday windows, holidays, timezone), pause/resume on configured statuses, visible countdown timers (OK/WARN/BREACH), threshold + on-breach escalation (notify/reassign), met/breached reporting, and an append-only SLA audit log with CSV export; bulk-apply with preview (V38). One engine, ready for customer-facing SLAs in iteration 9.
- SLA frontend: `SlaCountdownBadge` ("Resolve in 2h 14m", colour-shifting, accessible) and a four-tab SLA management surface (policies, live clocks, report, audit).
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
