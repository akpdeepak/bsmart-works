-- =====================================================================
-- status_changed_at on work_items (work-item status engine, slice S4)
-- =====================================================================
-- The timestamp the work item entered its CURRENT status. Drives the colour-coded
-- "time in status" (lapse) indicator on cards and the detail surface without an N+1
-- over the event log: each row carries its own current-status entry time.
--
-- Maintained going forward by WorkItemController (set on create, and on every status
-- change). Backfilled here from the latest STATUS_CHANGED event, falling back to the
-- item's creation time. Forward-only (RB-10 §3).

ALTER TABLE work_items ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ;

UPDATE work_items wi
SET status_changed_at = COALESCE(
        (SELECT MAX(e.occurred_at) FROM events e
          WHERE e.aggregate_id = wi.id AND e.event_type = 'STATUS_CHANGED'),
        wi.created_at)
WHERE wi.status_changed_at IS NULL;
