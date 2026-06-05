# Changelog

All notable changes to bSmart Works are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) · Versioning: [SemVer](https://semver.org/spec/v2.0.0.html)

---

## [Unreleased]

### Added
- Developer Workspace (iteration 14, Cap U): the engineer home surface — today's work, urgency-ranked PRs to review, blockers, focus blocks, recent activity — plus **private** personal velocity (completion rate, cycle time, throughput; never visible to a manager), at `/api/v1/developer-workspace` (V41)
- Code review queue + code context (iteration 14, Cap U): pull-request store with reviewers, and commit/branch/PR links on a work item (`/api/v1/code/*`); the IDE extensions and CLI write links via "inline commit linking"
- Focus mode + time blocking (iteration 14, Cap U): private, calendar-style focus blocks (`/api/v1/focus-blocks`) with a status indicator ("In focus until HH:MM"); during a block all non-urgent notifications are held at the notification choke point and only a P0 incident breaks through
- Definition-of-Done checklists (iteration 14, Cap U): per-type or per-epic checklists (`/api/v1/dod-checklists`) whose required items gate a work item's move into a done-category status (409 otherwise)
- AI surfaces (iteration 14, Cap U): standup helper (drafts yesterday/today/blockers from work + git activity, edited before posting), code-review-queue ranking, explain-linked-code, and propose-item-update-from-commit — each routed through the AI Control Plane with a documented deterministic fallback
- Clients (iteration 14, Cap U): `works` terminal CLI (login, mine, review, standup, velocity, view, transition, link, focus), a VS Code extension (sidebar, status updates, inline commit linking, standup, DoD/code webview), and a JetBrains plugin scaffold — all over the same `/api/v1` surface
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
