-- ============================================================
-- V9: Iteration 1 & 2 Completion
-- Adds missing columns for parent/child, priority defaults,
-- attachment metadata, and performance improvements
-- ============================================================

-- Parent/child relationship on work items
ALTER TABLE work_items ADD COLUMN IF NOT EXISTS parent_id VARCHAR(50) REFERENCES work_items(id) ON DELETE SET NULL;

-- Ensure priority column exists with proper default
ALTER TABLE work_items ALTER COLUMN priority SET DEFAULT 'MEDIUM';

-- Ensure story_points has a default
ALTER TABLE work_items ALTER COLUMN story_points SET DEFAULT 0;

-- Add indexes for parent_id lookups
CREATE INDEX IF NOT EXISTS idx_work_items_parent_id ON work_items(parent_id);

-- Add content_type and download_url to attachments for preview support
ALTER TABLE attachments ADD COLUMN IF NOT EXISTS content_preview TEXT;

-- Add event_type index for filtered activity queries
CREATE INDEX IF NOT EXISTS idx_events_aggregate_event ON events(aggregate_id, event_type);

-- Saved filters: ensure is_shared column exists
ALTER TABLE saved_filters ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false;
ALTER TABLE saved_filters ADD COLUMN IF NOT EXISTS shared_by VARCHAR(50);

-- Work item links: ensure target_title is precomputed for performance
ALTER TABLE work_item_links ADD COLUMN IF NOT EXISTS target_title VARCHAR(500);
ALTER TABLE work_item_links ADD COLUMN IF NOT EXISTS source_title VARCHAR(500);
