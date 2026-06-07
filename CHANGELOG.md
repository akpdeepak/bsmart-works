# Changelog

All notable changes to bSmart Works are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) · Versioning: [SemVer](https://semver.org/spec/v2.0.0.html)

---

## [Unreleased]

### Added
- Iteration 16 — **Leadership Console (Cap X)**: cross-team rollup dashboard (workspace + per-project + per-team delivery, permission-aware), resource-allocation view (open work per member with over/under-allocation flags + rebalancing suggestions), risk portfolio (RAID risks ranked by impact × probability), customer-health dashboard (per-account composite of open/overdue requests, CSAT and churn risk), strategic-theme tracker (roadmap themes with OKR-derived progress), and the strategy-to-execution map (objectives → key results → linked work items) — read-only aggregations over existing data at `/api/v1/leadership/*` (V50)
- Iteration 16 — **AI executive briefing + board-deck auto-draft (Cap X)**: a schedulable, editable briefing card whose narrative is (re)generated from the live rollup / customer-health / risk figures, and a quarterly board-deck slide outline — both routed through the AI Control Plane with a documented deterministic fallback; APIs at `/api/v1/executive-briefings` and `/api/v1/leadership/board-deck`
- Iteration 16 — **Admin Operations Center (Cap Y)**: workspace-health monitor (members, storage, events, integrations, AI budget), AI cost dashboard (spend vs cap, by capability / user / tier, threshold alerts), integration-health dashboard (connection status + failed-delivery retry/replay), and license/seat management (active/available seats, cost, utilization, renewal alerts) — admin-gated at `/api/v1/admin/*` (V50)
- Iteration 16 — **User lifecycle automation (Cap Y)**: onboarding/offboarding playbooks with role-aware steps; starting a run snapshots the steps into an audited checklist that auto-completes the run when every step is done — `/api/v1/onboarding/*` (V50)
- Iteration 16 — **Audit log explorer, access review & compliance evidence (Cap Y)**: a filterable, paginated, allow-listed browse of the append-only event log with saved queries (`/api/v1/audit-log`); periodic access review surfacing inactive members with tenant-safe bulk-deactivation (`/api/v1/access-reviews`); and on-demand SOC 2 / ISO 27001 evidence packages assembled from real controls — MFA adoption, immutable audit trail, AI governance, access reviews, compliance engine, SLA posture (`/api/v1/evidence-packages`) (V50)
- Iteration 16 — two new AI capabilities registered in the AI Control Plane (`exec_briefing`, `board_deck`), each with a documented deterministic fallback (RB-40 §2); two new self-contained frontend surfaces (Leadership Console, Admin Ops) reachable from the sidebar, with `leadership` / `adminOps` API clients through the single `apiClient`. All five role surfaces are now live (Developer / SM / PO / Leadership / Admin).
- Iteration 20 — **Advanced AI (Cap O)**: workspace-defined **custom assistants** (named personas, e.g. a Compliance Assistant) with persona- and memory-grounded chat; **multi-step AI agents** that plan a goal into ordered capability steps and run them as an audited `AiAgentRun` (read-only suggestion artifact); **AI memory/context** remembered across sessions per (workspace, user); and **conversational dashboards** (natural language → structured widget spec) — all at `/api/v1/ai/{assistants,agents,memory,conversational-dashboards}`, every model call routed through the AI Control Plane with a documented deterministic fallback (V51)
- Iteration 20 — **App Marketplace foundation + Developer Portal (Cap R)**: a global, browsable extension catalogue with per-workspace installs and server-side **permission scoping** (granted scopes ⊆ requested), plus a developer-portal SDK manifest + sandbox credentials — at `/api/v1/marketplace` and `/api/v1/developer-portal` (V52)
- Iteration 20 — **Advanced Knowledge (Cap I)**: workspace-scoped **document templates** (markdown skeletons with placeholders), **multi-author collaboration** (article author/co-author/reviewer roster), and AI **structured-data extraction** (deterministic regex/keyword fallback) — at `/api/v1/knowledge/{templates,articles/{id}/authors,extract}` (V53)
- Iteration 20 — **Customer chat support (Cap N)**: real-time portal chat with **AI tier-1 auto-response and human escalation** (canned holding reply + auto-escalate on fallback or on an explicit human request), an agent **Support Inbox**, and a customer-portal chat widget — at `/api/v1/support-chat` (+ `/portal`) (V54)
- Iteration 20 — **Localization (Cap A)**: a dependency-free i18n layer with a **10-language** catalogue (English, Hindi, Spanish, French, German, Portuguese, Japanese, Mandarin, Arabic, Korean), English fallback, **RTL** support (Arabic), a persisted per-user locale preference (`PUT /api/v1/users/me/locale`, V55), and a top-bar language switcher; the primary navigation is translated end to end
- Iteration 20 — **Performance hardening (Cap S)** and **final security hardening (Cap T)**: composite indexes for the hottest multi-column query patterns (V55), a documented load-test plan against the RB-40 §5 NFR budgets (`PERFORMANCE.md`), a security disclosure / bug-bounty policy (`SECURITY.md`), and a WCAG 2.2 AA accessibility audit (`ACCESSIBILITY.md`)
- Iteration 20 — five new AI capabilities registered in the AI Control Plane (`agent_orchestration`, `custom_assistant`, `conversational_dashboard`, `structured_extraction`, `support_chat`), each with a documented deterministic fallback (RB-40 §2)
- Iteration 20 — frontend: **AI Studio** (assistants chat · agents · ask), Marketplace, Developer Portal, Advanced-Knowledge templates + extraction, and the agent Support Inbox views, wired into the sidebar and router
- Developer Workspace (iteration 14, Cap U): the engineer home surface — today's work, urgency-ranked PRs to review, blockers, focus blocks, recent activity — plus **private** personal velocity (completion rate, cycle time, throughput; never visible to a manager), at `/api/v1/developer-workspace` (V41)
- Code review queue + code context (iteration 14, Cap U): pull-request store with reviewers, and commit/branch/PR links on a work item (`/api/v1/code/*`); the IDE extensions and CLI write links via "inline commit linking"
- Focus mode + time blocking (iteration 14, Cap U): private, calendar-style focus blocks (`/api/v1/focus-blocks`) with a status indicator ("In focus until HH:MM"); during a block all non-urgent notifications are held at the notification choke point and only a P0 incident breaks through
- Definition-of-Done checklists (iteration 14, Cap U): per-type or per-epic checklists (`/api/v1/dod-checklists`) whose required items gate a work item's move into a done-category status (409 otherwise)
- AI surfaces (iteration 14, Cap U): standup helper (drafts yesterday/today/blockers from work + git activity, edited before posting), code-review-queue ranking, explain-linked-code, and propose-item-update-from-commit — each routed through the AI Control Plane with a documented deterministic fallback
- Clients (iteration 14, Cap U): `works` terminal CLI (login, mine, review, standup, velocity, view, transition, link, focus), a VS Code extension (sidebar, status updates, inline commit linking, standup, DoD/code webview), and a JetBrains plugin scaffold — all over the same `/api/v1` surface
- SLA Engine (iteration 8, Cap M): unified internal SLA engine — policies scoped by BQL with multiple targets (first response, resolution, custom), business-hours calendars (per-weekday windows, holidays, timezone), pause/resume on configured statuses, visible countdown timers (OK/WARN/BREACH), threshold + on-breach escalation (notify/reassign), met/breached reporting, an append-only SLA audit log with CSV export, and bulk apply with preview (V44). "One engine, two contexts" — ready for the customer-facing tiers already on main.
- KPI Framework with privacy guardrails (iteration 12, Cap L, RB-40 §1): layered metrics — personal (private, self-or-shared only), team / project / org (aggregated), and a **manager view that is API-blocked from individual drill-down** (commitment 4, enforced in `KpiService`, not the UI); default metric catalog (velocity, cycle time, completion rate, WIP, bug-escape, …), a safe formula builder (aggregate primitives only — custom metrics can never target INDIVIDUAL scope), immutable per-period snapshots, voluntary individual sharing, team-health composite, cycle-time distribution, and an AI team-health narrative routed through the control plane with a deterministic fallback — API at `/api/v1/kpi` (V44)
- Automation Engine (iteration 13, Cap C): visual "When [trigger], if [condition], then [action]" rules with a safe field-predicate condition matcher, test-mode dry-run preview (no mutation), one-click templates, AI rule suggestions, and an append-only run audit log — API at `/api/v1/automations` (V45)
- Integrations (iteration 13, Cap Q / Cap A): connector registry for Slack / GitHub / GitLab / email / calendar plus the SAML / OIDC / SCIM identity providers, with config validation and an email-inbound → work-item path; outbound signed (HMAC-SHA256) webhooks with retry + dead-letter and a delivery audit log; and the public-REST-API token foundation (hashed, prefix-indexed, scoped, revocable) — APIs at `/api/v1/integrations`, `/api/v1/webhooks`, `/api/v1/api-tokens` (V45)
- Frontend (iterations 12–13): Performance surface (layer switcher + privacy banner + the locked-by-design manager callout), Automations surface (rule builder, test/run, run log), and Integrations surface (connectors, webhooks, API tokens), each reachable from the sidebar; KPI / automation / integrations API clients through the single `apiClient`
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
