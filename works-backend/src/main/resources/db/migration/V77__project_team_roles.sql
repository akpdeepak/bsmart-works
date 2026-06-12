-- V76: Per-project team roles — the keystone for the role-adaptive Sprint Cockpit.
--
-- WHO a user is on a project (scrum-master, developer, product-owner, executive, admin)
-- is distinct from WHAT they may do (RBAC tier, V7). The same person can be scrum-master
-- on one project and developer on another, so the mapping is per project, not per workspace.
-- The role vocabulary is the EXISTING Today-surface role_key set (V70 / TodayLayoutService)
-- — one role language across surfaces, no parallel taxonomy (RB-20 §3).
--
-- Resolution (TeamRoleService): explicit project mapping → RBAC-tier default
-- (ADMIN+ → admin, LEAD → scrum-master, MEMBER → developer, VIEWER → executive).
CREATE TABLE project_team_members (
    id           VARCHAR(36) PRIMARY KEY,
    workspace_id VARCHAR(36) NOT NULL,
    project_id   VARCHAR(36) NOT NULL,
    user_id      VARCHAR(36) NOT NULL,
    role_key     VARCHAR(30) NOT NULL,   -- developer | scrum-master | product-owner | executive | admin
    created_by   VARCHAR(36) NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_project_team_member UNIQUE (project_id, user_id)
);
CREATE INDEX idx_project_team_workspace ON project_team_members(workspace_id);
CREATE INDEX idx_project_team_project ON project_team_members(project_id);
