-- V44: Iteration 12 — KPI Framework with Privacy Guardrails (Cap L).
-- Layered metrics: individual data is private by default, team/project/org data is
-- aggregated, and the manager view can never drill into individuals. Privacy is enforced
-- server-side (RB-40 §1 field-level security; §5.2 isolation), never just hidden in the UI.
--
-- Four new tables, one settings table, three permissions, and a seeded default catalog:
--   metric_definitions    — the metric catalog (defaults + custom), safe formula primitives.
--   metric_snapshots       — immutable per-period values; historical metrics never change.
--   metric_shares          — voluntary individual sharing (engineer → specific people).
--   workspace_kpi_settings — per-workspace, stricter-than-default privacy policy.
-- Every table is workspace-scoped; snapshots are append-only (no UPDATE path in code).

-- ── Permissions (most-restrictive-wins layering is enforced in the service) ───────
-- Personal metrics need only workspace membership (a user always sees their own).
-- Team/manager aggregated views require LEAD; org/executive views require ADMIN.
INSERT INTO permissions (id, description, min_tier) VALUES
    ('view_team_metrics', 'View aggregated team/project/manager KPI dashboards', 3),
    ('view_org_metrics',  'View organization/executive KPI dashboards',          4),
    ('manage_metrics',    'Define and edit custom metric definitions',           3)
ON CONFLICT (id) DO NOTHING;

