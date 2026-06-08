-- V59: Block-based article editor columns + SCIM provisioning token table
-- Covers B09 (block editor API) and B21 (SCIM provisioning stubs).
-- Forward-only (RB-10 §3); IF NOT EXISTS / ADD COLUMN IF NOT EXISTS keeps this idempotent.

-- B09: Block-based editor support for articles
-- content_format: 'markdown' (default, backward-compat) or 'blocks' (JSON block array)
-- content_blocks: JSONB block data, present when content_format = 'blocks'
ALTER TABLE articles ADD COLUMN IF NOT EXISTS content_format VARCHAR(20) NOT NULL DEFAULT 'markdown';
ALTER TABLE articles ADD COLUMN IF NOT EXISTS content_blocks JSONB;

-- Index to filter articles by format efficiently (e.g. migration tooling)
CREATE INDEX IF NOT EXISTS idx_articles_content_format ON articles (content_format);

-- B21: SCIM 2.0 provisioning tokens (workspace-scoped; scope='SCIM')
-- Each token authenticates an IdP-to-workspace SCIM client.
CREATE TABLE IF NOT EXISTS scim_tokens (
    id              VARCHAR(40) PRIMARY KEY,
    workspace_id    VARCHAR(40) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    token_hash      VARCHAR(255) NOT NULL,   -- bcrypt/SHA-256 hash; raw token shown once at creation
    label           VARCHAR(255),            -- human description, e.g. "Okta SCIM connector"
    created_by      VARCHAR(40),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at    TIMESTAMPTZ,
    revoked_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_scim_tokens_workspace ON scim_tokens (workspace_id);
-- Token lookup is by hash (raw token never stored), restricted to non-revoked rows
CREATE INDEX IF NOT EXISTS idx_scim_tokens_hash ON scim_tokens (token_hash) WHERE revoked_at IS NULL;
