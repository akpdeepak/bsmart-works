-- V77: First-class sprint ceremonies + per-member attendance.
--
-- Standups (V41) and retros (V41) already exist as entities; planning, review and refinement
-- were only computations (/cockpit/* endpoints) — nothing to schedule, run, join or measure.
-- ceremony_sessions is the shared shell for ALL five ceremony types; standup/retro sessions
-- link in via standup_session_id / retro_session_id rather than being rewritten.
--
-- Attendance answers "who joined, who didn't" per ceremony: members are seeded EXPECTED when
-- a ceremony is scheduled, flip to JOINED on an explicit Join click while the session is LIVE,
-- can be marked EXCUSED by the facilitator, and remaining EXPECTED rows become ABSENT when the
-- ceremony completes. Attendance transitions are also recorded in the events table.
CREATE TABLE ceremony_sessions (
    id                 VARCHAR(36) PRIMARY KEY,
    workspace_id       VARCHAR(36) NOT NULL,
    project_id         VARCHAR(36) NOT NULL,
    sprint_id          VARCHAR(36),
    ceremony_type      VARCHAR(20) NOT NULL,    -- STANDUP | PLANNING | REVIEW | RETRO | REFINEMENT
    scheduled_at       TIMESTAMPTZ,
    started_at         TIMESTAMPTZ,
    ended_at           TIMESTAMPTZ,
    status             VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',  -- SCHEDULED | LIVE | COMPLETED | CANCELLED
    facilitator_id     VARCHAR(36),
    standup_session_id VARCHAR(36),
    retro_session_id   VARCHAR(36),
    created_by         VARCHAR(36) NOT NULL,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ceremony_session_workspace ON ceremony_sessions(workspace_id);
CREATE INDEX idx_ceremony_session_project ON ceremony_sessions(project_id);
-- Hot path: the live-ceremony banner looks up open sessions per project.
CREATE INDEX idx_ceremony_session_project_status ON ceremony_sessions(project_id, status);

CREATE TABLE ceremony_attendees (
    id           VARCHAR(36) PRIMARY KEY,
    workspace_id VARCHAR(36) NOT NULL,
    session_id   VARCHAR(36) NOT NULL REFERENCES ceremony_sessions(id) ON DELETE CASCADE,
    user_id      VARCHAR(36) NOT NULL,
    status       VARCHAR(20) NOT NULL DEFAULT 'EXPECTED',  -- EXPECTED | JOINED | ABSENT | EXCUSED
    joined_at    TIMESTAMPTZ,
    left_at      TIMESTAMPTZ,
    CONSTRAINT uq_ceremony_attendee UNIQUE (session_id, user_id)
);
CREATE INDEX idx_ceremony_attendees_session ON ceremony_attendees(session_id);
CREATE INDEX idx_ceremony_attendees_workspace ON ceremony_attendees(workspace_id);
