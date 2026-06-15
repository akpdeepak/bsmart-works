-- V91: add created_at to workspaces for HEART activation-funnel instrumentation (WI-09).
-- Required for day-2-return detection in FunnelService: compute days since workspace creation.
-- Forward-only; safe on already-migrated DBs (IF NOT EXISTS / DEFAULT backfills existing rows).
-- Backfill: existing workspaces get created_at from their earliest workspace-scoped event as a
-- proxy for first activity; workspaces with no events keep NOW() (migration timestamp).

ALTER TABLE workspaces
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE workspaces w
SET created_at = sub.min_event
FROM (
    SELECT workspace_id, MIN(occurred_at) AS min_event
    FROM events
    WHERE workspace_id IS NOT NULL
    GROUP BY workspace_id
) sub
WHERE w.id = sub.workspace_id;

CREATE INDEX IF NOT EXISTS idx_workspaces_created_at ON workspaces(created_at);
