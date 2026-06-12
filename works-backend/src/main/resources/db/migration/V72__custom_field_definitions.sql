-- V71: workspace-scoped custom field definitions + JSONB value store on work_items.
-- Allows workspace members to define extra fields (TEXT / NUMBER / DATE / SELECT) that
-- appear on work item cards and are stored as a schema-less JSONB bag alongside the item.

CREATE TABLE custom_field_definitions (
    id           VARCHAR(36)  PRIMARY KEY,
    workspace_id VARCHAR(36)  NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name         VARCHAR(100) NOT NULL,
    field_type   VARCHAR(20)  NOT NULL CHECK (field_type IN ('TEXT','NUMBER','DATE','SELECT')),
    options      JSONB,                        -- non-null only for SELECT: ["Opt A","Opt B"]
    created_by   VARCHAR(36),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at   TIMESTAMPTZ,
    CONSTRAINT uq_cfd_workspace_name UNIQUE (workspace_id, name)
);

CREATE INDEX idx_cfd_workspace ON custom_field_definitions (workspace_id)
    WHERE deleted_at IS NULL;

-- Schema-less value store: { "cfd-id": "value", ... }
ALTER TABLE work_items
    ADD COLUMN IF NOT EXISTS custom_fields JSONB NOT NULL DEFAULT '{}';
