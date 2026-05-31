-- ============================================================
-- V7: RBAC — Roles, Permissions, Tier Access Control
-- ============================================================

-- 1. System roles table (defines available roles)
CREATE TABLE roles (
    id          VARCHAR(20) PRIMARY KEY,
    name        VARCHAR(50) NOT NULL,
    description TEXT,
    tier        INT NOT NULL DEFAULT 1  -- 1=VIEWER 2=MEMBER 3=LEAD 4=ADMIN 5=OWNER
);

INSERT INTO roles (id, name, description, tier) VALUES
    ('VIEWER',  'Viewer',       'Can view all content but cannot create or edit',              1),
    ('MEMBER',  'Member',       'Can create and edit own work items, add comments',            2),
    ('LEAD',    'Team Lead',    'Can manage team members, edit any item in their projects',    3),
    ('ADMIN',   'Admin',        'Full workspace management except billing and ownership',      4),
    ('OWNER',   'Owner',        'Full control including workspace deletion and billing',       5);

-- 2. Permissions table
CREATE TABLE permissions (
    id          VARCHAR(50) PRIMARY KEY,
    description TEXT,
    min_tier    INT NOT NULL  -- minimum tier required
);

INSERT INTO permissions (id, description, min_tier) VALUES
    ('view_items',          'View work items, projects, sprints',                1),
    ('view_reports',        'View sprint reports and dashboards',                1),
    ('create_items',        'Create work items',                                 2),
    ('edit_own_items',      'Edit work items you created or are assigned to',    2),
    ('comment',             'Add comments on work items',                        2),
    ('manage_sprints',      'Create and manage sprints',                         3),
    ('edit_any_item',       'Edit any work item in the workspace',               3),
    ('delete_items',        'Delete work items',                                 3),
    ('manage_projects',     'Create, edit, archive projects',                    3),
    ('invite_members',      'Invite users to the workspace',                     4),
    ('remove_members',      'Remove users from the workspace',                   4),
    ('manage_roles',        'Change member roles',                               4),
    ('manage_workspace',    'Edit workspace settings and integrations',          4),
    ('delete_workspace',    'Delete the workspace permanently',                  5);

-- 3. Update workspace_members to use role_id linked to roles table
ALTER TABLE workspace_members
    ADD COLUMN IF NOT EXISTS role_id VARCHAR(20) REFERENCES roles(id) DEFAULT 'MEMBER';

-- Migrate existing role column values
UPDATE workspace_members SET role_id =
    CASE system_role
        WHEN 'ADMIN'  THEN 'ADMIN'
        WHEN 'LEAD'   THEN 'LEAD'
        WHEN 'VIEWER' THEN 'VIEWER'
        WHEN 'OWNER'  THEN 'OWNER'
        ELSE 'MEMBER'
    END;

-- 4. User profile extensions
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS avatar_color VARCHAR(7)  DEFAULT '#0B2F5C',
    ADD COLUMN IF NOT EXISTS timezone     VARCHAR(50) DEFAULT 'Asia/Kolkata',
    ADD COLUMN IF NOT EXISTS locale       VARCHAR(10) DEFAULT 'en-IN',
    ADD COLUMN IF NOT EXISTS is_active    BOOLEAN     NOT NULL DEFAULT TRUE;

-- 5. Audit log for role changes
CREATE TABLE IF NOT EXISTS role_audit_log (
    id          BIGSERIAL PRIMARY KEY,
    workspace_id VARCHAR(50) NOT NULL,
    target_user  VARCHAR(50) NOT NULL,
    changed_by   VARCHAR(50) NOT NULL,
    old_role     VARCHAR(20),
    new_role     VARCHAR(20),
    changed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Update USR-001 to OWNER
UPDATE workspace_members SET role_id = 'OWNER', system_role = 'OWNER' WHERE user_id = 'USR-001';
