-- ============================================================
-- V38: Event store foundation — workspace dimension + append-only immutability (I01-S04)
--   RB-40 §1: every event is workspace-scoped (workspace_id on every event).
--   RB-10 §3 / Constitution Part 2: the event log is append-only and immutable — never
--   updated or deleted. Right-to-be-forgotten is satisfied by PII-vault crypto-shredding
--   (RB-40 §3), never by mutating events.
-- Forward-only. The backfill (DML UPDATE) must run BEFORE the append-only trigger is installed.
-- ============================================================

-- 1. Workspace dimension. Nullable (expand): existing rows and producers not yet threading a
--    workspace id stay valid; each domain adopts EventService.recordInWorkspace(...) as it is refactored.
ALTER TABLE events ADD COLUMN IF NOT EXISTS workspace_id VARCHAR(50);

-- 2. Backfill from derivable sources (runs before the trigger below).
--    a) Events whose aggregate IS a workspace row.
UPDATE events e SET workspace_id = e.aggregate_id
  FROM workspaces w WHERE w.id = e.aggregate_id AND e.workspace_id IS NULL;
--    b) Work-item events -> workspace via the item's project.
UPDATE events e SET workspace_id = p.workspace_id
  FROM work_items wi JOIN projects p ON p.id = wi.project_id
  WHERE wi.id = e.aggregate_id AND e.workspace_id IS NULL;
--    c) Project events -> workspace directly.
UPDATE events e SET workspace_id = p.workspace_id
  FROM projects p WHERE p.id = e.aggregate_id AND e.workspace_id IS NULL;

-- 3. Index for workspace-scoped audit / history queries (RB-10 §3 hot path).
CREATE INDEX IF NOT EXISTS idx_events_workspace_id ON events(workspace_id);

-- 4. Append-only immutability guard, enforced at the database so the audit trail cannot be
--    silently rewritten. events is insert-only across the codebase, so this blocks nothing
--    legitimate. A future migration that must backfill a new event column has to DROP this
--    trigger, backfill, then re-create it. (DDL ALTER is unaffected; only row UPDATE/DELETE.)
CREATE OR REPLACE FUNCTION events_block_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'events is append-only (RB-10 §3): % is not permitted', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS events_append_only ON events;
CREATE TRIGGER events_append_only
  BEFORE UPDATE OR DELETE ON events
  FOR EACH ROW EXECUTE FUNCTION events_block_mutation();
