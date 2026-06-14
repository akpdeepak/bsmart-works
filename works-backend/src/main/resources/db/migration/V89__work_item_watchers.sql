-- V89: work-item watchers (followers). A user "watches" a work item to receive a notification on
-- any field change or new comment (Deliver Cap). Composite PK (one row per user per item); rows are
-- removed on unwatch. work_items.id and users.id are varchar (e.g. 'WI-1', user uuids/keys).
--
-- Tenant safety: a watcher row only exists for a user who could view the item (the watch endpoint
-- RBAC-checks before inserting); the FK to work_items cascades a hard item delete so no orphans.
CREATE TABLE work_item_watchers (
    work_item_id VARCHAR(64)  NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
    user_id      VARCHAR(64)  NOT NULL,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    PRIMARY KEY (work_item_id, user_id)
);

-- Fan-out reads "who watches this item"; the PK covers (work_item_id, ...). Add an index on user_id
-- for the reverse lookup ("what do I watch") used by the personal-home / notification surfaces.
CREATE INDEX idx_work_item_watchers_user ON work_item_watchers(user_id);
