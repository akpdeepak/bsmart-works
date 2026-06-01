# Iteration 5 — Knowledge Repository + Versions (completion)

Iteration 5 shipped the bulk of the knowledge repository earlier (V24 spaces/articles/versions/links,
V25 releases + worklogs). This change closes the three remaining spec gaps so the iteration is
feature-complete.

## What was built (closing gaps)

1. **Inline article comments** — `article_comments` table (threaded via `parent_comment_id`,
   optional `section_anchor` for inline-on-section discussion, `resolved` flag). Endpoints at
   `/api/v1/articles/{articleId}/comments` (list / add / resolve-toggle / delete). Each mutation
   emits an event (`ARTICLE_COMMENT_ADDED` / `_RESOLVED` / `_REOPENED`).

2. **Publishing workflow** — Author → Review → Publish, enforced server-side. New endpoints on
   `ArticleController`: `PUT /{id}/submit`, `/publish`, `/reject`, `/archive`, `/restore`.
   Transitions are validated by `ArticleWorkflowService` (pure state machine):
   `DRAFT → IN_REVIEW → PUBLISHED → ARCHIVED`, with reject (→DRAFT) and restore (→DRAFT).
   **Publish is only reachable from `IN_REVIEW`** — the required-approval gate the spec calls for.
   `reviewer_id` + `submitted_at` columns track who/when. Invalid transitions return
   `400 INVALID_TRANSITION`. The generic `PUT /{id}` no longer changes status, so the gate can't
   be bypassed.

3. **Article analytics** — `GET /{id}/analytics` returns views, helpful votes, work-item
   citations, open-comment count, version count, days-since-update, and a `stale` flag.
   Staleness is derived by `ArticleAnalyticsService` (PUBLISHED + untouched > 90 days).

## UI

- Article detail gains a panel switcher: **History · Comments · Analytics** (right side-rail).
- Header shows a single status-aware primary action: Submit for review (DRAFT) → Publish
  (IN_REVIEW, plus "Request changes") → Archive (PUBLISHED) → Restore (ARCHIVED).
- Comments panel: threaded list with resolve/reopen + delete and an add-comment composer.
- Analytics panel: metric tiles + a stale warning when applicable.

## Tests

- `ArticleWorkflowServiceTest` (10) — every valid transition + rejected/unknown actions.
- `ArticleAnalyticsServiceTest` (7) — stale/not-stale by status and age, day math, null-safety.

## Not in scope (logged debt)

The richer **block-based editor** (Mermaid diagrams, embeds, structured blocks) remains the one
partial item from the iteration-5 spec. The existing WYSIWYG editor covers core authoring; the
block editor is a sizeable standalone task tracked separately rather than bundled here.

## Key decisions

- Workflow rules live in a pure `ArticleWorkflowService` (no I/O) so the state machine is unit-
  testable and the controller stays thin.
- `article_comments` is its own table (not the work-item `comments` table) to keep the knowledge
  domain cohesive (CLAUDE.md §21.1).
- Status changes are funnelled exclusively through the workflow endpoints; content edits and
  status transitions are deliberately separate operations.
