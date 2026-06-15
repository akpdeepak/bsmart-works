-- Add display_order to saved_views for user-defined ordering (WI-15).
-- New views default to 0; UI reorder sends PUT with updated display_order.
ALTER TABLE saved_views ADD COLUMN IF NOT EXISTS display_order INT NOT NULL DEFAULT 0;
