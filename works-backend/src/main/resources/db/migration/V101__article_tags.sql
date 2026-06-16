-- KR-034 — article tags/labels
CREATE TABLE IF NOT EXISTS article_tags (
  id           VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id VARCHAR(36) NOT NULL,
  name         VARCHAR(100) NOT NULL,
  color        VARCHAR(50) NOT NULL DEFAULT 'bg-neutral-200 dark:bg-neutral-700',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, name)
);

CREATE TABLE IF NOT EXISTS article_tag_assignments (
  article_id VARCHAR(36) NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  tag_id     VARCHAR(36) NOT NULL REFERENCES article_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_article_tags_workspace ON article_tags(workspace_id);
CREATE INDEX IF NOT EXISTS idx_article_tag_assignments_article ON article_tag_assignments(article_id);
CREATE INDEX IF NOT EXISTS idx_article_tag_assignments_tag ON article_tag_assignments(tag_id);
