-- V16: Slug-based project URLs
-- Adds a unique slug column to projects, generated from keyPrefix at migration time.
-- Going forward, slug is set on create and exposed via API for clean URLs.

ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS slug VARCHAR(80) UNIQUE;

-- Backfill: lowercase key_prefix as slug for existing projects
UPDATE projects
SET    slug = LOWER(REPLACE(key_prefix, ' ', '-'))
WHERE  slug IS NULL;

-- After backfill, make NOT NULL
ALTER TABLE projects
    ALTER COLUMN slug SET NOT NULL;
