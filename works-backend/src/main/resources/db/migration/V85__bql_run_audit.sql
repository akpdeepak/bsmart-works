-- V85: audit log for BQL runs triggered by a saved view or an automated subscription
-- ("saved/automated runs only"). Ad-hoc /bql/execute queries are intentionally NOT audited here;
-- automations already keep their own append-only log in automation_runs. This closes the gap for
-- the two remaining run sources so an admin can see who ran which named query, when, and how many
-- rows it matched. Append-only by convention (RB-20 §5) — written once, never updated.

CREATE TABLE bql_run_audits (
    id            VARCHAR(50)  PRIMARY KEY,
    workspace_id  VARCHAR(50)  NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id       VARCHAR(50),                 -- NULL for a scheduler-driven run (no human actor)
    source        VARCHAR(20)  NOT NULL,        -- SAVED_VIEW | SUBSCRIPTION
    source_id     VARCHAR(50),                  -- the saved_view / subscription id
    bql           TEXT,                         -- the query that was run (already workspace-scoped)
    result_count  INTEGER      NOT NULL DEFAULT 0,
    occurred_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Hot path is "the audit log for a workspace, newest first".
CREATE INDEX idx_bql_run_audits_ws_time ON bql_run_audits (workspace_id, occurred_at DESC);
