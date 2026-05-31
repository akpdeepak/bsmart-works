-- =====================================================================
-- Iteration 4: PM Artifacts — RAID, Decisions, Meetings, Action Items
-- =====================================================================

CREATE TABLE risk (
    id                   VARCHAR(36) PRIMARY KEY,
    workspace_id         VARCHAR(36) NOT NULL,
    project_id           VARCHAR(36) NOT NULL,
    title                VARCHAR(500) NOT NULL,
    description          TEXT,
    category             VARCHAR(80),
    probability          VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    impact               VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    status               VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    mitigation_plan      TEXT,
    contingency_plan     TEXT,
    owner_id             VARCHAR(36),
    review_date          DATE,
    related_work_item_id VARCHAR(36),
    created_by           VARCHAR(36) NOT NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at           TIMESTAMPTZ
);

CREATE TABLE assumption (
    id                VARCHAR(36) PRIMARY KEY,
    workspace_id      VARCHAR(36) NOT NULL,
    project_id        VARCHAR(36) NOT NULL,
    title             VARCHAR(500) NOT NULL,
    description       TEXT,
    rationale         TEXT,
    validation_status VARCHAR(30) NOT NULL DEFAULT 'UNVALIDATED',
    owner_id          VARCHAR(36),
    expiry_date       DATE,
    created_by        VARCHAR(36) NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at        TIMESTAMPTZ
);

CREATE TABLE pm_issue (
    id              VARCHAR(36) PRIMARY KEY,
    workspace_id    VARCHAR(36) NOT NULL,
    project_id      VARCHAR(36) NOT NULL,
    title           VARCHAR(500) NOT NULL,
    description     TEXT,
    impact          TEXT,
    resolution_path TEXT,
    status          VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    priority        VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    owner_id        VARCHAR(36),
    created_by      VARCHAR(36) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

CREATE TABLE dependency (
    id                   VARCHAR(36) PRIMARY KEY,
    workspace_id         VARCHAR(36) NOT NULL,
    project_id           VARCHAR(36) NOT NULL,
    title                VARCHAR(500) NOT NULL,
    description          TEXT,
    dependent_team       VARCHAR(120),
    providing_team       VARCHAR(120),
    status               VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    deadline             DATE,
    is_blocker           BOOLEAN NOT NULL DEFAULT FALSE,
    related_work_item_id VARCHAR(36),
    owner_id             VARCHAR(36),
    created_by           VARCHAR(36) NOT NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at           TIMESTAMPTZ
);

CREATE TABLE decision (
    id              VARCHAR(36) PRIMARY KEY,
    workspace_id    VARCHAR(36) NOT NULL,
    project_id      VARCHAR(36) NOT NULL,
    title           VARCHAR(500) NOT NULL,
    description     TEXT,
    alternatives    TEXT,
    rationale       TEXT,
    status          VARCHAR(30) NOT NULL DEFAULT 'PROPOSED',
    decision_date   DATE,
    owner_id        VARCHAR(36),
    related_risk_id VARCHAR(36),
    links           JSONB NOT NULL DEFAULT '[]',
    created_by      VARCHAR(36) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

CREATE TABLE meeting (
    id             VARCHAR(36) PRIMARY KEY,
    workspace_id   VARCHAR(36) NOT NULL,
    project_id     VARCHAR(36) NOT NULL,
    title          VARCHAR(500) NOT NULL,
    meeting_type   VARCHAR(40) NOT NULL DEFAULT 'GENERAL',
    scheduled_at   TIMESTAMPTZ,
    duration_mins  INTEGER,
    location       VARCHAR(255),
    agenda         TEXT,
    attendees      JSONB NOT NULL DEFAULT '[]',
    status         VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
    organizer_id   VARCHAR(36),
    created_by     VARCHAR(36) NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at     TIMESTAMPTZ
);

CREATE TABLE meeting_note (
    id         VARCHAR(36) PRIMARY KEY,
    meeting_id VARCHAR(36) NOT NULL REFERENCES meeting(id) ON DELETE CASCADE,
    section    VARCHAR(40) NOT NULL,
    content    TEXT,
    created_by VARCHAR(36) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE action_item (
    id                VARCHAR(36) PRIMARY KEY,
    workspace_id      VARCHAR(36) NOT NULL,
    project_id        VARCHAR(36) NOT NULL,
    title             VARCHAR(500) NOT NULL,
    description       TEXT,
    source_meeting_id VARCHAR(36),
    owner_id          VARCHAR(36),
    due_date          DATE,
    status            VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    priority          VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    created_by        VARCHAR(36) NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at        TIMESTAMPTZ
);

CREATE TABLE stakeholder (
    id                   VARCHAR(36) PRIMARY KEY,
    workspace_id         VARCHAR(36) NOT NULL,
    project_id           VARCHAR(36) NOT NULL,
    name                 VARCHAR(200) NOT NULL,
    role                 VARCHAR(120),
    organization         VARCHAR(200),
    email                VARCHAR(255),
    influence            VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    interest             VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    engagement_strategy  VARCHAR(40) NOT NULL DEFAULT 'INFORM',
    communication_freq   VARCHAR(30) NOT NULL DEFAULT 'MONTHLY',
    last_contacted_at    DATE,
    notes                TEXT,
    created_by           VARCHAR(36) NOT NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at           TIMESTAMPTZ
);

CREATE TABLE lesson_learned (
    id              VARCHAR(36) PRIMARY KEY,
    workspace_id    VARCHAR(36) NOT NULL,
    project_id      VARCHAR(36) NOT NULL,
    title           VARCHAR(500) NOT NULL,
    description     TEXT,
    category        VARCHAR(80),
    what_worked     TEXT,
    what_didnt_work TEXT,
    recommendation  TEXT,
    tags            JSONB NOT NULL DEFAULT '[]',
    created_by      VARCHAR(36) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_risk_project      ON risk(project_id, deleted_at);
CREATE INDEX idx_assumption_project ON assumption(project_id, deleted_at);
CREATE INDEX idx_pm_issue_project   ON pm_issue(project_id, deleted_at);
CREATE INDEX idx_dependency_project ON dependency(project_id, deleted_at);
CREATE INDEX idx_decision_project   ON decision(project_id, deleted_at);
CREATE INDEX idx_meeting_project    ON meeting(project_id, deleted_at);
CREATE INDEX idx_meeting_note       ON meeting_note(meeting_id);
CREATE INDEX idx_action_item_project ON action_item(project_id, deleted_at);
CREATE INDEX idx_stakeholder_project ON stakeholder(project_id, deleted_at);
CREATE INDEX idx_lesson_project     ON lesson_learned(project_id, deleted_at);
