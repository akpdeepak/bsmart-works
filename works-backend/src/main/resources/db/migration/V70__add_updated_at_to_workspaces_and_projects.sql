-- V70: add updated_at to workspaces and projects
-- Several integration tests (WorkspaceTenantIsolationIT, ComplianceEvaluationPerformanceTest)
-- insert rows using this column; it was missing from the V3 initial schema.
-- IF NOT EXISTS guards make this idempotent if the column was added by a prior hotfix.

ALTER TABLE workspaces
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
