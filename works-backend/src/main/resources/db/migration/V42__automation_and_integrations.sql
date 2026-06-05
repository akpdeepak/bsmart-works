-- V42: Iteration 13 — Automation Engine + Integrations (Cap C, Cap Q, Cap A).
-- A visual "When [trigger], if [condition], then [action]" automation engine with test-mode and an
-- append-only run log; outbound signed webhooks with retry + dead-letter; a public-API token store
-- (the OAuth/bearer foundation); and an integration-connection registry for Slack / GitHub / GitLab
-- / email / calendar and the SSO/SCIM identity providers. Every table is workspace-scoped (RB-40 §1)
-- and every run / delivery is auditable (RB-20 §5).

-- ── Permissions (ADMIN tier) ─────────────────────────────────────────────────────
INSERT INTO permissions (id, description, min_tier) VALUES
    ('manage_automations', 'Create, edit and run automation rules', 4),
    ('manage_integrations','Configure connectors, webhooks and SSO/SCIM', 4),
    ('manage_api_tokens',  'Issue and revoke public-API tokens', 4)
ON CONFLICT (id) DO NOTHING;

-- ── Automation rules — When/If/Then. New rules start disabled (test-before-activate) ─
CREATE TABLE automation_rules (
    id             VARCHAR(50)  PRIMARY KEY,
    workspace_id   VARCHAR(100) NOT NULL,
    name           VARCHAR(200) NOT NULL,
    description    TEXT,
    trigger_type   VARCHAR(40)  NOT NULL,                -- ITEM_CREATED | ITEM_UPDATED | STATUS_CHANGED | ITEM_ASSIGNED | SCHEDULED
    trigger_config JSONB        NOT NULL DEFAULT '{}',
    condition_expr TEXT         NOT NULL DEFAULT '',     -- e.g. priority = High AND type = Bug
    actions        JSONB        NOT NULL DEFAULT '[]',   -- [{type, params}]
    enabled        BOOLEAN      NOT NULL DEFAULT FALSE,
    schedule_cron  VARCHAR(120),                         -- for SCHEDULED triggers
    run_count      INTEGER      NOT NULL DEFAULT 0,
    last_run_at    TIMESTAMPTZ,
    created_by     VARCHAR(100),
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_automation_rules_ws ON automation_rules(workspace_id);
CREATE INDEX idx_automation_rules_active ON automation_rules(enabled, trigger_type);

-- ── Automation runs — append-only audit (incl. dry-run previews) ─────────────────
CREATE TABLE automation_runs (
    id              VARCHAR(50)  PRIMARY KEY,
    workspace_id    VARCHAR(100) NOT NULL,
    rule_id         VARCHAR(50)  NOT NULL,
    status          VARCHAR(20)  NOT NULL,               -- SUCCESS | FAILED | NOOP | DRY_RUN
    trigger_summary VARCHAR(300),
    affected_count  INTEGER      NOT NULL DEFAULT 0,
    detail          JSONB        NOT NULL DEFAULT '{}',
    dry_run         BOOLEAN      NOT NULL DEFAULT FALSE,
    error           TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_automation_runs_ws ON automation_runs(workspace_id);
CREATE INDEX idx_automation_runs_rule ON automation_runs(rule_id, created_at);

-- ── Outbound webhooks — per event type, signed, with retry + dead-letter ─────────
CREATE TABLE webhook_subscriptions (
    id           VARCHAR(50)  PRIMARY KEY,
    workspace_id VARCHAR(100) NOT NULL,
    event_type   VARCHAR(80)  NOT NULL,                  -- specific type or '*' for all
    target_url   VARCHAR(500) NOT NULL,
    secret       VARCHAR(200),                           -- HMAC signing secret
    active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_by   VARCHAR(100),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_webhook_subscriptions_ws ON webhook_subscriptions(workspace_id);

CREATE TABLE webhook_deliveries (
    id              VARCHAR(50)  PRIMARY KEY,
    workspace_id    VARCHAR(100) NOT NULL,
    subscription_id VARCHAR(50)  NOT NULL,
    event_type      VARCHAR(80)  NOT NULL,
    payload         TEXT,
    signature       VARCHAR(200),
    status          VARCHAR(20)  NOT NULL DEFAULT 'PENDING', -- PENDING | DELIVERED | FAILED | DEAD_LETTER
    attempts        INTEGER      NOT NULL DEFAULT 0,
    max_attempts    INTEGER      NOT NULL DEFAULT 5,
    response_code   INTEGER,
    last_error      TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_webhook_deliveries_ws ON webhook_deliveries(workspace_id);
CREATE INDEX idx_webhook_deliveries_sub ON webhook_deliveries(subscription_id, created_at);

-- ── Integration connections — Slack/GitHub/GitLab/email/calendar + SSO/SCIM ──────
CREATE TABLE integration_connections (
    id           VARCHAR(50)  PRIMARY KEY,
    workspace_id VARCHAR(100) NOT NULL,
    provider     VARCHAR(40)  NOT NULL,                  -- SLACK | GITHUB | GITLAB | EMAIL | CALENDAR | SAML | OIDC | SCIM
    name         VARCHAR(160) NOT NULL,
    config       JSONB        NOT NULL DEFAULT '{}',
    status       VARCHAR(20)  NOT NULL DEFAULT 'CONNECTED', -- CONNECTED | DISCONNECTED | ERROR
    created_by   VARCHAR(100),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_integration_connections_ws ON integration_connections(workspace_id);
CREATE UNIQUE INDEX uq_integration_connections ON integration_connections(workspace_id, provider, name);

-- ── API tokens — the public REST API / OAuth bearer foundation (Cap Q) ───────────
-- Only the prefix and a SHA-256 hash are stored; the plaintext token is shown once at issue time.
CREATE TABLE api_tokens (
    id           VARCHAR(50)  PRIMARY KEY,
    workspace_id VARCHAR(100) NOT NULL,
    name         VARCHAR(160) NOT NULL,
    token_prefix VARCHAR(20)  NOT NULL,
    token_hash   VARCHAR(128) NOT NULL,
    scopes       JSONB        NOT NULL DEFAULT '[]',
    created_by   VARCHAR(100),
    last_used_at TIMESTAMPTZ,
    revoked      BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_api_tokens_ws ON api_tokens(workspace_id);
CREATE INDEX idx_api_tokens_prefix ON api_tokens(token_prefix);
