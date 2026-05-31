-- ============================================================
-- V10: Iteration 1 Completion
-- Starred items, soft delete, comment threading, workspace branding,
-- project members, project slug, event field diffs
-- ============================================================

-- ---- STARRED ITEMS ----
CREATE TABLE IF NOT EXISTS starred_items (
  user_id      VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
  work_item_id VARCHAR(50) REFERENCES work_items(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, work_item_id)
);
CREATE INDEX IF NOT EXISTS idx_starred_user ON starred_items(user_id);

-- ---- SOFT DELETE on work_items ----
ALTER TABLE work_items ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE work_items ADD COLUMN IF NOT EXISTS deleted_by  VARCHAR(50);
CREATE INDEX IF NOT EXISTS idx_work_items_deleted ON work_items(deleted_at) WHERE deleted_at IS NOT NULL;

-- ---- VERSION / OPTIMISTIC CONCURRENCY ----
ALTER TABLE work_items ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 0;

-- ---- EVENT FIELD DIFFS ----
ALTER TABLE events ADD COLUMN IF NOT EXISTS old_value TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS new_value TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS field_name VARCHAR(100);

-- ---- COMMENT THREADING ----
ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_id BIGINT REFERENCES comments(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);

-- ---- WORKSPACE BRANDING ----
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS primary_color VARCHAR(20) DEFAULT '#E94E1B';
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS description TEXT;

-- ---- PROJECT MEMBERS ----
CREATE TABLE IF NOT EXISTS project_members (
  project_id VARCHAR(50) REFERENCES projects(id) ON DELETE CASCADE,
  user_id    VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
  role       VARCHAR(50) NOT NULL DEFAULT 'MEMBER',
  added_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (project_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);

-- Seed project members from existing workspace members
INSERT INTO project_members (project_id, user_id, role)
SELECT p.id, wm.user_id,
  CASE wm.system_role WHEN 'OWNER' THEN 'LEAD' WHEN 'ADMIN' THEN 'LEAD' ELSE 'MEMBER' END
FROM projects p
CROSS JOIN workspace_members wm
WHERE wm.workspace_id = p.workspace_id
ON CONFLICT DO NOTHING;

-- ---- PROJECT SLUG ----
ALTER TABLE projects ADD COLUMN IF NOT EXISTS slug VARCHAR(100);
-- Auto-generate slugs from key_prefix (lowercase)
UPDATE projects SET slug = LOWER(key_prefix) WHERE slug IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_slug ON projects(slug) WHERE slug IS NOT NULL;

-- ---- NOTIFICATION IMPROVEMENTS ----
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS batch_key VARCHAR(200);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS batched_count INTEGER DEFAULT 1;
