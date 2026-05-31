-- V26: Cross-project dependencies (missed from iter-5 batch)

CREATE TABLE IF NOT EXISTS cross_project_dependencies (
    id              VARCHAR(50) PRIMARY KEY,
    from_project_id VARCHAR(100),
    to_project_id   VARCHAR(100),
    title           TEXT,
    description     TEXT,
    deadline        DATE,
    status          VARCHAR(20) DEFAULT 'PENDING',
    is_blocker      BOOLEAN DEFAULT FALSE,
    owner_id        VARCHAR(100),
    created_by      VARCHAR(100),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
