-- V113: PII vault Slice 4b — tenant-declared PII custom fields (RB-40 §3, EPIC-P1-pii-vault §9/§5.2 #11).
--
-- EXPAND phase (additive, forward-only). Static inventory can never cover tenant-DEFINED field
-- semantics, so a workspace can now flag a custom field as PII: its text values are tokenized into the
-- per-subject crypto-shred vault instead of living in plaintext on work_item_field_value. This adds:
--   * field_def.pii — the per-field PII flag (default false → existing fields unaffected).
--   * work_item_field_value.subject_token — the opaque per-value vault token for a PII-flagged field's
--     text value; resolved at render and "[erased]" after a crypto-shred. The legacy value_text column
--     stays authoritative until the deferred CONTRACT migration drops it (EPIC §3/§12).
--
-- To change anything here, write a new forward migration (V114+). Never edit a shipped migration.

ALTER TABLE field_def
    ADD COLUMN IF NOT EXISTS pii BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE work_item_field_value
    ADD COLUMN IF NOT EXISTS subject_token VARCHAR(100);
