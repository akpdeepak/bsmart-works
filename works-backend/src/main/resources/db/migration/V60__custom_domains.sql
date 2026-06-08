-- V60: Custom domain management (B14)
-- Backend infrastructure for workspace-owned custom domains.
-- DNS / SSL provisioning happens in production (deferred); this migration creates the schema
-- so the service and controller are fully functional from day one.
-- Forward-only (RB-10 §3); IF NOT EXISTS keeps this idempotent on re-apply.

CREATE TABLE IF NOT EXISTS custom_domains (
    id           VARCHAR(36)  PRIMARY KEY,
    workspace_id VARCHAR(36)  NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    domain       VARCHAR(255) NOT NULL UNIQUE,
    status       VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
                              -- PENDING | VERIFIED | ACTIVE | FAILED
    verified_at  TIMESTAMPTZ,
    ssl_status   VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
                              -- PENDING | PROVISIONED | FAILED
    created_by   VARCHAR(36)  NOT NULL,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at   TIMESTAMPTZ
);

-- Index for the common workspace-scoped list query (RB-40 §1)
CREATE INDEX IF NOT EXISTS idx_custom_domains_workspace ON custom_domains(workspace_id);

-- Unique domain among non-deleted rows — a domain may be re-registered after soft-delete
CREATE UNIQUE INDEX IF NOT EXISTS idx_custom_domains_domain_active
    ON custom_domains(domain) WHERE deleted_at IS NULL;
