-- V51 · Iteration 19 — Enterprise Security + Compliance Certifications (Cap T)
-- SOC 2 Type 2 / ISO 27001 readiness: phishing-resistant auth (passkeys), conditional access,
-- a tamper-evident (hash-chained) security audit log with browse/export/SIEM-streaming,
-- data residency + BYOK, AI anomaly detection on access, GDPR/DPDP data export + right-to-be-
-- forgotten (crypto-shred semantics, RB-40 §3), a pen-test program register, and one-click
-- compliance evidence bundles.
--
-- Every tenant-scoped table carries workspace_id and is indexed on it (RB-40 §1). Plural
-- snake_case tables (RB-10 §3). Forward-only — to change, write a new migration.

-- pgcrypto gives us digest() so the seeded audit chain below is computed with the same SHA-256
-- the application uses (AuditHashChain) — the seed is genuinely tamper-evident, not faked.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Permissions (RBAC in the service layer — RB-10 §2) ───────────────────────────────────────
-- Security administration is ADMIN-tier (4). Self-service passkey enrolment needs no new
-- permission (it acts on the authenticated user, exactly like MFA).
INSERT INTO permissions (id, description, min_tier) VALUES
    ('view_audit_log',  'Browse and export the security audit log and access anomalies', 4),
    ('manage_security', 'Manage conditional access, data residency, BYOK, SIEM streaming, '
                        || 'data-subject requests and compliance evidence',               4)
ON CONFLICT (id) DO NOTHING;

-- ── Passkeys / WebAuthn (Cap T · phishing-resistant auth) ────────────────────────────────────
-- A user's registered authenticators. public_key_pem is the credential public key (SPKI/PEM);
-- the private key never leaves the authenticator. sign_count guards against cloned authenticators.
CREATE TABLE webauthn_credentials (
    id              VARCHAR(64)  PRIMARY KEY,
    user_id         VARCHAR(100) NOT NULL,
    workspace_id    VARCHAR(100),                       -- last workspace the passkey was used in (context only)
    credential_id   VARCHAR(512) NOT NULL UNIQUE,       -- base64url credential id from the authenticator
    public_key_pem  TEXT         NOT NULL,
    algorithm       VARCHAR(20)  NOT NULL DEFAULT 'ES256',
    sign_count      BIGINT       NOT NULL DEFAULT 0,
    label           VARCHAR(120) NOT NULL DEFAULT 'Passkey',
    transports      VARCHAR(120),                       -- e.g. "internal,hybrid"
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    last_used_at    TIMESTAMPTZ
);
CREATE INDEX idx_webauthn_credentials_user ON webauthn_credentials(user_id);

-- Short-lived ceremony challenges. A challenge is single-use and expires fast; this is what makes
-- the auth phishing-resistant — the signature is bound to a server-issued nonce.
CREATE TABLE webauthn_challenges (
    id            VARCHAR(64)  PRIMARY KEY,
    user_id       VARCHAR(100) NOT NULL,
    challenge     VARCHAR(128) NOT NULL,
    ceremony      VARCHAR(20)  NOT NULL,                -- REGISTER | AUTHENTICATE
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    expires_at    TIMESTAMPTZ  NOT NULL
);
CREATE INDEX idx_webauthn_challenges_user ON webauthn_challenges(user_id);

