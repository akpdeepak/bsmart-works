-- V32: Iteration 6 — teams. A team is a named, configurable set of projects within a
-- workspace. It backs TEAM-scoped dashboard/report aggregation (aggregate across the
-- team's projects rather than only the currently-loaded one). project_ids is a JSONB
-- array of project ids, matching the codebase's JSONB-collection convention (reports.sections,
-- dashboard widget config).

CREATE TABLE teams (
    id           VARCHAR(50)  PRIMARY KEY,
    workspace_id VARCHAR(100),
    name         TEXT         NOT NULL,
    description  TEXT,
    project_ids  JSONB        NOT NULL DEFAULT '[]',
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_teams_workspace ON teams(workspace_id);
