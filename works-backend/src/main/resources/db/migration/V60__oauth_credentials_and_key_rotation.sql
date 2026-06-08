-- V60: OAuth integration credentials, PII vault, custom domain verification tokens (B14, B23, B31).
-- Every tenant-scoped table carries workspace_id and is indexed on it (RB-40 §1). Plural
-- snake_case tables (RB-10 §3). Forward-only migration — to change, write V61.

-- ── custom_domains: add a stable verification token per domain (B14) ─────────────────────────────
-- The verification_token is generated at registration and never changes. A DNS TXT record
-- _bsmart-verify.<domain> must contain this token value for verification to succeed.
ALTER TABLE custom_domains
    ADD COLUMN IF NOT EXISTS verification_token VARCHAR(64);

-- Populate existing rows with a deterministic token derived from the domain id so existing
-- PENDING domains can still be verified.
UPDATE custom_domains
SET verification_token = LEFT(MD5(id), 32)
WHERE verification_token IS NULL;

-- ── integration_credentials: encrypted OAuth tokens per provider/workspace (B23) ───────────────
-- Encrypted access tokens and refresh tokens for live OAuth integrations. Key material is stored
-- encrypted under AES-256 (EncryptionService); the nonce (IV) is stored alongside the ciphertext.
-- Workspace-scoped (RB-40 §1). One row per (workspace_id, provider).
CREATE TABLE IF NOT EXISTS integration_credentials (
    id                  VARCHAR(100) PRIMARY KEY,
    workspace_id        VARCHAR(100) NOT NULL,
    provider            VARCHAR(50)  NOT NULL,    -- SLACK | GITHUB | GITLAB
    access_token_enc    TEXT,                     -- AES-256-GCM encrypted, base64-encoded
    refresh_token_enc   TEXT,                     -- AES-256-GCM encrypted, base64-encoded
    token_type          VARCHAR(30)  DEFAULT 'Bearer',
    scopes              TEXT,                     -- space-separated granted scopes
    expires_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (workspace_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_int_cred_workspace ON integration_credentials(workspace_id);

-- ── pii_vault_entries: encrypted PII storage (B31, RB-40 §3) ───────────────────────────────────
-- Raw personal data is NEVER stored in events, projections, or log lines. It lives here,
-- encrypted under a per-subject data key. On right-to-be-forgotten, the subject's key and this
-- row are destroyed; the event history stays intact (crypto-shredding, RB-40 §3).
CREATE TABLE IF NOT EXISTS pii_vault_entries (
    id                  VARCHAR(100) PRIMARY KEY,
    workspace_id        VARCHAR(100) NOT NULL,
    subject_id          VARCHAR(100) NOT NULL,    -- opaque token referencing the data subject
    pii_type            VARCHAR(50)  NOT NULL,    -- EMAIL | PHONE | NAME | ADDRESS | etc.
    encrypted_value     TEXT         NOT NULL,    -- AES-256-GCM, base64-encoded ciphertext
    key_version         VARCHAR(50),              -- KMS key version used (for rotation tracking)
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pii_vault_entries_workspace ON pii_vault_entries(workspace_id);
CREATE INDEX IF NOT EXISTS idx_pii_vault_entries_subject   ON pii_vault_entries(workspace_id, subject_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pii_vault_entries_unique ON pii_vault_entries(workspace_id, subject_id, pii_type);
