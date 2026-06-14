-- V86: saved-view subscriptions — a user subscribes to a saved view and gets a periodic
-- in-app + email summary of how many items currently match (JIRA "subscribe to a filter").
-- The scheduler runs each due subscription through the same audited, workspace-scoped run path as
-- a manual saved-view run (V85), so a subscription delivery is itself a "saved/automated run".

CREATE TABLE bql_subscriptions (
    id             VARCHAR(50)  PRIMARY KEY,
    workspace_id   VARCHAR(50)  NOT NULL REFERENCES workspaces(id)  ON DELETE CASCADE,
    saved_view_id  VARCHAR(50)  NOT NULL REFERENCES saved_views(id) ON DELETE CASCADE,
    user_id        VARCHAR(50)  NOT NULL REFERENCES users(id)       ON DELETE CASCADE,
    frequency      VARCHAR(10)  NOT NULL,        -- DAILY | WEEKLY
    channels       VARCHAR(10)  NOT NULL,        -- IN_APP | EMAIL | BOTH
    active         BOOLEAN      NOT NULL DEFAULT true,
    last_run_at    TIMESTAMPTZ,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    -- One subscription per user per view (toggle channels/frequency instead of duplicating).
    CONSTRAINT uq_bql_sub_view_user UNIQUE (saved_view_id, user_id)
);

-- Scheduler hot path: "active subscriptions, oldest delivery first".
CREATE INDEX idx_bql_subs_due ON bql_subscriptions (active, last_run_at);
