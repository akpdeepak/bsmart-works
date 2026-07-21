-- V121: Phase 4 (V1.6 Foundational Reframe)

-- 1. Teams: framework, team_key, and sequence generator for work items
ALTER TABLE teams 
  ADD COLUMN IF NOT EXISTS framework VARCHAR(50) DEFAULT 'SCRUM',
  ADD COLUMN IF NOT EXISTS team_key VARCHAR(10),
  ADD COLUMN IF NOT EXISTS next_seq INT NOT NULL DEFAULT 1;

-- Seed existing teams with default keys (if any exist, generate a fallback key based on first 3 letters)
UPDATE teams SET team_key = UPPER(SUBSTRING(name FROM 1 FOR 3)) WHERE team_key IS NULL;

-- Ensure team keys are unique within a workspace
CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_workspace_key ON teams(workspace_id, team_key);


-- 3. User Preferences
CREATE TABLE IF NOT EXISTS user_preferences (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(20) DEFAULT 'system',
    notifications_enabled BOOLEAN DEFAULT TRUE,
    locale VARCHAR(20) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_user_prefs UNIQUE (user_id)
);

-- 4. Operating Model Policies
-- Allows Admins/Owners to govern the strict 5 user types: INDIVIDUAL, TEAM_LEAD, MANAGEMENT, ADMIN, OWNER
CREATE TABLE IF NOT EXISTS operating_model_policies (
    id VARCHAR(50) PRIMARY KEY,
    workspace_id VARCHAR(100) NOT NULL,
    user_type VARCHAR(50) NOT NULL,
    resource_type VARCHAR(100) NOT NULL, -- e.g. 'work_item', 'project', 'sprint', 'policy'
    action_name VARCHAR(100) NOT NULL,   -- e.g. 'create', 'update', 'delete', 'manage'
    is_allowed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_workspace_type_resource_action UNIQUE (workspace_id, user_type, resource_type, action_name)
);

CREATE INDEX IF NOT EXISTS idx_operating_model_workspace ON operating_model_policies(workspace_id);
