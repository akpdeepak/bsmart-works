-- KR-066: Article public share link — a PUBLISHED article can be shared via
-- a unique URL-safe token with no authentication required.
ALTER TABLE articles ADD COLUMN IF NOT EXISTS public_share_token VARCHAR(64) UNIQUE;
CREATE INDEX IF NOT EXISTS idx_articles_public_share_token ON articles(public_share_token) WHERE public_share_token IS NOT NULL;
