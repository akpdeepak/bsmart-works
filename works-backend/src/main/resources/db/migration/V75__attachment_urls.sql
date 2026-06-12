-- =====================================================================
-- URL / webpage attachments (Files surface)
-- =====================================================================
-- Lets the Files section hold external links (URLs, webpages) alongside uploaded files.
--   attachment_type — FILE (default, existing behavior) | URL
--   url             — the external link for URL attachments; null for files
-- URL attachments have no stored binary, so storage_path becomes nullable.
-- Forward-only (RB-10 §3).

ALTER TABLE attachments ADD COLUMN IF NOT EXISTS attachment_type VARCHAR(20) NOT NULL DEFAULT 'FILE';
ALTER TABLE attachments ADD COLUMN IF NOT EXISTS url VARCHAR(2048);
ALTER TABLE attachments ALTER COLUMN storage_path DROP NOT NULL;

ALTER TABLE attachments
    ADD CONSTRAINT chk_attachments_type CHECK (attachment_type IN ('FILE', 'URL'));
