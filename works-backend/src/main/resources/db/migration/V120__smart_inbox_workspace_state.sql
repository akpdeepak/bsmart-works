-- EPIC 8: action-first Smart Inbox.
-- Notifications now carry explicit tenant ownership. Legacy rows are backfilled only when their
-- source link resolves to an entity with a provable workspace; unresolved rows remain null and are
-- deliberately excluded from workspace-scoped Inbox/activity reads.

ALTER TABLE notifications
    ADD COLUMN workspace_id VARCHAR(100) REFERENCES workspaces(id) ON DELETE CASCADE;

UPDATE notifications n
SET workspace_id = p.workspace_id
FROM work_items wi
JOIN projects p ON p.id = wi.project_id
WHERE n.workspace_id IS NULL
  AND n.link ~ '^/items/[^/?]+'
  AND wi.id = substring(n.link FROM '^/items/([^/?]+)');

UPDATE notifications n
SET workspace_id = cc.workspace_id
FROM chat_conversations cc
WHERE n.workspace_id IS NULL
  AND n.link ~ '^/support/inbox/[^/?]+'
  AND cc.id = substring(n.link FROM '^/support/inbox/([^/?]+)');

UPDATE notifications n
SET workspace_id = r.workspace_id
FROM reports r
WHERE n.workspace_id IS NULL
  AND n.link ~ '^/reports/[^/?]+'
  AND r.id = substring(n.link FROM '^/reports/([^/?]+)')
  AND r.workspace_id IS NOT NULL;

CREATE INDEX idx_notifications_workspace_user_unread
    ON notifications(workspace_id, user_id, is_read, created_at DESC);

-- State belongs to the Inbox projection, not to source entities or notification history. The item
-- key is stable by source (for example article:ART-1 or notification:42), so regenerated projections
-- retain the caller's snooze/done choice without mutating the source record.
CREATE TABLE inbox_item_states (
    workspace_id VARCHAR(100) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id      VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_key     VARCHAR(180) NOT NULL,
    snoozed_until TIMESTAMPTZ,
    resolved_at   TIMESTAMPTZ,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (workspace_id, user_id, item_key)
);

CREATE INDEX idx_inbox_state_visible
    ON inbox_item_states(workspace_id, user_id, resolved_at, snoozed_until);
