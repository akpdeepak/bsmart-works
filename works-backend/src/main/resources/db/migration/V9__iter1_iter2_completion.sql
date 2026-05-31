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

-- ============================================================
-- Fix V8 seed user ID conflict
-- If deepak@bcits.com was inserted before V8 with a UUID,
-- ensure USR-DEV1/USR-DEV2 canonical IDs exist so workspace_members FK works.
-- ============================================================
INSERT INTO users (id, email, password_hash, full_name, avatar_color, timezone)
VALUES
  ('USR-DEV1', 'deepak@bcits.com',    '$2a$10$xLmr3XT7NKFkxKapUkBBsOjj3DqI3WQoUZk8LmCjxQX.4Xv2P6wGC', 'Deepak Pandey',   '#0B2F5C', 'Asia/Kolkata'),
  ('USR-DEV2', 'akpdeepak@bcits.com', '$2a$10$xLmr3XT7NKFkxKapUkBBsOjj3DqI3WQoUZk8LmCjxQX.4Xv2P6wGC', 'AKP Dev Account', '#E94E1B', 'Asia/Kolkata')
ON CONFLICT (id) DO NOTHING;

-- Remove orphaned workspace_members entries for deepak@bcits.com with wrong ID
DELETE FROM workspace_members
WHERE workspace_id = 'WS-001'
  AND user_id IN (
    SELECT id FROM users WHERE email IN ('deepak@bcits.com','akpdeepak@bcits.com') AND id NOT IN ('USR-DEV1','USR-DEV2')
  );

-- Ensure canonical workspace membership
INSERT INTO workspace_members (workspace_id, user_id, system_role, role_id)
VALUES
  ('WS-001', 'USR-DEV1', 'OWNER', 'OWNER'),
  ('WS-001', 'USR-DEV2', 'ADMIN', 'ADMIN')
ON CONFLICT DO NOTHING;
