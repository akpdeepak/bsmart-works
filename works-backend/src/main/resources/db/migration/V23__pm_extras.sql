-- V23: PM extras — stakeholders, lessons_learned

CREATE TABLE stakeholders (
    id                       VARCHAR(50) PRIMARY KEY,
    project_id               VARCHAR(100) NOT NULL REFERENCES projects(id),
    name                     TEXT NOT NULL,
    role                     TEXT,
    email                    TEXT,
    influence                VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',   -- LOW | MEDIUM | HIGH
    interest                 VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',   -- LOW | MEDIUM | HIGH
    communication_frequency  VARCHAR(30) DEFAULT 'MONTHLY',           -- DAILY | WEEKLY | BIWEEKLY | MONTHLY | QUARTERLY
    last_contacted_at        DATE,
    notes                    TEXT,
    created_by               VARCHAR(100) REFERENCES users(id),
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE lessons_learned (
    id                VARCHAR(50) PRIMARY KEY,
    project_id        VARCHAR(100) NOT NULL REFERENCES projects(id),
    title             TEXT NOT NULL,
    what_worked       TEXT,
    what_didnt_work   TEXT,
    recommendations   TEXT,
    category          TEXT,
    tags              TEXT,   -- comma-separated
    created_by        VARCHAR(100) REFERENCES users(id),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
