-- V22: Meeting artifacts — meeting_notes, action_items

CREATE TABLE meeting_notes (
    id             VARCHAR(50) PRIMARY KEY,
    project_id     VARCHAR(100) NOT NULL REFERENCES projects(id),
    title          TEXT NOT NULL,
    meeting_date   DATE NOT NULL,
    meeting_type   VARCHAR(50) NOT NULL DEFAULT 'GENERAL',  -- GENERAL | STANDUP | REVIEW | RETROSPECTIVE | STEERING
    agenda         TEXT,
    notes          TEXT,
    decisions_made TEXT,
    attendees      TEXT,   -- JSON array of names / user IDs
    created_by     VARCHAR(100) REFERENCES users(id),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE action_items (
    id               VARCHAR(50) PRIMARY KEY,
    project_id       VARCHAR(100) NOT NULL REFERENCES projects(id),
    meeting_note_id  VARCHAR(50) REFERENCES meeting_notes(id) ON DELETE SET NULL,
    title            TEXT NOT NULL,
    description      TEXT,
    owner_id         VARCHAR(100) REFERENCES users(id),
    due_date         DATE,
    status           VARCHAR(20) NOT NULL DEFAULT 'OPEN',    -- OPEN | IN_PROGRESS | COMPLETED | CANCELLED
    priority         VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',  -- LOW | MEDIUM | HIGH
    created_by       VARCHAR(100) REFERENCES users(id),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
