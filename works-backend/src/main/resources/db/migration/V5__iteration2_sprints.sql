-- ============================================================
-- V5: Iteration 2 — Sprints, Backlog, WorkItem Links,
--     Attachments, Activity Log, Saved Filters
-- ============================================================

-- 1. Sprints
CREATE TABLE sprints (
    id           VARCHAR(50) PRIMARY KEY,
    project_id   VARCHAR(50) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name         VARCHAR(255) NOT NULL,
    goal         TEXT,
    status       VARCHAR(20) NOT NULL DEFAULT 'PLANNING', -- PLANNING | ACTIVE | COMPLETED
    start_date   DATE,
    end_date     DATE,
    capacity     INT DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Backlog ordering — position of each work item in the backlog
ALTER TABLE work_items
    ADD COLUMN IF NOT EXISTS sprint_id      VARCHAR(50) REFERENCES sprints(id),
    ADD COLUMN IF NOT EXISTS backlog_order  INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS story_points   INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS priority       VARCHAR(20) DEFAULT 'MEDIUM'; -- LOW | MEDIUM | HIGH | CRITICAL

-- 3. Work item links (blocks, blocked-by, relates-to, duplicates, parent)
CREATE TABLE work_item_links (
    id             BIGSERIAL PRIMARY KEY,
    source_id      VARCHAR(50) NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
    target_id      VARCHAR(50) NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
    link_type      VARCHAR(30) NOT NULL, -- BLOCKS | BLOCKED_BY | RELATES_TO | DUPLICATES | PARENT | CHILD
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (source_id, target_id, link_type)
);

-- 4. Attachments
CREATE TABLE attachments (
    id             BIGSERIAL PRIMARY KEY,
    work_item_id   VARCHAR(50) NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
    uploaded_by    VARCHAR(50) REFERENCES users(id),
    file_name      VARCHAR(255) NOT NULL,
    file_size      BIGINT NOT NULL DEFAULT 0,
    mime_type      VARCHAR(100),
    storage_path   VARCHAR(500) NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Saved filters
CREATE TABLE saved_filters (
    id             BIGSERIAL PRIMARY KEY,
    workspace_id   VARCHAR(50) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    created_by     VARCHAR(50) REFERENCES users(id),
    name           VARCHAR(100) NOT NULL,
    filter_json    TEXT NOT NULL,
    is_shared      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Seed a default sprint for the WEB project
INSERT INTO sprints (id, project_id, name, goal, status, start_date, end_date, capacity)
VALUES ('SPR-001', 'PROJ-001', 'Sprint 1', 'Stabilize portal, ship SAML auth', 'PLANNING',
        CURRENT_DATE, CURRENT_DATE + INTERVAL '14 days', 40);
