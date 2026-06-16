-- KR-041: full-text search across article title + content.
-- text_content is maintained via @PrePersist/@PreUpdate in the Article entity
-- so the index stays consistent with writes without a trigger.
ALTER TABLE articles ADD COLUMN text_content TEXT;

-- Functional GIN index for fast tsvector lookups.
CREATE INDEX idx_articles_fts
    ON articles USING GIN (to_tsvector('english', coalesce(text_content, '')));

-- Backfill existing rows.
UPDATE articles SET text_content = COALESCE(title, '') || ' ' || COALESCE(content, '');
