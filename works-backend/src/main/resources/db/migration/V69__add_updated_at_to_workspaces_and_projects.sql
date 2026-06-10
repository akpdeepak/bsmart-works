-- V68: add updated_at to workspaces and projects.
-- Both tables were missing this column; integration tests (WorkspaceTenantIsolationIT,
-- ComplianceEvaluationPerformanceTest) insert it, causing BadSqlGrammar on every CI run.
-- Forward-only; safe on already-migrated databases (IF NOT EXISTS / DEFAULT backfills).

ALTER TABLE workspaces
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_workspaces_updated_at ON workspaces(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at    ON projects(updated_at DESC);
