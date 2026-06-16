-- WI-11: feature-flag layer — global catalog + per-workspace overrides.
--
-- feature_flags: the global catalog of named feature flags with their default state.
-- workspace_feature_flags: per-workspace overrides (enable/disable + optional A/B variant).
--   Rows here shadow the global default; absence means "inherit the global default".
--
-- Data governance (RB-40 §1): workspace_feature_flags is workspace-scoped at write time.
-- No PII stored here; flags carry only boolean + variant label.

CREATE TABLE IF NOT EXISTS feature_flags (
    id          VARCHAR(50)  NOT NULL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    enabled     BOOLEAN      NOT NULL DEFAULT FALSE,
    description TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workspace_feature_flags (
    workspace_id VARCHAR(50)  NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    flag_name    VARCHAR(100) NOT NULL REFERENCES feature_flags(name) ON DELETE CASCADE,
    enabled      BOOLEAN      NOT NULL,
    variant      VARCHAR(50),
    PRIMARY KEY (workspace_id, flag_name)
);

CREATE INDEX IF NOT EXISTS idx_workspace_feature_flags_ws ON workspace_feature_flags(workspace_id);

-- Seed: flags for upcoming work-items. Default to disabled; each WI enables via workspace override
-- when the feature is built and ready to roll out.
INSERT INTO feature_flags (id, name, enabled, description) VALUES
    ('FLAG-001', 'onboarding_wizard',  FALSE, 'First-run onboarding wizard (WI-12)'),
    ('FLAG-002', 'inline_quick_add',   FALSE, 'Inline quick-add on list views (WI-13)'),
    ('FLAG-003', 'keyboard_navigation',FALSE, 'List-level keyboard rhythm j/k/e/n/Enter (WI-14)')
ON CONFLICT (id) DO NOTHING;
