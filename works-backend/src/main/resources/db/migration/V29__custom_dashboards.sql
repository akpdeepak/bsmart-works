-- V29: Iteration 6 — user-built (custom) dashboards. Distinct from the computed role
-- dashboards at /api/v1/dashboards/{role}: these are persisted, user-composed widget grids.

CREATE TABLE dashboards (
    id           VARCHAR(50) PRIMARY KEY,
    workspace_id VARCHAR(100),
    owner_id     VARCHAR(100) REFERENCES users(id),
    name         TEXT        NOT NULL,
    scope        VARCHAR(20) NOT NULL DEFAULT 'PERSONAL',  -- PERSONAL | TEAM | PROJECT | ORG
    project_id   VARCHAR(100),
    layout_cols  INTEGER     NOT NULL DEFAULT 12,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dashboards_owner     ON dashboards(owner_id);
CREATE INDEX idx_dashboards_workspace ON dashboards(workspace_id);

CREATE TABLE dashboard_widgets (
    id           BIGSERIAL PRIMARY KEY,
    dashboard_id VARCHAR(50) NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
    widget_type  VARCHAR(40) NOT NULL,                       -- SCORECARD | STATUS_BAR | ITEM_LIST | ...
    title        TEXT,
    config       JSONB       NOT NULL DEFAULT '{}',          -- metric/filter/source definition
    grid_x       INTEGER     NOT NULL DEFAULT 0,
    grid_y       INTEGER     NOT NULL DEFAULT 0,
    grid_w       INTEGER     NOT NULL DEFAULT 4,
    grid_h       INTEGER     NOT NULL DEFAULT 2,
    position     INTEGER     NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dashboard_widgets_dashboard ON dashboard_widgets(dashboard_id);