-- ── Metric definitions: the catalog + custom builder ──────────────────────────────
-- workspace_id NULL = a global default-catalog template; a non-null row is a workspace's
-- own (cloned or custom) definition. aggregation is a safe primitive (no raw SQL ever).
-- min_layer is the *least* aggregated layer at which this metric may be shown — defaults
-- compute at TEAM and up, but personal-safe metrics (cycle_time, throughput) allow PERSONAL.
CREATE TABLE metric_definitions (
    id              VARCHAR(50)  PRIMARY KEY,
    workspace_id    VARCHAR(100),                              -- NULL = global default template
    metric_key      VARCHAR(80)  NOT NULL,                     -- stable key, e.g. 'cycle_time'
    name            TEXT         NOT NULL,
    description     TEXT,
    category        VARCHAR(40)  NOT NULL DEFAULT 'FLOW',      -- FLOW | THROUGHPUT | PREDICTABILITY | QUALITY
    aggregation     VARCHAR(20)  NOT NULL DEFAULT 'AVG',       -- SUM | AVG | PERCENTILE | COUNT | RATIO
    source          VARCHAR(60)  NOT NULL,                     -- computation source key the engine understands
    unit            VARCHAR(20)  NOT NULL DEFAULT 'count',     -- count | hours | days | points | percent
    percentile      INTEGER,                                   -- for aggregation = PERCENTILE (e.g. 85)
    higher_is_better BOOLEAN     NOT NULL DEFAULT TRUE,
    min_layer       VARCHAR(20)  NOT NULL DEFAULT 'TEAM',      -- least-aggregated layer allowed: PERSONAL | TEAM
    is_default      BOOLEAN      NOT NULL DEFAULT FALSE,        -- part of the seeded default catalog
    active          BOOLEAN      NOT NULL DEFAULT TRUE,
    created_by      VARCHAR(100),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_metric_definitions_workspace ON metric_definitions(workspace_id);
CREATE UNIQUE INDEX uq_metric_definition_ws_key ON metric_definitions(workspace_id, metric_key);

-- ── Metric snapshots: immutable per-period values ─────────────────────────────────
-- One row = one metric value for one scope over one period. Append-only: the code never
-- updates a snapshot, so historical metrics are audit-safe and never change retroactively.
-- No individual (assignee) scope is ever recorded here — the smallest scope is PROJECT.
CREATE TABLE metric_snapshots (
    id            VARCHAR(50)  PRIMARY KEY,
    workspace_id  VARCHAR(100) NOT NULL,
    metric_key    VARCHAR(80)  NOT NULL,
    scope         VARCHAR(20)  NOT NULL,                       -- TEAM | PROJECT | ORG
    scope_ref     VARCHAR(100),                                -- teamId / projectId; NULL for ORG
    period_label  VARCHAR(40)  NOT NULL,                       -- e.g. '2026-W22' or '2026-06'
    period_start  DATE         NOT NULL,
    period_end    DATE         NOT NULL,
    value         DOUBLE PRECISION,                            -- NULL = suppressed (below privacy floor)
    sample_size   INTEGER      NOT NULL DEFAULT 0,             -- # of distinct contributors behind the value
    suppressed    BOOLEAN      NOT NULL DEFAULT FALSE,         -- true = withheld to protect anonymity
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_metric_snapshots_workspace ON metric_snapshots(workspace_id);
CREATE INDEX idx_metric_snapshots_lookup    ON metric_snapshots(workspace_id, metric_key, scope, scope_ref);
-- A given metric has at most one snapshot per scope per period — re-running the snapshotter
-- must not stack duplicates. (Re-snapshotting a period is a no-op; the first value is frozen.)
CREATE UNIQUE INDEX uq_metric_snapshot_period
    ON metric_snapshots(workspace_id, metric_key, scope, COALESCE(scope_ref, ''), period_label);

-- ── Metric shares: voluntary individual sharing ───────────────────────────────────
-- An engineer chooses to share their own personal metrics with specific people (e.g. a 1:1).
-- This is the ONLY way one user's individual metrics become visible to another — there is no
-- manager/admin override path. expires_at NULL = until revoked.
CREATE TABLE metric_shares (
    id             VARCHAR(50)  PRIMARY KEY,
    workspace_id   VARCHAR(100) NOT NULL,
    owner_id       VARCHAR(100) NOT NULL,                      -- whose metrics are shared
    shared_with_id VARCHAR(100) NOT NULL,                      -- who may view them
    expires_at     TIMESTAMPTZ,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_metric_shares_owner       ON metric_shares(owner_id);
CREATE INDEX idx_metric_shares_shared_with ON metric_shares(shared_with_id);
CREATE UNIQUE INDEX uq_metric_share ON metric_shares(owner_id, shared_with_id);

-- ── Per-workspace privacy policy (stricter-than-default allowed) ───────────────────
-- min_aggregation_size: an aggregated metric is suppressed unless at least this many distinct
-- contributors stand behind it (prevents de-anonymising a "team" of one). Default 3.
-- individual_comparison_locked: locked-by-design — individual engineer comparison is never
-- offered, framed in the UI as a deliberate choice, not a missing feature.
CREATE TABLE workspace_kpi_settings (
    workspace_id                 VARCHAR(100) PRIMARY KEY,
    min_aggregation_size         INTEGER      NOT NULL DEFAULT 3,
    individual_comparison_locked BOOLEAN      NOT NULL DEFAULT TRUE,
    updated_at                   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Seed the default metric catalog (global templates: workspace_id NULL) ──────────
-- Velocity, commitment accuracy, cycle time, lead time, rework, WIP, blocked time, bug
-- escape, PR turnaround (spec) + throughput & completion rate (personal-safe headline).
INSERT INTO metric_definitions
    (id, workspace_id, metric_key, name, description, category, aggregation, source, unit, percentile, higher_is_better, min_layer, is_default, active)
VALUES
    ('MD-VELOCITY',    NULL, 'velocity',            'Velocity',             'Story points completed per sprint.',                         'THROUGHPUT',     'SUM',        'velocity',         'points',  NULL, TRUE,  'TEAM',     TRUE, TRUE),
    ('MD-COMMITACC',   NULL, 'commitment_accuracy', 'Commitment Accuracy',  'Completed vs committed points in a sprint.',                 'PREDICTABILITY', 'RATIO',      'commitment_acc',   'percent', NULL, TRUE,  'TEAM',     TRUE, TRUE),
    ('MD-CYCLETIME',   NULL, 'cycle_time',          'Cycle Time',           'Time from first In Progress to Done.',                       'FLOW',           'PERCENTILE', 'cycle_time',       'days',    85,   FALSE, 'PERSONAL', TRUE, TRUE),
    ('MD-LEADTIME',    NULL, 'lead_time',           'Lead Time',            'Time from creation to Done.',                                'FLOW',           'PERCENTILE', 'lead_time',        'days',    85,   FALSE, 'PERSONAL', TRUE, TRUE),
    ('MD-REWORK',      NULL, 'rework',              'Rework Rate',          'Items reopened or moved backward after reaching Done.',      'QUALITY',        'COUNT',      'rework',           'count',   NULL, FALSE, 'TEAM',     TRUE, TRUE),
    ('MD-WIP',         NULL, 'wip',                 'Work in Progress',     'Items currently In Progress.',                               'FLOW',           'COUNT',      'wip',              'count',   NULL, FALSE, 'PERSONAL', TRUE, TRUE),
    ('MD-BLOCKED',     NULL, 'blocked_time',        'Blocked Time',         'Time items spend in a Blocked status.',                      'FLOW',           'AVG',        'blocked_time',     'days',    NULL, FALSE, 'TEAM',     TRUE, TRUE),
    ('MD-BUGESCAPE',   NULL, 'bug_escape',          'Bug Escape',           'Bugs completed in the period (escaped to delivery).',        'QUALITY',        'COUNT',      'bug_escape',       'count',   NULL, FALSE, 'TEAM',     TRUE, TRUE),
    ('MD-PRTURN',      NULL, 'pr_turnaround',       'PR Turnaround',        'Time from PR open to merge (requires integration).',         'FLOW',           'PERCENTILE', 'pr_turnaround',    'hours',   85,   FALSE, 'TEAM',     TRUE, TRUE),
    ('MD-THROUGHPUT',  NULL, 'throughput',          'Throughput',           'Items completed in the period.',                             'THROUGHPUT',     'COUNT',      'throughput',       'count',   NULL, TRUE,  'PERSONAL', TRUE, TRUE),
    ('MD-COMPLETION',  NULL, 'completion_rate',     'Completion Rate',      'Share of in-scope items that are Done.',                     'THROUGHPUT',     'RATIO',      'completion_rate',  'percent', NULL, TRUE,  'PERSONAL', TRUE, TRUE)
ON CONFLICT (workspace_id, metric_key) DO NOTHING;
