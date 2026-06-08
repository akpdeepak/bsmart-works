-- Iteration 14 (Cap D): workspace sandbox/test-mode flag.
-- When sandbox_mode = true, the workspace is flagged as a test environment so integrations
-- and external systems can distinguish test traffic from production events.
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS sandbox_mode BOOLEAN NOT NULL DEFAULT FALSE;
