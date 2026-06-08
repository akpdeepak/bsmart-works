-- Iteration 17 (Cap R): custom saved views — named BQL filter + column configuration.
-- Each row represents one named work-item view that a user can save and optionally share
-- within their workspace (custom views spec, Cap R §3).
CREATE TABLE IF NOT EXISTS saved_views (
    id            VARCHAR(50)  PRIMARY KEY,
    workspace_id  VARCHAR(50)  NOT NULL,
    project_id    VARCHAR(50),
    item_type     VARCHAR(50),
    name          VARCHAR(200) NOT NULL,
    description   TEXT,
    bql_filter    TEXT,
    column_keys   TEXT,        -- JSON array of column identifiers
    is_shared     BOOLEAN      NOT NULL DEFAULT FALSE,
    created_by    VARCHAR(50)  NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_saved_views_workspace ON saved_views (workspace_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_saved_views_project  ON saved_views (project_id)  WHERE project_id IS NOT NULL;
