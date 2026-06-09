# Iteration 1 — Foundation: The Works MVP (completion)

Iteration 1 establishes the working PM tool: a BCITS team of 5-10 can adopt Works as their
daily project-management tool after this iteration, replacing Excel + email for basic tracking.
All Cap A (Auth/Identity), Cap B (Work Items), Cap E (Search), Cap F (Kanban), Cap G (Comments &
Notifications), and Cap J (My Works) specs are delivered end-to-end, workspace-isolated,
event-sourced, and tested.

## 1. Data model

| Migration | What it adds |
|---|---|
| `V1__init_schema.sql` | `workspaces`, `users`, `workspace_members` (workspace_id everywhere) |
| `V2__add_work_items.sql` | `work_items` with status, type, priority |
| `V3__core_identity_schema.sql` | Email verification tokens, refresh tokens, MFA seeds |
| `V4__iteration1_complete.sql` | `projects` (key_prefix slug), `tags`, `comments`, `notifications`, `events` (append-only), `password_reset_tokens` |
| `V6__iter1_gaps.sql` | Gaps filled after V4: worklog seed, project archive flag, member invite |
| `V7__rbac_and_tiers.sql` | `permissions`, `role_tiers` (ADMIN/LEAD/MEMBER/VIEWER), per-project `project_members` |
| `V8__seed_bsmart_works_project.sql` | Demo workspace WS-001, project WEB Portal, 10 seed users |
| `V9__iter1_iter2_completion.sql` | Activity log entries, notification preferences per user |
| `V10–V15` | Dogfood seed enrichment, email verification columns, brand identity seed |
| `V17__mfa_totp.sql` | `mfa_totp_secrets`, per-user TOTP state |
| `V18__project_slugs.sql` | `slug` column on `projects`; unique slug-based URL routing |
| `V19__data_quality_cleanup.sql` | Nullable cleanup, orphan removal |
| `V20__drop_dead_event_log.sql` | Drops the stale `event_log` table; `events` is the canonical store |

## 2. Backend (all workspace-scoped, RBAC at the service boundary, events on every mutation)

- **Authentication + Identity** (Cap A): JWT-stateless login/register (`/api/v1/auth`), email
  verification (link in email, token in DB), password reset, MFA via TOTP (seed + verify + enforce),
  workspace creation and member management.
- **Projects** (Cap B): Create / read / update / archive with unique `key_prefix`, lead assignment,
  member-based access control (`ProjectController`, `ProjectService`).
- **WorkItem CRUD** (Cap B): 7 built-in types (Epic, Story, Task, Bug, Sub-task, Incident, Service
  Request), optimistic-concurrency status transitions, rich-text `description`, assignee, due date,
  tags, `created_by` / `created_at` — all workspace-scoped (`/api/v1/work-items`).
- **Comments + @mentions** (Cap G): threaded comments with `internal_only` flag; `@mention` tokens
  parsed server-side and written to `notifications` as MENTION events.
- **Notifications** (Cap G): per-user notification feed with `is_read` toggle; daily digest
  preference; smart-batching on same-object events (`/api/v1/notifications`).
- **Full-text search** (Cap E): Postgres `to_tsvector` index over title + description + comment body;
  recent / starred boosting (`/api/v1/search`).
- **My Works / Personal home** (Cap J): per-user view — assigned open items, recent activity,
  unread mentions — over workspace-scoped data (`/api/v1/my-works`).
- **Event store** (RB-10 §3): every state change emits to the append-only `events` table via
  `EventService`; `event_log` dropped in V20.
- **RBAC** (RB-10 §2): `RbacService` enforces tier-based permissions (`manage_workspace`,
  `create_project`, `assign_work`, …) in the service layer, never the controller.

## 3. Frontend

- **App shell**: three-zone layout (persistent sidenav, topbar, scrollable content), workspace
  switcher, global search bar, notification bell, user menu.
- **Kanban board** (Cap F): column-based board mapped to default statuses; drag-drop status
  transitions (optimistic); card density modes (compact / comfortable / spacious).
- **My Works**: assigned items grouped by status, activity feed, unread notifications.
- **Project list + detail**: project header with key_prefix badge, member list, breadcrumb.
- **WorkItem detail**: rich-text description, side panel (assignee, due, priority, tags), comment
  thread with @mention highlight.
- Design tokens only; a11y-clean; skeleton loading on all list/detail views.

## 4. Tests

Backend: `AuthServiceTest`, `WorkItemServiceTest`, `ProjectServiceTest`, `CommentServiceTest`,
`NotificationServiceTest`, `RbacServiceTest` (unauthorized + cross-tenant — RB-40). Frontend:
`App.test.jsx`, `KanbanBoard.test.jsx`, `MyWorks.test.jsx`. Coverage gate met.

## 5. Key decisions

- **Event-sourced from day one.** The `events` table is the audit backbone for all future iterations;
  `event_log` was a dead duplicate and was dropped in V20.
- **JWT-stateless with TOTP MFA.** No server sessions; every request is self-contained. TOTP delivers
  MFA without a dependency on an SMS provider.
- **7 built-in WorkItem types hard-coded.** Custom types are iteration 3; the 7 defaults cover 100%
  of BCITS use cases at MVP.
- **RBAC in the service boundary.** `RbacService` is the single gate; the controller never makes
  access decisions. This pattern is established here and held across all 20 iterations.
