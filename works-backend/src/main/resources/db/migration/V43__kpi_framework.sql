-- V43: Iteration 12 — KPI Framework with Privacy Guardrails (Cap L, RB-20 §4, RB-40 §1 privacy).
-- Layered metrics where individual data is private by default, team/project/org data is aggregated,
-- and the manager view CANNOT drill into individuals — enforced at the API (KpiService), not the UI
-- (commitment 4: privacy by design). Snapshots are immutable so historical metrics never change
-- retroactively (audit-safe). Custom metrics are built from a SAFE formula builder (aggregate
-- primitives only), never raw SQL, and cannot target the INDIVIDUAL scope.

-- ── Permissions ────────────────────────────────────────────────────────────────
-- Aggregated team/project/manager/org views require LEAD tier; defining custom metrics is ADMIN.
-- Personal metrics need only workspace membership (and are self-or-shared, enforced in the service).
INSERT INTO permissions (id, description, min_tier) VALUES
    ('view_team_metrics', 'View aggregated team / project / manager / org KPI dashboards', 3),
    ('manage_metrics',    'Define and edit custom metric definitions', 4)
ON CONFLICT (id) DO NOTHING;

-- ── Metric definitions — the catalog + custom metrics (safe formula builder) ─────
-- primitive is one of the safe aggregates (SUM/AVG/PERCENTILE/COUNT/RATIO); scope_level is the
-- aggregation level. A custom definition may NOT use scope_level INDIVIDUAL (privacy guardrail).
CREATE TABLE metric_definitions (
    id           VARCHAR(50)  PRIMARY KEY,
    workspace_id VARCHAR(100) NOT NULL,
    metric_key   VARCHAR(80)  NOT NULL,
    name         VARCHAR(160) NOT NULL,
    description  TEXT,
    primitive    VARCHAR(20)  NOT NULL DEFAULT 'AVG',   -- SUM | AVG | PERCENTILE | COUNT | RATIO
    source_field VARCHAR(80),                           -- the work-item field the primitive reduces
    unit         VARCHAR(20),                           -- points | hours | percent | count | days
    scope_level  VARCHAR(20)  NOT NULL DEFAULT 'TEAM',  -- TEAM | PROJECT | ORG  (never INDIVIDUAL)
    higher_is_better BOOLEAN  NOT NULL DEFAULT TRUE,
    built_in     BOOLEAN      NOT NULL DEFAULT FALSE,
    created_by   VARCHAR(100),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_metric_definitions_ws ON metric_definitions(workspace_id);
CREATE UNIQUE INDEX uq_metric_definitions_ws_key ON metric_definitions(workspace_id, metric_key);

-- ── Metric snapshots — immutable per-period values (audit-safe; never updated) ───
CREATE TABLE metric_snapshots (
    id           VARCHAR(50)  PRIMARY KEY,
    workspace_id VARCHAR(100) NOT NULL,
    metric_key   VARCHAR(80)  NOT NULL,
    scope_level  VARCHAR(20)  NOT NULL,                 -- TEAM | PROJECT | ORG | INDIVIDUAL
    scope_id     VARCHAR(100),                          -- team / project / user id; NULL for ORG
    period       VARCHAR(20)  NOT NULL,                 -- e.g. 2026-06 or sprint id
    value        DOUBLE PRECISION NOT NULL DEFAULT 0,
    sample_size  INTEGER      NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_metric_snapshots_ws ON metric_snapshots(workspace_id);
CREATE INDEX idx_metric_snapshots_lookup ON metric_snapshots(workspace_id, metric_key, scope_level, scope_id);
CREATE UNIQUE INDEX uq_metric_snapshots_period
    ON metric_snapshots(workspace_id, metric_key, scope_level, COALESCE(scope_id, ''), period);

-- ── Metric shares — voluntary individual sharing (e.g. for a 1:1) ────────────────
-- An engineer chooses to expose THEIR OWN personal metrics to a specific viewer. This is the ONLY
-- path by which one user's individual metrics become visible to another (RB-40 §1).
CREATE TABLE metric_shares (
    id             VARCHAR(50)  PRIMARY KEY,
    workspace_id   VARCHAR(100) NOT NULL,
    owner_user_id  VARCHAR(100) NOT NULL,               -- whose metrics are shared
    viewer_user_id VARCHAR(100) NOT NULL,               -- who may see them
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_metric_shares_owner ON metric_shares(workspace_id, owner_user_id);
CREATE INDEX idx_metric_shares_viewer ON metric_shares(workspace_id, viewer_user_id);
CREATE UNIQUE INDEX uq_metric_shares ON metric_shares(workspace_id, owner_user_id, viewer_user_id);
