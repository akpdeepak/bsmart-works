-- V100: KR-029 emoji reactions on articles
CREATE TABLE IF NOT EXISTS article_reactions (
  id             VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  article_id     VARCHAR(36) NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  workspace_id   VARCHAR(36) NOT NULL,
  user_id        VARCHAR(36) NOT NULL,
  emoji          VARCHAR(10) NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (article_id, user_id, emoji)
);
CREATE INDEX IF NOT EXISTS idx_article_reactions_article   ON article_reactions(article_id);
CREATE INDEX IF NOT EXISTS idx_article_reactions_workspace ON article_reactions(workspace_id);
