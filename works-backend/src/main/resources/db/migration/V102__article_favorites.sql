-- KR-035 — starred/favorite articles per user
CREATE TABLE IF NOT EXISTS article_favorites (
  user_id    VARCHAR(36) NOT NULL,
  article_id VARCHAR(36) NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  workspace_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, article_id)
);
CREATE INDEX IF NOT EXISTS idx_article_favorites_user ON article_favorites(user_id, workspace_id);
