-- V108: KR-019 article approval workflow
CREATE TABLE IF NOT EXISTS article_approvals (
  id             VARCHAR(36)  PRIMARY KEY,
  article_id     VARCHAR(36)  NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  reviewer_id    VARCHAR(36)  NOT NULL,
  workspace_id   VARCHAR(36)  NOT NULL,
  decision       VARCHAR(30)  NOT NULL CHECK (decision IN ('APPROVED', 'CHANGES_REQUESTED')),
  comment        TEXT,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_article_approvals_article ON article_approvals(article_id, workspace_id);
ALTER TABLE knowledge_spaces ADD COLUMN IF NOT EXISTS required_approvals INTEGER NOT NULL DEFAULT 1;
