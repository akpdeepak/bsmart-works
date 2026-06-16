-- V109: KR-021 stale indicator column
ALTER TABLE articles ADD COLUMN IF NOT EXISTS is_stale BOOLEAN NOT NULL DEFAULT false;