-- ── Conditional access policies (Cap T) ──────────────────────────────────────────────────────
-- Per-workspace, optionally narrowed to one role. Empty allowlists mean "no restriction on that
-- dimension". A request must satisfy every enabled dimension of every applicable policy.
CREATE TABLE conditional_access_policies (
    id                   VARCHAR(64)  PRIMARY KEY,
    workspace_id         VARCHAR(100) NOT NULL,
    name                 VARCHAR(160) NOT NULL,
    enabled              BOOLEAN      NOT NULL DEFAULT TRUE,
    applies_to_role      VARCHAR(40),                    -- NULL = all roles in the workspace
    ip_allowlist         TEXT,                           -- comma-separated CIDRs / IPs; empty = any
    geo_allowlist        TEXT,                           -- comma-separated ISO country codes; empty = any
    require_device_trust BOOLEAN      NOT NULL DEFAULT FALSE,
    time_zone            VARCHAR(60)  NOT NULL DEFAULT 'UTC',
    allowed_start_minute INTEGER,                        -- minutes from midnight; NULL = any time
    allowed_end_minute   INTEGER,
    created_by           VARCHAR(100),
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_cond_access_workspace ON conditional_access_policies(workspace_id);

-- ── Workspace security settings — data residency + BYOK (Cap T) ──────────────────────────────
-- One row per workspace; absent row = platform defaults. byok_key_ref is a *reference* (KMS ARN /
-- key id), never key material — the key stays in the customer's KMS (RB-40 §4).
CREATE TABLE workspace_security_settings (
    workspace_id              VARCHAR(100) PRIMARY KEY,
    data_residency_region     VARCHAR(20)  NOT NULL DEFAULT 'IN',     -- IN | EU | US | AP | UK
    byok_enabled              BOOLEAN      NOT NULL DEFAULT FALSE,
    byok_provider             VARCHAR(20),                            -- AWS_KMS | AZURE_KV | GCP_KMS
    byok_key_ref              VARCHAR(400),
    encryption_algorithm      VARCHAR(20)  NOT NULL DEFAULT 'AES-256-GCM',
    audit_retention_days      INTEGER      NOT NULL DEFAULT 2555,     -- 7y default for SOC 2
    anomaly_detection_enabled BOOLEAN      NOT NULL DEFAULT TRUE,
    updated_by                VARCHAR(100),
    updated_at                TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Tamper-evident security audit log (Cap T · append-only, cryptographic chain) ─────────────
-- Distinct from the domain event store (`events`): this is the admin-facing, forensic-grade
-- access/security audit. Each entry's entry_hash chains the previous hash, so any insertion,
-- deletion or edit anywhere in a workspace's history is detectable (AuditHashChain.verify).
-- seq is a per-workspace monotonic counter; (workspace_id, seq) is unique.
CREATE TABLE audit_log_entries (
    id            BIGSERIAL    PRIMARY KEY,
    workspace_id  VARCHAR(100) NOT NULL,
    seq           BIGINT       NOT NULL,
    actor_id      VARCHAR(100) NOT NULL,
    action        VARCHAR(80)  NOT NULL,
    target_type   VARCHAR(60),
    target_id     VARCHAR(120),
    detail        TEXT,
    ip_address    VARCHAR(60),
    user_agent    VARCHAR(400),
    occurred_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    prev_hash     VARCHAR(64)  NOT NULL,
    entry_hash    VARCHAR(64)  NOT NULL,
    UNIQUE (workspace_id, seq)
);
CREATE INDEX idx_audit_log_workspace_seq ON audit_log_entries(workspace_id, seq DESC);
CREATE INDEX idx_audit_log_action        ON audit_log_entries(workspace_id, action);
CREATE INDEX idx_audit_log_actor         ON audit_log_entries(workspace_id, actor_id);
CREATE INDEX idx_audit_log_occurred      ON audit_log_entries(workspace_id, occurred_at DESC);

-- Append-only enforcement at the DB layer: no UPDATE, no DELETE on the audit log, ever.
-- (Mirrors the events-table immutability trigger from V40.)
CREATE OR REPLACE FUNCTION audit_log_block_mutation() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'audit_log_entries is append-only (tamper-evident) and cannot be % ', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_log_no_update
    BEFORE UPDATE OR DELETE ON audit_log_entries
    FOR EACH ROW EXECUTE FUNCTION audit_log_block_mutation();

-- ── Audit log streaming to external SIEM (Cap T) ─────────────────────────────────────────────
CREATE TABLE audit_log_stream_configs (
    id                 VARCHAR(64)  PRIMARY KEY,
    workspace_id       VARCHAR(100) NOT NULL,
    provider           VARCHAR(20)  NOT NULL,            -- SPLUNK | DATADOG | ELK | WEBHOOK
    endpoint_url       TEXT         NOT NULL,
    auth_header        VARCHAR(400),                     -- bearer/HEC token; stored server-side only
    format             VARCHAR(20)  NOT NULL DEFAULT 'JSON',  -- JSON | CEF
    enabled            BOOLEAN      NOT NULL DEFAULT TRUE,
    last_streamed_seq  BIGINT       NOT NULL DEFAULT 0,
    last_streamed_at   TIMESTAMPTZ,
    created_by         VARCHAR(100),
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_stream_workspace ON audit_log_stream_configs(workspace_id);

-- ── Access anomalies (Cap T · AI flags unusual patterns) ─────────────────────────────────────
CREATE TABLE access_anomalies (
    id              VARCHAR(64)  PRIMARY KEY,
    workspace_id    VARCHAR(100) NOT NULL,
    subject_user_id VARCHAR(100) NOT NULL,
    type            VARCHAR(40)  NOT NULL,               -- NEW_GEO | MASS_EXPORT | PERMISSION_ESCALATION | OFF_HOURS_ACCESS | IMPOSSIBLE_TRAVEL
    severity        VARCHAR(10)  NOT NULL,               -- LOW | MEDIUM | HIGH
    summary         TEXT         NOT NULL,
    evidence        TEXT,                                -- JSON: the signals that triggered it
    detected_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    status          VARCHAR(12)  NOT NULL DEFAULT 'OPEN',-- OPEN | RESOLVED | DISMISSED
    resolved_by     VARCHAR(100),
    resolved_at     TIMESTAMPTZ
);
CREATE INDEX idx_anomalies_workspace ON access_anomalies(workspace_id, status);

-- ── Data subject requests — GDPR / DPDP (Cap T · export + right to be forgotten) ─────────────
CREATE TABLE data_subject_requests (
    id               VARCHAR(64)  PRIMARY KEY,
    workspace_id     VARCHAR(100) NOT NULL,
    subject_user_id  VARCHAR(100) NOT NULL,
    subject_email    VARCHAR(200),
    type             VARCHAR(12)  NOT NULL,              -- EXPORT | ERASURE
    status           VARCHAR(12)  NOT NULL DEFAULT 'PENDING', -- PENDING | PROCESSING | COMPLETED | FAILED
    requested_by     VARCHAR(100) NOT NULL,
    requested_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    completed_at     TIMESTAMPTZ,
    result_summary   TEXT,                               -- export payload (EXPORT) / shred receipt (ERASURE)
    notes            TEXT
);
CREATE INDEX idx_dsr_workspace ON data_subject_requests(workspace_id, status);

-- ── Compliance evidence bundles (Cap T · one-click SOC 2 / ISO 27001 package) ────────────────
CREATE TABLE compliance_evidence_bundles (
    id            VARCHAR(64)  PRIMARY KEY,
    workspace_id  VARCHAR(100) NOT NULL,
    framework     VARCHAR(20)  NOT NULL,                 -- SOC2_TYPE2 | ISO_27001
    status        VARCHAR(12)  NOT NULL DEFAULT 'BUILDING', -- BUILDING | READY | DOWNLOADED
    period_start  DATE,
    period_end    DATE,
    summary       TEXT,                                  -- JSON: control coverage snapshot
    generated_by  VARCHAR(100),
    generated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    downloaded_at TIMESTAMPTZ
);
CREATE INDEX idx_evidence_workspace ON compliance_evidence_bundles(workspace_id);

-- ── Penetration-test / red-team / bug-bounty register (Cap T) ────────────────────────────────
CREATE TABLE pentest_engagements (
    id                 VARCHAR(64)  PRIMARY KEY,
    workspace_id       VARCHAR(100) NOT NULL,
    vendor             VARCHAR(160) NOT NULL,
    engagement_type    VARCHAR(16)  NOT NULL DEFAULT 'PENTEST', -- PENTEST | RED_TEAM | BUG_BOUNTY
    scope              TEXT,
    status             VARCHAR(14)  NOT NULL DEFAULT 'PLANNED',  -- PLANNED | IN_PROGRESS | COMPLETED
    started_on         DATE,
    completed_on       DATE,
    findings_critical  INTEGER      NOT NULL DEFAULT 0,
    findings_high      INTEGER      NOT NULL DEFAULT 0,
    findings_medium    INTEGER      NOT NULL DEFAULT 0,
    findings_low       INTEGER      NOT NULL DEFAULT 0,
    report_ref         VARCHAR(400),                     -- link to the report held under NDA
    created_by         VARCHAR(100),
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_pentest_workspace ON pentest_engagements(workspace_id);

-- ── Demo seed (workspace WS-001) ─────────────────────────────────────────────────────────────
INSERT INTO workspace_security_settings
    (workspace_id, data_residency_region, byok_enabled, byok_provider, byok_key_ref,
     audit_retention_days, anomaly_detection_enabled, updated_by)
VALUES
    ('WS-001', 'IN', TRUE, 'AWS_KMS', 'arn:aws:kms:ap-south-1:000000000000:key/bcits-master',
     2555, TRUE, 'USR-DEV1');

INSERT INTO conditional_access_policies
    (id, workspace_id, name, enabled, applies_to_role, ip_allowlist, geo_allowlist,
     require_device_trust, time_zone, allowed_start_minute, allowed_end_minute, created_by)
VALUES
    ('CAP-0001', 'WS-001', 'Admins from corporate network only', TRUE, 'ADMIN',
     '10.0.0.0/8,203.0.113.0/24', 'IN', TRUE, 'Asia/Kolkata', NULL, NULL, 'USR-DEV1'),
    ('CAP-0002', 'WS-001', 'Business-hours access for all members', TRUE, NULL,
     '', 'IN', FALSE, 'Asia/Kolkata', 360, 1320, 'USR-DEV1');   -- 06:00–22:00 IST

INSERT INTO access_anomalies
    (id, workspace_id, subject_user_id, type, severity, summary, evidence, status)
VALUES
    ('ANM-0001', 'WS-001', 'USR-DEV2', 'NEW_GEO', 'HIGH',
     'Sign-in from a new country (Singapore) at 03:14 IST',
     '{"country":"SG","localTime":"03:14","usualCountries":["IN"]}', 'OPEN'),
    ('ANM-0002', 'WS-001', 'USR-DEV2', 'MASS_EXPORT', 'MEDIUM',
     'Exported 1,240 work items in 4 minutes — 18x the user''s daily norm',
     '{"exported":1240,"windowMinutes":4,"dailyNorm":68}', 'OPEN');

INSERT INTO pentest_engagements
    (id, workspace_id, vendor, engagement_type, scope, status, started_on, completed_on,
     findings_critical, findings_high, findings_medium, findings_low, report_ref, created_by)
VALUES
    ('PEN-0001', 'WS-001', 'NCC Group', 'PENTEST', 'Web app + API, grey-box', 'COMPLETED',
     DATE '2026-03-02', DATE '2026-03-13', 0, 1, 4, 7,
     'vault://pentests/2026-Q1-ncc.pdf', 'USR-DEV1'),
    ('PEN-0002', 'WS-001', 'HackerOne', 'BUG_BOUNTY', 'Continuous public program', 'IN_PROGRESS',
     DATE '2026-05-01', NULL, 0, 0, 2, 5, NULL, 'USR-DEV1');

-- Tamper-evident audit seed: a 4-link chain whose hashes are computed with the same SHA-256
-- canonical form the application uses (AuditHashChain): sha256( prev_hash ':' workspace_id ':'
-- seq ':' actor_id ':' action ':' target_type ':' target_id ':' epoch_seconds ':' detail ).
-- Genesis prev_hash is 64 zeros. A recursive CTE walks the chain so each entry_hash feeds the next.
WITH RECURSIVE seed(seq, actor_id, action, target_type, target_id, detail, occurred_at) AS (
    VALUES
        (1, 'USR-DEV1', 'SECURITY_SETTINGS_UPDATED', 'workspace', 'WS-001',
            'Enabled BYOK (AWS_KMS), residency IN', TIMESTAMPTZ '2026-06-01 09:05:00+05:30'),
        (2, 'USR-DEV1', 'CONDITIONAL_ACCESS_CREATED', 'policy', 'CAP-0001',
            'Admins from corporate network only', TIMESTAMPTZ '2026-06-01 09:11:00+05:30'),
        (3, 'USR-DEV2', 'PASSKEY_REGISTERED', 'user', 'USR-DEV2',
            'Registered passkey "MacBook Touch ID"', TIMESTAMPTZ '2026-06-03 14:22:00+05:30'),
        (4, 'USR-DEV1', 'AUDIT_STREAM_CONFIGURED', 'siem', 'SPLUNK',
            'Streaming to Splunk HEC', TIMESTAMPTZ '2026-06-05 11:40:00+05:30')
),
chained AS (
    SELECT s.seq, s.actor_id, s.action, s.target_type, s.target_id, s.detail, s.occurred_at,
           repeat('0', 64) AS prev_hash,
           encode(digest(
               repeat('0', 64) || ':WS-001:' || s.seq || ':' || s.actor_id || ':' || s.action ||
               ':' || s.target_type || ':' || s.target_id || ':' ||
               (extract(epoch FROM s.occurred_at)::bigint)::text || ':' || s.detail,
               'sha256'), 'hex') AS entry_hash
    FROM seed s WHERE s.seq = 1
    UNION ALL
    SELECT s.seq, s.actor_id, s.action, s.target_type, s.target_id, s.detail, s.occurred_at,
           c.entry_hash AS prev_hash,
           encode(digest(
               c.entry_hash || ':WS-001:' || s.seq || ':' || s.actor_id || ':' || s.action ||
               ':' || s.target_type || ':' || s.target_id || ':' ||
               (extract(epoch FROM s.occurred_at)::bigint)::text || ':' || s.detail,
               'sha256'), 'hex') AS entry_hash
    FROM seed s JOIN chained c ON s.seq = c.seq + 1
)
INSERT INTO audit_log_entries
    (workspace_id, seq, actor_id, action, target_type, target_id, detail, ip_address,
     user_agent, occurred_at, prev_hash, entry_hash)
SELECT 'WS-001', seq, actor_id, action, target_type, target_id, detail,
       '203.0.113.42', 'Mozilla/5.0', occurred_at, prev_hash, entry_hash
FROM chained;
