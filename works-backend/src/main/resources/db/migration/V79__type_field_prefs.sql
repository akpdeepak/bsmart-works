-- =====================================================================
-- Per-type field preferences (which fields show on the work item detail surface)
-- =====================================================================
-- Replaces the dead localStorage per-type field config with a workspace-scoped, server-persisted
-- one. A row exists only for a field whose default visibility/order is overridden for a type, so
-- the absence of a row means "shown, default order". Drives the detail surface; edited in
-- Settings → Fields. Forward-only (RB-10 §3).

CREATE TABLE type_field_prefs (
    id           VARCHAR(36)  PRIMARY KEY,
    workspace_id VARCHAR(36)  NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    type_key     VARCHAR(40)  NOT NULL,
    field_key    VARCHAR(80)  NOT NULL,
    visible      BOOLEAN      NOT NULL DEFAULT TRUE,
    sort_order   INTEGER      NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tfp_ws_type_field UNIQUE (workspace_id, type_key, field_key)
);

CREATE INDEX idx_tfp_workspace_type ON type_field_prefs (workspace_id, type_key);
