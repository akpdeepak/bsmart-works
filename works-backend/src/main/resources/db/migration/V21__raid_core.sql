-- V21: RAID core — risks, assumptions, pm_issues, cross_project_dependencies, decisions

CREATE TABLE risks (
    id                 VARCHAR(50) PRIMARY KEY,
    project_id         VARCHAR(100) NOT NULL REFERENCES projects(id),
    title              TEXT NOT NULL,
    description        TEXT,
    probability        VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',  -- LOW | MEDIUM | HIGH | CRITICAL
    impact             VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',  -- LOW | MEDIUM | HIGH | CRITICAL
    status             VARCHAR(20) NOT NULL DEFAULT 'OPEN',    -- OPEN | MITIGATED | CLOSED | ACCEPTED
    mitigation_plan    TEXT,
    owner_id           VARCHAR(100) REFERENCES users(id),
    review_date        DATE,
    work_item_ids      TEXT,   -- comma-separated work item IDs
    created_by         VARCHAR(100) REFERENCES users(id),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE assumptions (
    id                 VARCHAR(50) PRIMARY KEY,
    project_id         VARCHAR(100) NOT NULL REFERENCES projects(id),
    title              TEXT NOT NULL,
    rationale          TEXT,
    validation_status  VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING | VALIDATED | INVALIDATED
    owner_id           VARCHAR(100) REFERENCES users(id),
    expiry_date        DATE,
    notes              TEXT,
    created_by         VARCHAR(100) REFERENCES users(id),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE pm_issues (
    id                 VARCHAR(50) PRIMARY KEY,
    project_id         VARCHAR(100) NOT NULL REFERENCES projects(id),
    title              TEXT NOT NULL,
    problem            TEXT,
    impact             TEXT,
    resolution_path    TEXT,
    status             VARCHAR(20) NOT NULL DEFAULT 'OPEN',    -- OPEN | IN_PROGRESS | RESOLVED | CLOSED
    severity           VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',  -- LOW | MEDIUM | HIGH | CRITICAL
    owner_id           VARCHAR(100) REFERENCES users(id),
    created_by         VARCHAR(100) REFERENCES users(id),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE cross_project_dependencies (
    id                 VARCHAR(50) PRIMARY KEY,
    from_project_id    VARCHAR(100) NOT NULL REFERENCES projects(id),
    to_project_id      VARCHAR(100),
    title              TEXT NOT NULL,
    description        TEXT,
    deadline           DATE,
    status             VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING | IN_PROGRESS | COMPLETE | BLOCKED
    is_blocker         BOOLEAN NOT NULL DEFAULT FALSE,
    owner_id           VARCHAR(100) REFERENCES users(id),
    created_by         VARCHAR(100) REFERENCES users(id),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE decisions (
    id                      VARCHAR(50) PRIMARY KEY,
    project_id              VARCHAR(100) NOT NULL REFERENCES projects(id),
    title                   TEXT NOT NULL,
    decision_text           TEXT,
    alternatives_considered TEXT,
    rationale               TEXT,
    decided_at              DATE,
    owner_id                VARCHAR(100) REFERENCES users(id),
    supporting_links        TEXT,
    related_risk_ids        TEXT,           -- comma-separated risk IDs
    status                  VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE | SUPERSEDED | REVOKED
    created_by              VARCHAR(100) REFERENCES users(id),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
