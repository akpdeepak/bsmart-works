-- ============================================================
-- V19: Data-Quality Cleanup
--
-- Fixes two minor pre-existing artifacts surfaced during the
-- final validation of the spec seeding:
--   1. type casing 'TASK' -> 'Task' (frontend TYPES map keys on
--      exact 'Task'; 'TASK' renders with no icon/colour)
--   2. orphan sprint 'SPR-001' (0 work items) left from an early seed
--
-- Both idempotent — safe to re-run.
-- ============================================================

-- 1. Normalize work-item type casing to the canonical enum value.
--    (Canonical types: Epic, Story, Task, Bug, Sub-task, Incident, Service Request)
UPDATE work_items
SET type = 'Task', updated_at = NOW()
WHERE type = 'TASK';

-- 2. Remove the orphan sprint only if nothing references it (guarded).
DELETE FROM sprints
WHERE id = 'SPR-001'
  AND NOT EXISTS (
    SELECT 1 FROM work_items WHERE sprint_id = 'SPR-001'
  );

-- ============================================================
-- Post-conditions (for the record):
--   - SELECT COUNT(*) FROM work_items WHERE type='TASK'  -> 0
--   - SELECT COUNT(*) FROM sprints WHERE id='SPR-001'    -> 0
-- ============================================================
