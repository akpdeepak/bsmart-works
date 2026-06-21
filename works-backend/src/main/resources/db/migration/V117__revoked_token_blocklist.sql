-- W1 Phase-1 / rate-limit & JWT revocation PR2 — individual-token (jti) blocklist for logout.
--
-- PR1 added a per-subject "valid after" cutoff (coarse: revokes ALL of a subject's tokens on
-- erase/password-change/reset). PR2 adds fine-grained, per-token revocation so a single device/session
-- can be logged out without invalidating the user's other sessions: /auth/logout (and the portal
-- equivalent) records the presented token's jti here, and the auth boundary rejects any token whose
-- jti is listed. Distributed by construction — the list lives in the shared DB, so a logout is honoured
-- across all app instances immediately (the property the in-memory RateLimiter lacks).
--
-- expires_at holds the token's own exp so listed entries are pruned once the token would have expired
-- anyway (opportunistically on each insert, indexed below) — the table stays bounded by the 7-day
-- token lifetime, never growing without limit. Forward-only, additive.
CREATE TABLE revoked_tokens (
    jti        VARCHAR(64)  PRIMARY KEY,
    subject    VARCHAR(100) NOT NULL,        -- user/customer id, for audit + correlation
    scope      VARCHAR(20)  NOT NULL,        -- 'internal' | 'customer'
    expires_at TIMESTAMPTZ  NOT NULL,        -- the token's exp; entries past this are prunable
    revoked_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Supports the opportunistic prune of expired entries.
CREATE INDEX idx_revoked_tokens_expires_at ON revoked_tokens(expires_at);
