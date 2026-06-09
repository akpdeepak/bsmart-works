# Iteration 2 — Sprints: Scrum + Reports (completion)

Iteration 2 adds Scrum-native sprint planning: after this iteration, BCITS Scrum teams can
fully replace sprint-planning Excel and standup notes with Works. Sprint reviews have a live,
drillable report auto-generated from the event log.

## 1. Data model

| Migration | What it adds |
|---|---|
| `V5__iteration2_sprints.sql` | `sprints` (PLANNING → ACTIVE → COMPLETED lifecycle), `backlog_order` + `sprint_id` + `story_points` + `priority` on `work_items`, `work_item_links` (BLOCKS/BLOCKED_BY/RELATES_TO/DUPLICATES/PARENT/CHILD), `attachments` (storage_path + mime_type + size), `saved_filters` (workspace-scoped, shareable) |
| `V9__iter1_iter2_completion.sql` | Swimlane seed data, sprint velocity snapshots |

## 2. Backend (workspace-scoped, RBAC at service boundary, events on every mutation)

- **Backlog** (Cap F): ranked backlog with `backlog_order` drag-drop reordering; capacity bar from
  `story_points` sum vs sprint `capacity`; BQL-based refinement view (`/api/v1/backlog`).
- **Sprints** (Cap F): Plan → Start → Active → Complete lifecycle with `start_date`/`end_date`/`goal`
  and capacity tracking (`SprintController`, `SprintService`); sprint `COMPLETED` events write to
  `events`; sprint items unlinked gracefully on complete.
- **WorkItem links** (Cap B): 6 link types (BLOCKS, BLOCKED_BY, RELATES_TO, DUPLICATES, PARENT,
  CHILD) enforced with referential integrity; `work_item_links` unique on `(source_id, target_id,
  link_type)` (`/api/v1/work-items/{id}/links`).
- **Swimlanes + quick filters** (Cap F): server-side grouping by Epic / assignee / label; one-click
  chip filters (My items, Blockers, High priority) compiled to BQL at the query layer.
- **Sprint reports** (Cap J): burndown (ideal vs actual), velocity (committed vs delivered by sprint),
  commitment accuracy, scope-change timeline, item outcomes — all computed from the `events` table
  without a separate analytics store (`/api/v1/sprints/{id}/reports`).
- **Saved filters** (Cap E): named, persistent, shareable filters with workspace-scoped ownership;
  subscribe-for-updates pattern; stored as `filter_json` (`/api/v1/saved-filters`).
- **Attachments** (Cap G): file upload with `storage_path`, `mime_type`, `file_size`;
  configurable size limit; access scoped to work-item permissions (`/api/v1/work-items/{id}/attachments`).
- **Activity log per work item** (Cap G): chronological projection over `events` for a specific
  `aggregate_id`; filterable by event type (`/api/v1/work-items/{id}/activity`).

## 3. Frontend

- **Sprint board**: sprint header (goal, timeline, capacity bar) above the Kanban columns reused
  from iteration 1 — same visual language, same design tokens.
- **Backlog view**: drag-drop ordered list with rank, story-point badge, assignee, sprint assignment;
  capacity bar at the sprint header.
- **Swimlanes**: optional toggle (not always-on); groups board columns by Epic / assignee / label.
- **Quick-filter chips**: My items · Blockers · High priority — one-click, client-side.
- **Sprint reports view**: burndown line chart, velocity bar chart, commitment accuracy scorecard,
  scope-change timeline — using the design-token chart palette.
- **Attachments panel**: file list on work item detail with preview (image / PDF) and download.
- **Activity log panel**: chronological diff-list on work item detail, filterable by event type.

## 4. Tests

Backend: `SprintServiceTest` (lifecycle + capacity), `BacklogServiceTest` (reorder),
`WorkItemLinkServiceTest` (link types + cross-tenant — RB-40), `AttachmentServiceTest`,
`SavedFilterServiceTest`, `SprintReportServiceTest` (burndown math). Frontend:
`SprintBoard.test.jsx`, `SprintReports.test.jsx`. Coverage gate met.

## 5. Key decisions

- **Sprint reports from the event log.** No separate analytics table — burndown and velocity are
  computed from `events` at query time. This keeps the architecture simple at iteration 2 and
  proves the event store pays dividends immediately.
- **Swimlanes as a toggle, not default.** Information density is a feature, but swimlanes by default
  overwhelm small teams. Toggle state is persisted per user as a workspace preference.
- **`backlog_order` as an integer column.** Simple and fast; gap-and-shift rebalancing runs in a
  single UPDATE. A fractional-ordering scheme would be premature at this scale.
- **Attachment storage path is opaque.** The column holds whatever the storage backend returns
  (local path today; S3 object key in production). The controller never constructs paths.
