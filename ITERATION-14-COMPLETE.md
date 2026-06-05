# Iteration 14 — Developer Workspace + IDE Extension (completion)

Iteration 14 makes BCITS engineers' day-to-day **meaningfully better than Jira / ADO / OpenProject**:
one engineer-tuned home surface, the same surfaces in the IDE and the terminal, and the connective
tissue between code and work items. It was explicitly user-directed (build iteration 14 end-to-end).

> **Built ahead of the active iteration, by direction.** The orchestrator's active iteration is 11;
> iterations 12 (KPI) and 13 (Automation + Integrations) are not yet in the codebase. So this
> iteration ships a **self-contained code domain** (PRs + code links) rather than depending on an
> integrations layer that does not exist. When the integrations iteration lands, a git provider
> becomes a *writer* into these same tables — the read surfaces (review queue, code context,
> standup) do not change. The orchestrator §6 active-iteration pointer is intentionally left at 11.
>
> **No live model in this build.** As in iteration 11, every AI surface routes through
> `AiControlPlaneService` over the deterministic offline provider; AI-on and fallback differ in
> narrative richness and accounting, never in correctness.

## 1. What shipped (Cap U)

| Feature | Surface |
|---------|---------|
| **Developer Workspace home** | `GET /api/v1/developer-workspace` — today's work, PRs to review, blockers, focus blocks, recent activity, focus status |
| **Personal velocity (private)** | `GET /api/v1/developer-workspace/velocity` — own completion rate, cycle time, throughput. No userId param exists, so a manager can never request a report's numbers (RB-20 §4) |
| **Code review queue** | ranked in the home payload + `GET /developer-workspace/review-queue` — urgency = PR age + size + linked-item priority + reviewer expertise; deterministic order, optional AI summary |
| **Standup helper** | `POST /developer-workspace/standup` — yesterday/today/blockers drafted from work-item + git (code-link) activity; user edits before posting |
| **Code context on work item** | `GET /api/v1/code/context` — commits/branches/PRs + PR review state |
| **Inline commit linking** | `POST /api/v1/code/links` — the IDE extensions and CLI write here |
| **Code review queue source** | `GET /api/v1/code/pull-requests` |
| **Focus mode + time blocking** | `/api/v1/focus-blocks` (list/status/schedule/cancel) — private blocks; status indicator "In focus until HH:MM"; suppression wired into the notification choke point so only a P0 breaks through |
| **Definition-of-Done checklists** | `/api/v1/dod-checklists` (list/create/delete/for-work-item/toggle) — per type or epic; required items gate the move to a done-category status (409) |
| **AI: explain code · commit→update** | `POST /developer-workspace/explain-code`, `/commit-summary` |
| **VS Code extension** | `tools/vscode-extension` — sidebar (My Work / PRs), status update, inline commit linking, standup, item webview with AC + DoD + code |
| **`works` CLI** | `tools/works-cli` — login, mine, review, standup, velocity, view, transition, link, focus |
| **JetBrains plugin** | `tools/jetbrains-plugin` — buildable Gradle/Kotlin scaffold (tool window + actions + settings) for IntelliJ/PyCharm/WebStorm parity over the same API |

## 2. Data model — `V41__iteration14_developer_workspace.sql`

`pull_requests`, `pull_request_reviewers`, `code_links`, `focus_blocks`, `dod_checklists`,
`dod_checklist_items`, `dod_checklist_states`. All plural snake_case, every tenant-scoped table
carries and is indexed on `workspace_id` (RB-40 §1), forward-only. Seeds a populated walking
skeleton for WS-001. (Migration high-water mark was already V40 in the repo; §6 of the orchestrator
lags at V39 — not CI-enforced.)

## 3. Architecture & governance

- **RBAC in the service layer** (RB-10 §2): every new controller is a thin boundary; `RbacService`
  checks live in `DeveloperWorkspaceService`, `FocusModeService`, `CodeContextService`,
  `DodChecklistService`.
- **Workspace-scoped queries** (RB-40 §1): every finder/JDBC read is constrained by `workspace_id`;
  cross-workspace PR references in the review queue and cross-tenant checklist deletes are rejected.
- **Privacy by construction**: personal velocity has no userId parameter; focus blocks are
  per-owner (another user's id → 404).
- **AI Control Plane** (RB-40 §2): four new capabilities (`standup`, `review_rank`, `code_explain`,
  `commit_summary`) registered with default tiers and **documented deterministic fallbacks** — the
  fallback is the computed draft/ranking, so the feature is whole with AI off or over budget.
- **One design system** (RB-30): the web surface uses tokens only, the five interactive states, and
  is WCAG-AA; it passes ESLint clean (the App.jsx monolith stays under its file-level disable).

## 4. Tests

Backend (`@Tag("unit")`, no DB): `FocusModeServiceTest` (suppression rule, P0 break-through,
ownership 404), `DodChecklistServiceTest` (done-status rule, resolution gate, cross-tenant 404,
admin gate), `CodeContextServiceTest` (ref extraction, RBAC/kind guards), `DeveloperWorkspaceServiceTest`
(urgency ranking, completion rate, commit parse, standup render). Existing `WorkItemController` access
tests updated for the new DoD dependency. **285 backend unit tests green.**

Frontend: `developer-workspace.test.jsx` (renders home surfaces, private velocity badge, focus
indicator, standup draft + edit, error/retry state). **117 frontend tests green; build passes.**

CLI: `works.test.js` (arg parser). VS Code `renderItem()` exported for testing.

## 5. Not in scope (logged)

- A hosted LLM provider (the iteration-11 `AiProvider` seam is unchanged and ready).
- Full JetBrains plugin packaging (typed JSON models, Marketplace publish) — the scaffold builds
  with `./gradlew runIde`; the web + VS Code + CLI clients are the fully-built iteration-14 clients.
- Calendar provider sync for time blocking (the `source=CALENDAR` field is present; the connector
  is integrations-iteration work).
- Surfacing focus-mode P0 awareness in every existing notification producer — the choke point honours
  it now; producers pass `p0=true` as they adopt it (incremental, like `EventService.recordInWorkspace`).
