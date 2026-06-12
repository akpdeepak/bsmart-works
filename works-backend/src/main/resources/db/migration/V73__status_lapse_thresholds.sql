-- =====================================================================
-- Status lapse thresholds + outcome (work-item status engine, slice S1)
-- =====================================================================
-- Extends the existing workflow_status table (V21) so each status can carry a
-- time-in-status "lapse" clock and an outcome marker — the data the detail
-- surface needs to colour-code how long an item has sat in its current status.
--
--   warn_hours   — hours after which the status turns amber ("at risk"); NULL = no clock
--   breach_hours — hours after which the status turns red ("breached");   NULL = no clock
--   outcome      — NEUTRAL (default) | POSITIVE (successfully done) | NEGATIVE (closed-out:
--                  Cancelled / Won't Fix / Rejected / Materialized). All three still map to one
--                  of the three categories (TODO | IN_PROGRESS | DONE); outcome only tints the
--                  Done column so "completed" and "closed-out" read differently.
--
-- Forward-only (RB-10 §3). No data seeded here — default workflows are materialised per
-- workspace+type lazily by StatusConfigService on first read.

ALTER TABLE workflow_status ADD COLUMN IF NOT EXISTS warn_hours   NUMERIC;
ALTER TABLE workflow_status ADD COLUMN IF NOT EXISTS breach_hours NUMERIC;
ALTER TABLE workflow_status ADD COLUMN IF NOT EXISTS outcome      VARCHAR(12) NOT NULL DEFAULT 'NEUTRAL';

ALTER TABLE workflow_status
    ADD CONSTRAINT chk_workflow_status_outcome
    CHECK (outcome IN ('NEUTRAL', 'POSITIVE', 'NEGATIVE'));
