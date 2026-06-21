-- V112: PII vault Slice 3 — customer-portal users, stakeholders, and the two persisted denorm copies
-- (RB-40 §3, EPIC-P1-pii-vault Slice 3).
--
-- EXPAND phase of expand → backfill → switch → contract (RB-10 §3 zero-downtime, forward-only).
-- Purely additive: adds the opaque per-subject token to the two remaining subject populations
-- (customer_users, stakeholder), an email blind index to customer_users (portal login is a separate
-- identity system), and a customer_subject_token reference to the two tables that today persist a
-- denormalised PII copy (chat_conversations.customer_name, customer_feedback_items.customer). NO data
-- moves here and every legacy plaintext column stays authoritative. The irreversible CONTRACT
-- migration that drops the legacy columns is deferred until the vault is the proven prod source of
-- truth + a full backup-retention cycle has rolled (EPIC §3/§12 — Deepak decision 2026-06-20).
--
-- To change anything here, write a new forward migration (V113+). Never edit a shipped migration.

-- ── customer_users: external customer-portal identity (a SEPARATE login from users) ───────────────
-- subject_token: opaque per-subject token (not derived from email → no rainbow-table risk), used as
-- pii_vault_entries.subject_id / subject_data_keys.subject_id. email_hmac: deterministic keyed
-- HMAC-SHA256 of the normalized email (BlindIndexService) so portal login keeps an O(1) lookup once
-- the raw email is tokenized. Both nullable during EXPAND/backfill; unique (Postgres treats NULLs as
-- distinct, so un-backfilled rows don't clash).
ALTER TABLE customer_users
    ADD COLUMN IF NOT EXISTS subject_token VARCHAR(100);
ALTER TABLE customer_users
    ADD COLUMN IF NOT EXISTS email_hmac VARCHAR(64);

CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_users_subject_token ON customer_users(subject_token);
CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_users_email_hmac ON customer_users(email_hmac);

-- ── stakeholder: external stakeholder register (often a non-user; no login → no blind index) ──────
-- name / email / organization / notes (free-text) are tokenized into the vault under this token.
ALTER TABLE stakeholder
    ADD COLUMN IF NOT EXISTS subject_token VARCHAR(100);

CREATE UNIQUE INDEX IF NOT EXISTS idx_stakeholder_subject_token ON stakeholder(subject_token);

-- ── denorm copies → token + render-time resolution (RB-40 §3 rule 3) ──────────────────────────────
-- These persisted copies survive a crypto-shred today and break "projections re-derivable from
-- tokenized events alone". Replace each with a subject token that resolves the customer's display
-- name at render (and to "[erased]" after a shred). chat_conversations.customer_subject_token points
-- at the conversation's CustomerUser subject; customer_feedback_items.customer_subject_token is a
-- per-record token for the free-text attribution. Legacy columns stay until the deferred CONTRACT.
ALTER TABLE chat_conversations
    ADD COLUMN IF NOT EXISTS customer_subject_token VARCHAR(100);

ALTER TABLE customer_feedback_items
    ADD COLUMN IF NOT EXISTS customer_subject_token VARCHAR(100);
