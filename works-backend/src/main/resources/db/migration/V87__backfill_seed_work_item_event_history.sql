-- V87 — Backfill event history for seed/legacy work items.
--
-- Why: 356 of the work items were bulk-inserted by earlier seed migrations directly into
-- `work_items` WITHOUT writing to the append-only `events` log. Two surfaces are projected
-- purely from that log, so for those items they appear broken:
--   • the Activity feed (GET /work-items/{id}/activity)            → "No activity recorded yet"
--   • the status-timeline flow metrics (StatusDurationService)     → lead time 0s, cycle time —,
--     with the item's whole lifetime collapsed into its current status.
-- App-created items already emit these events (WorkItemController + EventService), so only the
-- eventless seed rows need a history. This makes both surfaces accurate without any code change.
--
-- What: synthesize a believable lifecycle from the data we actually have — the real `created_at`,
-- the item's real CURRENT `status`, and (for placement) its real active window `[created_at, updated_at]`:
--   Todo        → WORK_ITEM_CREATED only.  (Never started: lead accrues in To Do, cycle stays "—".)
--   In Progress → CREATED, then STATUS_CHANGED Todo → In Progress.
--   Done        → CREATED, then Todo → In Progress, then In Progress → Done.
-- Transition timestamps are placed at fixed fractions of each item's real [created_at, updated_at]
-- window, so they are always ordered and in the past (no fabricated future events). The fractions
-- are perturbed per-item (md5 of the id) so the demo data looks varied, and the In-Progress fraction
-- is always strictly before the Done fraction so lead ≥ cycle ≥ 0 holds for every item.
--
-- Safety / honesty:
--   • Only touches items with NO events at all (NOT EXISTS) — never fabricates over the real history
--     of app-created items. Statements 2 & 3 are gated on the V87 creation marker, so they too only
--     affect rows seeded by statement 1.
--   • Tenant-scoped by construction: workspace_id is resolved via an INNER JOIN to projects, so a
--     work item whose project_id does not resolve is skipped rather than inserted with a NULL
--     workspace_id — every synthesized event carries a workspace (RB-40 §1). (Mirrors V40's backfill.)
--   • Every synthesized event carries "backfill":"V87" in its payload, so it is auditable and, if
--     ever needed, removable. NOTE: the events table has an append-only trigger (V40), so a plain
--     DELETE is blocked; reversal requires temporarily lifting the guard:
--         ALTER TABLE events DISABLE TRIGGER events_append_only;
--         DELETE FROM events WHERE payload LIKE '%"backfill":"V87"%';
--         ALTER TABLE events ENABLE TRIGGER events_append_only;
--   • Forward-only and naturally idempotent via the NOT EXISTS / marker guards.
--   • Status names ('Todo' | 'In Progress' | 'Done') match the seed data and the categories the
--     projection resolves (TODO | IN_PROGRESS | DONE) via StatusDurationController's name heuristic,
--     so the bar, legend and lead/cycle compute correctly. (A regression test pins this mapping.)

-- 1) Creation event for every eventless, non-deleted work item. Factual: it WAS created then, by created_by.
INSERT INTO events (aggregate_id, workspace_id, event_type, actor_id, payload, field_name, old_value, new_value, occurred_at)
SELECT w.id,
       p.workspace_id,
       'WORK_ITEM_CREATED',
       w.created_by,
       -- Compact, escape-safe JSON matching the app's Jackson output (to_json quotes + escapes each value).
       '{"title":' || to_json(w.title)::text || ',"type":' || to_json(w.type)::text || ',"backfill":"V87"}',
       NULL, NULL, NULL,
       w.created_at
FROM work_items w
JOIN projects p ON p.id = w.project_id   -- INNER JOIN: a row with no resolvable workspace is skipped, never inserted with workspace_id=NULL (RB-40 §1; matches V40's backfill)
WHERE w.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM events e WHERE e.aggregate_id = w.id);

-- 2) Todo → In Progress, for items that have reached In Progress or Done (both passed through it).
INSERT INTO events (aggregate_id, workspace_id, event_type, actor_id, payload, field_name, old_value, new_value, occurred_at)
SELECT s.id,
       s.workspace_id,
       'STATUS_CHANGED',
       COALESCE(s.assignee_id, s.created_by),
       '{"field":"status","from":"Todo","to":"In Progress","backfill":"V87"}',
       'status', 'Todo', 'In Progress',
       s.created_at + (s.e_end - s.created_at) * s.f_start
FROM (
    SELECT w.id, w.created_by, w.assignee_id, w.created_at, p.workspace_id,
           GREATEST(w.created_at + INTERVAL '1 hour',
                    LEAST(now() - INTERVAL '1 minute',
                          GREATEST(COALESCE(w.updated_at, w.created_at), w.created_at + INTERVAL '2 hours'))) AS e_end,
           0.20 + (get_byte(decode(md5(w.id), 'hex'), 0) % 25) / 100.0 AS f_start  -- 0.20 .. 0.44
    FROM work_items w
    JOIN projects p ON p.id = w.project_id   -- INNER JOIN: never synthesize a tenant-less event (RB-40 §1)
    WHERE w.deleted_at IS NULL
      AND w.status IN ('In Progress', 'Done')
      AND EXISTS (SELECT 1 FROM events ec WHERE ec.aggregate_id = w.id
                    AND ec.event_type = 'WORK_ITEM_CREATED' AND ec.payload LIKE '%"backfill":"V87"%')
      AND NOT EXISTS (SELECT 1 FROM events es WHERE es.aggregate_id = w.id AND es.event_type = 'STATUS_CHANGED')
) s;

-- 3) In Progress → Done, for items currently Done. Placed strictly after the In-Progress transition.
INSERT INTO events (aggregate_id, workspace_id, event_type, actor_id, payload, field_name, old_value, new_value, occurred_at)
SELECT s.id,
       s.workspace_id,
       'STATUS_CHANGED',
       COALESCE(s.assignee_id, s.created_by),
       '{"field":"status","from":"In Progress","to":"Done","backfill":"V87"}',
       'status', 'In Progress', 'Done',
       s.created_at + (s.e_end - s.created_at) * s.f_done
FROM (
    SELECT w.id, w.created_by, w.assignee_id, w.created_at, p.workspace_id,
           GREATEST(w.created_at + INTERVAL '1 hour',
                    LEAST(now() - INTERVAL '1 minute',
                          GREATEST(COALESCE(w.updated_at, w.created_at), w.created_at + INTERVAL '2 hours'))) AS e_end,
           0.58 + (get_byte(decode(md5(w.id), 'hex'), 1) % 30) / 100.0 AS f_done  -- 0.58 .. 0.87
    FROM work_items w
    JOIN projects p ON p.id = w.project_id   -- INNER JOIN: never synthesize a tenant-less event (RB-40 §1)
    WHERE w.deleted_at IS NULL
      AND w.status = 'Done'
      AND EXISTS (SELECT 1 FROM events ec WHERE ec.aggregate_id = w.id
                    AND ec.event_type = 'WORK_ITEM_CREATED' AND ec.payload LIKE '%"backfill":"V87"%')
      AND NOT EXISTS (SELECT 1 FROM events es WHERE es.aggregate_id = w.id
                        AND es.event_type = 'STATUS_CHANGED' AND es.new_value = 'Done')
) s;
