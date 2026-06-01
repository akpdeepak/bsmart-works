# Changelog

All notable changes to bSmart Works are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) · Versioning: [SemVer](https://semver.org/spec/v2.0.0.html)

---

## [Unreleased]

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
