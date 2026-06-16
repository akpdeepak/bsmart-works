-- V105: article_watchers — per-(user,article) watch rows so a watcher is notified on
-- article updates (ARTICLE_WATCHER_NOTIFIED event). Workspace-scoped via article's space.
-- Idempotent toggle: POST /articles/{id}/watch upserts; DELETE removes (handled in service).

CREATE TABLE IF NOT EXISTS article_watchers (
  user_id      TEXT        NOT NULL,
  article_id   TEXT        NOT NULL,
  workspace_id TEXT        NOT NULL,
  watched_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, article_id)
);

CREATE INDEX IF NOT EXISTS idx_article_watchers_article
  ON article_watchers(article_id, workspace_id);
