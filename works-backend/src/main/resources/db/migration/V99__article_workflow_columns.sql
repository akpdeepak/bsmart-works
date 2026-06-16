-- V99: KR-018 reviewer assignment, KR-019 approval requirement,
-- KR-020 scheduled publish, KR-021 review-by date
-- Note: reviewer_id was already present in the articles table from the initial schema.
ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS requires_approval     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS scheduled_publish_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_by_date        DATE;
