-- V106: space_followers — per-(user,space) follow rows so a follower is notified when a new
-- article is published in a space they follow (SPACE_ARTICLE_PUBLISHED event).
-- Workspace-scoped via space.workspace_id.

CREATE TABLE IF NOT EXISTS space_followers (
  user_id      TEXT        NOT NULL,
  space_id     TEXT        NOT NULL,
  workspace_id TEXT        NOT NULL,
  followed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, space_id)
);

CREATE INDEX IF NOT EXISTS idx_space_followers_space
  ON space_followers(space_id, workspace_id);
