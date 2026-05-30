-- ============================================================
-- V6: Iteration 1 Gaps — attachments, comment flags,
--     project members, project archive, notification prefs
-- ============================================================

-- 1. Attachments table (file upload storage)
CREATE TABLE IF NOT EXISTS attachments (
    id             BIGSERIAL PRIMARY KEY,
    work_item_id   VARCHAR(50) NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
    uploaded_by    VARCHAR(50) REFERENCES users(id),
    file_name      VARCHAR(255) NOT NULL,
    file_size      BIGINT NOT NULL DEFAULT 0,
    mime_type      VARCHAR(100),
    storage_path   VARCHAR(500) NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Comment internal flag
ALTER TABLE comments
    ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Project members
CREATE TABLE IF NOT EXISTS project_members (
    project_id  VARCHAR(50) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id     VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role        VARCHAR(30) NOT NULL DEFAULT 'MEMBER',
    PRIMARY KEY (project_id, user_id)
);

-- 4. Project archive flag
ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;

-- 5. Notification preferences per user
CREATE TABLE IF NOT EXISTS notification_preferences (
    user_id        VARCHAR(50) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    notify_assign  BOOLEAN NOT NULL DEFAULT TRUE,
    notify_comment BOOLEAN NOT NULL DEFAULT TRUE,
    notify_mention BOOLEAN NOT NULL DEFAULT TRUE,
    email_digest   BOOLEAN NOT NULL DEFAULT FALSE
);

-- Seed default prefs for existing users
INSERT INTO notification_preferences (user_id) VALUES ('USR-001') ON CONFLICT DO NOTHING;

-- 6. Seed USR-001 as PROJ-001 member
INSERT INTO project_members (project_id, user_id, role) VALUES ('PROJ-001', 'USR-001', 'LEAD') ON CONFLICT DO NOTHING;
