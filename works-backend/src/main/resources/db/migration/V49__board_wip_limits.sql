-- Board WIP (work-in-progress) limits — a per-workspace flow policy for the board's three fixed
-- status columns (Todo / In Progress / Done). The board groups work items by status NAME and is
-- intentionally not driven by the per-workflow workflow_status table, so the limits live in a small
-- workspace-scoped row rather than on a per-status FK. A NULL column means "no limit" for that lane.
-- Workspace-scoped (RB-40 §1): workspace_id is the primary key and every query filters on it. One
-- row per workspace; a missing row means no limits anywhere. Forward-only (RB-10 §3).
CREATE TABLE board_wip_limits (
    workspace_id      VARCHAR(100) PRIMARY KEY,
    todo_limit        INTEGER,
    in_progress_limit INTEGER,
    done_limit        INTEGER,
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
