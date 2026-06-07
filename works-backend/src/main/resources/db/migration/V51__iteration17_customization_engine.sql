-- Iteration 17 — Universal Customization Engine (Cap R). The configuration framework that lets
-- admins tune workspace behaviour without engineering tickets: one centralized settings document
-- per workspace, every change versioned and diffable, rollback to any prior version, reusable
-- templates, a sandbox to preview changes before promotion, JSON/YAML import-export, lockable
-- settings, and impact analysis before a change lands.
--
-- ONE unified config document (jsonb) carries everything that is customizable — branding, locale,
-- timezone, working calendar, defaults, custom forms, custom pages, code extensions, and the set of
-- locked paths — so versioning / diff / rollback / template / sandbox / import-export apply uniformly
-- across all customization ("customization itself is customizable", spec 06 §17). Workspace-scoped
-- (RB-40 §1): every table carries workspace_id and every query filters on it. Forward-only (RB-10 §3).

-- The live, effective configuration for a workspace. A missing row means "system defaults" (the
-- ConfigDefaults document in code). current_version points at the latest row in config_versions.
CREATE TABLE workspace_configs (
    workspace_id    VARCHAR(100) PRIMARY KEY,
    document        JSONB        NOT NULL DEFAULT '{}'::jsonb,
    current_version INTEGER      NOT NULL DEFAULT 0,
    updated_by      VARCHAR(100),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Append-only version history. Every change to the live config writes a new row here first, so any
-- prior state can be diffed or rolled back to. version_number is monotonic per workspace. source
-- records how the version was produced: MANUAL | IMPORT | TEMPLATE | ROLLBACK | SANDBOX_PROMOTE.
CREATE TABLE config_versions (
    id             VARCHAR(40)  PRIMARY KEY,
    workspace_id   VARCHAR(100) NOT NULL,
    version_number INTEGER      NOT NULL,
    document       JSONB        NOT NULL,
    summary        TEXT,
    source         VARCHAR(30)  NOT NULL DEFAULT 'MANUAL',
    created_by     VARCHAR(100),
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_config_version UNIQUE (workspace_id, version_number)
);
CREATE INDEX idx_config_versions_ws ON config_versions (workspace_id, version_number DESC);

-- Reusable configuration templates. owner_workspace_id is the workspace that authored it (NULL for a
-- BCITS-internal/global template). shareable = visible to every workspace (the customer-shareable
-- library); otherwise only the owner sees it (the internal library).
CREATE TABLE config_templates (
    id                 VARCHAR(40)  PRIMARY KEY,
    owner_workspace_id VARCHAR(100),
    name               VARCHAR(200) NOT NULL,
    description        TEXT,
    shareable          BOOLEAN      NOT NULL DEFAULT FALSE,
    document           JSONB        NOT NULL,
    created_by         VARCHAR(100),
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_config_templates_owner ON config_templates (owner_workspace_id);

-- Sandbox configurations — a labelled draft document where changes are tested before promotion to
-- live. base_version is the live version the sandbox forked from (used to warn about drift). status:
-- DRAFT | PROMOTED | DISCARDED.
CREATE TABLE config_sandboxes (
    id           VARCHAR(40)  PRIMARY KEY,
    workspace_id VARCHAR(100) NOT NULL,
    name         VARCHAR(200) NOT NULL,
    document     JSONB        NOT NULL,
    base_version INTEGER      NOT NULL DEFAULT 0,
    status       VARCHAR(20)  NOT NULL DEFAULT 'DRAFT',
    created_by   VARCHAR(100),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_config_sandboxes_ws ON config_sandboxes (workspace_id, created_at DESC);

-- A starter, customer-shareable template so the library is non-empty on day one: the utility
-- customer baseline referenced in the iteration's BCITS use cases. en-IN / Asia/Kolkata, a standard
-- Mon–Fri 9–18 working calendar, and TASK/MEDIUM defaults — a sane base any new DISCOM workspace can
-- apply and then tailor. owner NULL = BCITS-internal/global.
INSERT INTO config_templates (id, owner_workspace_id, name, description, shareable, document, created_by)
VALUES (
    'TPL-UTILITY-BASE',
    NULL,
    'Utility Customer Workspace',
    'BCITS baseline for a new DISCOM customer — locale, timezone, working calendar and sensible defaults. Apply, then tailor.',
    TRUE,
    '{
      "settings": {
        "branding": {"appName": "bSmart Works", "primaryColor": "brand-navy", "accentColor": "brand-orange", "logoUrl": ""},
        "locale": "en-IN",
        "timezone": "Asia/Kolkata",
        "workingCalendar": {"workdays": ["MON","TUE","WED","THU","FRI"], "startHour": 9, "endHour": 18, "holidays": []},
        "defaults": {"workItemType": "TASK", "priority": "MEDIUM", "estimateUnit": "POINTS"}
      },
      "forms": [],
      "pages": [],
      "extensions": [],
      "locks": []
    }'::jsonb,
    'system'
);
