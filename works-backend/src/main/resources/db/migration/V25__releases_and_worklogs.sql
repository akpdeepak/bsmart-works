-- V25: Releases / version planning + time tracking worklogs

CREATE TABLE releases (
    id           VARCHAR(50) PRIMARY KEY,
    project_id   VARCHAR(100) NOT NULL REFERENCES projects(id),
    name         TEXT NOT NULL,
    description  TEXT,
    version      TEXT NOT NULL,
    status       VARCHAR(20) NOT NULL DEFAULT 'PLANNED',  -- PLANNED | IN_PROGRESS | RELEASED | ARCHIVED
    release_date DATE,
    released_at  TIMESTAMPTZ,
    created_by   VARCHAR(100) REFERENCES users(id),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE work_item_releases (
    work_item_id VARCHAR(100) NOT NULL,
    release_id   VARCHAR(50)  NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (work_item_id, release_id)
);

CREATE TABLE worklogs (
    id                   SERIAL PRIMARY KEY,
    work_item_id         VARCHAR(100) NOT NULL,
    user_id              VARCHAR(100) NOT NULL REFERENCES users(id),
    time_spent_minutes   INTEGER NOT NULL,
    work_date            DATE NOT NULL DEFAULT CURRENT_DATE,
    description          TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE work_items
    ADD COLUMN IF NOT EXISTS original_estimate_minutes INTEGER,
    ADD COLUMN IF NOT EXISTS remaining_estimate_minutes INTEGER;
