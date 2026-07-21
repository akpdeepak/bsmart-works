-- V110: PII vault — per-subject opaque tokens + per-subject data keys (RB-40 §3, EPIC-P1-pii-vault).
--
-- EXPAND phase of the expand → backfill → switch → contract sequence (RB-10 §3 zero-downtime,
-- forward-only). Purely additive: it adds the opaque subject token to the owning row and a store
-- for each subject's envelope-wrapped data key (DEK). NO data moves here and the legacy plaintext
-- PII columns (users.email / users.full_name / ...) stay authoritative. The irreversible CONTRACT
-- migration that drops them is deferred until the vault is the proven source of truth in production
-- and a full backup-retention cycle has rolled (EPIC §3/§12 — Deepak decision 2026-06-20).
--
-- To change anything here, write a new forward migration (V111+). Never edit a shipped migration.

-- ── users.subject_token: the opaque per-subject identity token (EPIC §2) ─────────────────────────
-- Minted once per subject, stable for the subject's lifetime, and used as
-- pii_vault_entries.subject_id / subject_data_keys.subject_id. It is NOT derived from the email
-- (no rainbow-table risk) so historical tokenized events keep resolving — until the key is shredded,
-- at which point they resolve to "[erased]". Nullable during EXPAND/backfill; uniqueness enforced.
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS subject_token VARCHAR(100);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_subject_token ON users(subject_token);

-- ── subject_data_keys: one envelope-wrapped data key (DEK) per data subject (EPIC §2) ────────────
-- Each subject has its own AES-256 DEK that encrypts that subject's pii_vault_entries rows. The DEK
-- is persisted ONLY as wrapped_dek — envelope-encrypted under the workspace KEK held by the KMS —
-- and never in plaintext. This is the structural fix for the per-workspace-key flaw (RB-40 §3 §1):
-- the unit of destruction is ONE subject's DEK, not a key shared across the workspace.
--
-- "Forget" (crypto-shred) sets key_state = 'SHREDDED', NULLs wrapped_dek, stamps shredded_at, and
-- hard-deletes the subject's pii_vault_entries rows. The DEK then becomes unrecoverable, so any
-- ciphertext that lingers in a backup is permanently undecryptable (RB-40 §3 rule 2). The surrogate
-- id + subject_token survive so the event history stays re-derivable (rule 3).
--
-- Workspace-scoped (RB-40 §1): workspace_id carries residency; the central Hibernate @Filter applies
-- to workspace-owned subjects (customer/stakeholder). Global-by-design user identity is vaulted under
-- the reserved 'PLATFORM' scope and accessed via the system path (like the users table itself).
CREATE TABLE IF NOT EXISTS subject_data_keys (
    id            VARCHAR(100) PRIMARY KEY,
    workspace_id  VARCHAR(100) NOT NULL,
    subject_id    VARCHAR(100) NOT NULL,    -- the opaque subject_token
    wrapped_dek   TEXT,                      -- DEK envelope-encrypted under the workspace KEK; NULL once shredded
    key_ref       VARCHAR(200),              -- KMS KEK reference/version that wrapped the DEK (for rotation)
    key_state     VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',   -- ACTIVE | SHREDDED
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    shredded_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_subject_data_keys_workspace ON subject_data_keys(workspace_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_subject_data_keys_unique ON subject_data_keys(workspace_id, subject_id);
