-- V111: email blind index for the PII vault (RB-40 §3, EPIC-P1-pii-vault Slice 2).
--
-- Tokenizing users.email moves the raw address into the vault, but email is the LOGIN identifier —
-- login can no longer SELECT ... WHERE email = ?. The blind index solves this: email_hmac is a
-- deterministic HMAC-SHA256 of the normalized email under a separate server-managed key, so login can
-- still do an O(1) lookup (WHERE email_hmac = ?) without the raw address being queryable. The HMAC is
-- one-way (no rainbow-table risk without the key) and the key is never in the database.
--
-- EXPAND phase: additive + nullable during backfill. The legacy email column stays authoritative
-- until the deferred CONTRACT migration drops it (EPIC §3/§12). A unique index enforces email
-- uniqueness via the blind index (Postgres treats NULLs as distinct, so un-backfilled rows don't clash).
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS email_hmac VARCHAR(64);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_hmac ON users(email_hmac);
