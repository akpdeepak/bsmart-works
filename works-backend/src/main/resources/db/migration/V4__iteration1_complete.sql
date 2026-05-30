-- ============================================================
-- V4: Iteration 1 Complete — Projects, Tags, Assignee, Comments,
--     Notifications, Search index, Event store, Password reset
-- ============================================================

-- 1. Projects
CREATE TABLE projects (
    id          VARCHAR(50) PRIMARY KEY,
    workspace_id VARCHAR(50) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    key_prefix  VARCHAR(10)  NOT NULL,
    description TEXT,
    lead_user_id VARCHAR(50) REFERENCES users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO projects (id, workspace_id, name, key_prefix, description, lead_user_id)
VALUES ('PROJ-001', 'WS-001', 'WEB Portal', 'WEB', 'BCITS Web Portal project', 'USR-001');

-- 2. Add new columns to work_items
ALTER TABLE work_items
    ADD COLUMN IF NOT EXISTS description     TEXT,
    ADD COLUMN IF NOT EXISTS assignee_id     VARCHAR(50) REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS due_date        DATE,
    ADD COLUMN IF NOT EXISTS project_id      VARCHAR(50) REFERENCES projects(id),
    ADD COLUMN IF NOT EXISTS created_by      VARCHAR(50) REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE work_items SET project_id = 'PROJ-001' WHERE project_id IS NULL;

-- 3. Tags
CREATE TABLE tags (
    id          SERIAL PRIMARY KEY,
    work_item_id VARCHAR(50) NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
    tag         VARCHAR(100) NOT NULL
);

-- 4. Comments
CREATE TABLE comments (
    id           BIGSERIAL PRIMARY KEY,
    work_item_id VARCHAR(50) NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
    author_id    VARCHAR(50) NOT NULL REFERENCES users(id),
    body         TEXT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Notifications
CREATE TABLE notifications (
    id           BIGSERIAL PRIMARY KEY,
    user_id      VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type         VARCHAR(50) NOT NULL,
    message      TEXT NOT NULL,
    link         VARCHAR(255),
    is_read      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Event store (proper, for all entities)
CREATE TABLE IF NOT EXISTS events (
    id           BIGSERIAL PRIMARY KEY,
    aggregate_id VARCHAR(100) NOT NULL,
    event_type   VARCHAR(100) NOT NULL,
    actor_id     VARCHAR(50),
    payload      TEXT NOT NULL,
    occurred_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Password reset tokens
CREATE TABLE password_reset_tokens (
    token       VARCHAR(255) PRIMARY KEY,
    user_id     VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at  TIMESTAMPTZ NOT NULL,
    used        BOOLEAN NOT NULL DEFAULT FALSE
);
