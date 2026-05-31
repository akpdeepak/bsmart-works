-- V15: MFA via TOTP
-- Adds mfa_enabled flag and mfa_secret (base32-encoded TOTP secret) to users.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN     NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS mfa_secret  VARCHAR(64);
