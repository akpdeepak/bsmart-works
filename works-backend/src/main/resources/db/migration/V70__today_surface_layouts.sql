-- V70: Configurable Home → Today (slice 1 of the Today-customization series).
-- A Today layout is a role-scoped dashboard: rows in the EXISTING dashboards table
-- with surface='TODAY' — one customization framework, no parallel widget system
-- (RB-20 §3, unification layers). Widgets stay in dashboard_widgets unchanged.
--
--   owner_id NULL  → the workspace's role template (ADMIN+ managed)
--   owner_id set   → a member's personal override
-- Effective layout resolution: personal → workspace template → built-in (code).

ALTER TABLE dashboards ADD COLUMN surface  VARCHAR(20) NOT NULL DEFAULT 'CANVAS';
ALTER TABLE dashboards ADD COLUMN role_key VARCHAR(30);

-- Exactly one workspace template per (workspace, role)…
CREATE UNIQUE INDEX uq_dashboards_today_template
    ON dashboards(workspace_id, role_key)
    WHERE surface = 'TODAY' AND owner_id IS NULL;

-- …and one personal override per (workspace, role, user).
CREATE UNIQUE INDEX uq_dashboards_today_personal
    ON dashboards(workspace_id, role_key, owner_id)
    WHERE surface = 'TODAY' AND owner_id IS NOT NULL;

-- Hot path: effective-layout lookup by (workspace, role).
CREATE INDEX idx_dashboards_today_lookup
    ON dashboards(workspace_id, role_key)
    WHERE surface = 'TODAY';
