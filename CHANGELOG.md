# Changelog

All notable changes to bSmart Works are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) · Versioning: [SemVer](https://semver.org/spec/v2.0.0.html)

---

## [Unreleased]

### Added
- KPI Framework with privacy guardrails (iteration 12, Cap L, RB-40 §1): layered metrics — personal (private, self-or-shared only), team / project / org (aggregated), and a **manager view that is API-blocked from individual drill-down** (commitment 4, enforced in `KpiService`, not the UI); default metric catalog (velocity, cycle time, completion rate, WIP, bug-escape, …), a safe formula builder (aggregate primitives only — custom metrics can never target INDIVIDUAL scope), immutable per-period snapshots, voluntary individual sharing, team-health composite, cycle-time distribution, and an AI team-health narrative routed through the control plane with a deterministic fallback — API at `/api/v1/kpi` (V41)
- Automation Engine (iteration 13, Cap C): visual "When [trigger], if [condition], then [action]" rules with a safe field-predicate condition matcher, test-mode dry-run preview (no mutation), one-click templates, AI rule suggestions, and an append-only run audit log — API at `/api/v1/automations` (V42)
- Integrations (iteration 13, Cap Q / Cap A): connector registry for Slack / GitHub / GitLab / email / calendar plus the SAML / OIDC / SCIM identity providers, with config validation and an email-inbound → work-item path; outbound signed (HMAC-SHA256) webhooks with retry + dead-letter and a delivery audit log; and the public-REST-API token foundation (hashed, prefix-indexed, scoped, revocable) — APIs at `/api/v1/integrations`, `/api/v1/webhooks`, `/api/v1/api-tokens` (V42)
- Frontend (iterations 12–13): Performance surface (layer switcher + privacy banner + the locked-by-design manager callout), Automations surface (rule builder, test/run, run log), and Integrations surface (connectors, webhooks, API tokens), each reachable from the sidebar; KPI / automation / integrations API clients through the single `apiClient`
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
