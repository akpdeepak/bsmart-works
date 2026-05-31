-- =====================================================================
-- Iteration 3: Workflows, Custom Fields, Permissions, WIQL
-- =====================================================================

-- Workflow per project/type
CREATE TABLE workflow (
    id           VARCHAR(36) PRIMARY KEY,
    workspace_id VARCHAR(36) NOT NULL,
    project_id   VARCHAR(36),
    name         VARCHAR(120) NOT NULL,
    item_type    VARCHAR(40),
    is_default   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE workflow_status (
    id          VARCHAR(36) PRIMARY KEY,
    workflow_id VARCHAR(36) NOT NULL REFERENCES workflow(id) ON DELETE CASCADE,
    name        VARCHAR(80) NOT NULL,
    category    VARCHAR(20) NOT NULL DEFAULT 'TODO',
    color       VARCHAR(7) DEFAULT '#94a3b8',
    position    INTEGER NOT NULL DEFAULT 0,
    is_initial  BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE workflow_transition (
    id              VARCHAR(36) PRIMARY KEY,
    workflow_id     VARCHAR(36) NOT NULL REFERENCES workflow(id) ON DELETE CASCADE,
    from_status     VARCHAR(36),
    to_status       VARCHAR(36) NOT NULL,
    name            VARCHAR(80) NOT NULL,
    conditions      JSONB NOT NULL DEFAULT '[]',
    validators      JSONB NOT NULL DEFAULT '[]',
    post_functions  JSONB NOT NULL DEFAULT '[]'
);

-- Custom field definitions
CREATE TABLE field_def (
    id           VARCHAR(36) PRIMARY KEY,
    workspace_id VARCHAR(36) NOT NULL,
    project_id   VARCHAR(36),
    name         VARCHAR(120) NOT NULL,
    field_key    VARCHAR(80) NOT NULL,
    field_type   VARCHAR(30) NOT NULL,
    config       JSONB NOT NULL DEFAULT '{}',
    required     BOOLEAN NOT NULL DEFAULT FALSE,
    position     INTEGER NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE work_item_field_value (
    id           VARCHAR(36) PRIMARY KEY,
    work_item_id VARCHAR(36) NOT NULL,
    field_def_id VARCHAR(36) NOT NULL REFERENCES field_def(id) ON DELETE CASCADE,
    value_text   TEXT,
    value_number DECIMAL(20,6),
    value_json   JSONB,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(work_item_id, field_def_id)
);

-- Permission scheme + custom roles
CREATE TABLE permission_scheme (
    id           VARCHAR(36) PRIMARY KEY,
    workspace_id VARCHAR(36) NOT NULL,
    name         VARCHAR(120) NOT NULL,
    description  TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE role_def (
    id                   VARCHAR(36) PRIMARY KEY,
    workspace_id         VARCHAR(36) NOT NULL,
    permission_scheme_id VARCHAR(36),
    name                 VARCHAR(80) NOT NULL,
    description          TEXT,
    tier                 INTEGER NOT NULL DEFAULT 2,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE role_permission (
    id          VARCHAR(36) PRIMARY KEY,
    role_def_id VARCHAR(36) NOT NULL REFERENCES role_def(id) ON DELETE CASCADE,
    permission  VARCHAR(80) NOT NULL,
    granted     BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE(role_def_id, permission)
);

-- Field visibility rules per role
CREATE TABLE field_visibility (
    id           VARCHAR(36) PRIMARY KEY,
    field_def_id VARCHAR(36) NOT NULL REFERENCES field_def(id) ON DELETE CASCADE,
    role_def_id  VARCHAR(36) NOT NULL REFERENCES role_def(id) ON DELETE CASCADE,
    visibility   VARCHAR(20) NOT NULL DEFAULT 'EDITABLE',
    UNIQUE(field_def_id, role_def_id)
);

-- Custom work item type configs
CREATE TABLE work_item_type_config (
    id           VARCHAR(36) PRIMARY KEY,
    workspace_id VARCHAR(36) NOT NULL,
    project_id   VARCHAR(36),
    type_key     VARCHAR(40) NOT NULL,
    label        VARCHAR(80) NOT NULL,
    icon         VARCHAR(10),
    color        VARCHAR(7),
    is_custom    BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Field layout per type
CREATE TABLE field_layout (
    id           VARCHAR(36) PRIMARY KEY,
    workspace_id VARCHAR(36) NOT NULL,
    project_id   VARCHAR(36),
    item_type    VARCHAR(40) NOT NULL,
    layout_json  JSONB NOT NULL DEFAULT '[]',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Saved WIQL filters
CREATE TABLE wiql_filter (
    id           VARCHAR(36) PRIMARY KEY,
    workspace_id VARCHAR(36) NOT NULL,
    created_by   VARCHAR(36) NOT NULL,
    name         VARCHAR(120) NOT NULL,
    query        TEXT NOT NULL,
    is_shared    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_workflow_workspace ON workflow(workspace_id);
CREATE INDEX idx_workflow_project   ON workflow(project_id);
CREATE INDEX idx_field_def_workspace ON field_def(workspace_id);
CREATE INDEX idx_field_def_project   ON field_def(project_id);
CREATE INDEX idx_wifv_work_item ON work_item_field_value(work_item_id);
CREATE INDEX idx_role_def_workspace ON role_def(workspace_id);
CREATE INDEX idx_wiql_workspace ON wiql_filter(workspace_id, created_by);
