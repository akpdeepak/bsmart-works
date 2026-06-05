-- V41: Iteration 15 — Scrum Master Cockpit (Cap V) + Product Owner Workspace (Cap W).
--
-- Two role-tuned surfaces built on the existing data model (sprints, work_items, releases,
-- stakeholder, action_item) and the iteration-10/11 AI Control Plane. Every tenant-scoped table
-- carries workspace_id (RB-40 §1) and is soft-deletable where it is user-managed content.
-- All AI-backed features (sprint planning commit, review prep, pattern detection, backlog
-- refinement, feedback clustering, release-note drafting) are analytics/services over the data
-- below and ship deterministic fallbacks — they add no schema of their own.

-- ── Cap V · Impediment tracker (I15-S03) ─────────────────────────────────────────────
-- First-class artifact with owner, severity, age, escalation — not buried in chat.
CREATE TABLE impediments (
    id                   VARCHAR(36) PRIMARY KEY,
    workspace_id         VARCHAR(36) NOT NULL,
    project_id           VARCHAR(36) NOT NULL,
    sprint_id            VARCHAR(36),
    title                VARCHAR(500) NOT NULL,
    description          TEXT,
    category             VARCHAR(80),
    severity             VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',   -- LOW | MEDIUM | HIGH | CRITICAL
    status               VARCHAR(30) NOT NULL DEFAULT 'OPEN',     -- OPEN | IN_PROGRESS | ESCALATED | RESOLVED
    owner_id             VARCHAR(36),
    raised_by            VARCHAR(36),
    raised_at            DATE,
    resolved_at          DATE,
    escalated            BOOLEAN NOT NULL DEFAULT FALSE,
    related_work_item_id VARCHAR(36),
    created_by           VARCHAR(36) NOT NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at           TIMESTAMPTZ
);
CREATE INDEX idx_impediment_workspace ON impediments(workspace_id);
CREATE INDEX idx_impediment_project ON impediments(project_id);
CREATE INDEX idx_impediment_sprint ON impediments(sprint_id);

-- ── Cap V · Standup facilitator (I15-S02) ────────────────────────────────────────────
-- Sequential per-member, time-boxed flow that auto-records updates and flags missing members.
CREATE TABLE standup_sessions (
    id                VARCHAR(36) PRIMARY KEY,
    workspace_id      VARCHAR(36) NOT NULL,
    project_id        VARCHAR(36) NOT NULL,
    sprint_id         VARCHAR(36),
    session_date      DATE NOT NULL,
    status            VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',  -- IN_PROGRESS | COMPLETED
    time_box_mins     INTEGER NOT NULL DEFAULT 2,
    current_member_id VARCHAR(36),
    facilitator_id    VARCHAR(36),
    created_by        VARCHAR(36) NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_standup_session_workspace ON standup_sessions(workspace_id);
CREATE INDEX idx_standup_session_project ON standup_sessions(project_id);

CREATE TABLE standup_entries (
    id            VARCHAR(36) PRIMARY KEY,
    session_id    VARCHAR(36) NOT NULL REFERENCES standup_sessions(id) ON DELETE CASCADE,
    member_id     VARCHAR(36) NOT NULL,
    yesterday     TEXT,
    today         TEXT,
    blockers      TEXT,
    status        VARCHAR(20) NOT NULL DEFAULT 'PENDING',  -- PENDING | RECORDED | SKIPPED | MISSING
    recorded_at   TIMESTAMPTZ,
    display_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_standup_entry_session ON standup_entries(session_id);

-- ── Cap V · Retro toolkit (I15-S05) ──────────────────────────────────────────────────
-- Template gallery (4Ls, Start/Stop/Continue, Mad/Sad/Glad), action capture, anonymous mode.
CREATE TABLE retro_sessions (
    id             VARCHAR(36) PRIMARY KEY,
    workspace_id   VARCHAR(36) NOT NULL,
    project_id     VARCHAR(36) NOT NULL,
    sprint_id      VARCHAR(36),
    title          VARCHAR(500) NOT NULL,
    template       VARCHAR(40) NOT NULL DEFAULT 'START_STOP_CONTINUE', -- FOUR_LS | START_STOP_CONTINUE | MAD_SAD_GLAD
    status         VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE | COMPLETED
    anonymous      BOOLEAN NOT NULL DEFAULT FALSE,
    facilitator_id VARCHAR(36),
    created_by     VARCHAR(36) NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at     TIMESTAMPTZ
);
CREATE INDEX idx_retro_session_workspace ON retro_sessions(workspace_id);
CREATE INDEX idx_retro_session_project ON retro_sessions(project_id);

CREATE TABLE retro_notes (
    id                       VARCHAR(36) PRIMARY KEY,
    session_id               VARCHAR(36) NOT NULL REFERENCES retro_sessions(id) ON DELETE CASCADE,
    column_key               VARCHAR(40) NOT NULL,  -- START|STOP|CONTINUE|LIKED|LEARNED|LACKED|LONGED_FOR|MAD|SAD|GLAD
    content                  TEXT NOT NULL,
    author_id                VARCHAR(36),           -- null when the session is anonymous
    votes                    INTEGER NOT NULL DEFAULT 0,
    converted_action_item_id VARCHAR(36),
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_retro_note_session ON retro_notes(session_id);

-- ── Cap W · OKR linkage (I15-S12) ────────────────────────────────────────────────────
-- Objectives + key results; items/epics/themes link to key results, progress rolls up.
CREATE TABLE objectives (
    id           VARCHAR(36) PRIMARY KEY,
    workspace_id VARCHAR(36) NOT NULL,
    project_id   VARCHAR(36),
    title        VARCHAR(500) NOT NULL,
    description  TEXT,
    level        VARCHAR(20) NOT NULL DEFAULT 'TEAM',     -- COMPANY | TEAM | PERSONAL
    quarter      VARCHAR(20),
    status       VARCHAR(30) NOT NULL DEFAULT 'ON_TRACK', -- ON_TRACK | AT_RISK | OFF_TRACK | ACHIEVED
    owner_id     VARCHAR(36),
    created_by   VARCHAR(36) NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at   TIMESTAMPTZ
);
CREATE INDEX idx_objective_workspace ON objectives(workspace_id);

CREATE TABLE key_results (
    id            VARCHAR(36) PRIMARY KEY,
    objective_id  VARCHAR(36) NOT NULL REFERENCES objectives(id) ON DELETE CASCADE,
    workspace_id  VARCHAR(36) NOT NULL,
    title         VARCHAR(500) NOT NULL,
    metric_type   VARCHAR(20) NOT NULL DEFAULT 'PERCENT', -- PERCENT | NUMBER | CURRENCY | BOOLEAN
    start_value   DOUBLE PRECISION NOT NULL DEFAULT 0,
    target_value  DOUBLE PRECISION NOT NULL DEFAULT 100,
    current_value DOUBLE PRECISION NOT NULL DEFAULT 0,
    status        VARCHAR(30) NOT NULL DEFAULT 'ON_TRACK',
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_key_result_objective ON key_results(objective_id);
CREATE INDEX idx_key_result_workspace ON key_results(workspace_id);

CREATE TABLE okr_links (
    id            VARCHAR(36) PRIMARY KEY,
    workspace_id  VARCHAR(36) NOT NULL,
    key_result_id VARCHAR(36) NOT NULL REFERENCES key_results(id) ON DELETE CASCADE,
    entity_type   VARCHAR(20) NOT NULL,  -- WORK_ITEM | EPIC | THEME
    entity_id     VARCHAR(36) NOT NULL,
    created_by    VARCHAR(36) NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (key_result_id, entity_type, entity_id)
);
CREATE INDEX idx_okr_link_workspace ON okr_links(workspace_id);
CREATE INDEX idx_okr_link_entity ON okr_links(entity_type, entity_id);

-- ── Cap W · Product roadmap (I15-S08) ────────────────────────────────────────────────
-- Visual timeline of strategic themes/epics across quarters. A theme may link to an objective.
CREATE TABLE roadmap_themes (
    id            VARCHAR(36) PRIMARY KEY,
    workspace_id  VARCHAR(36) NOT NULL,
    project_id    VARCHAR(36),
    name          VARCHAR(300) NOT NULL,
    description   TEXT,
    status        VARCHAR(30) NOT NULL DEFAULT 'PLANNED', -- PLANNED | IN_PROGRESS | SHIPPED | ON_HOLD
    quarter       VARCHAR(20),
    start_date    DATE,
    target_date   DATE,
    color         VARCHAR(20),
    objective_id  VARCHAR(36),
    display_order INTEGER NOT NULL DEFAULT 0,
    created_by    VARCHAR(36) NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at    TIMESTAMPTZ
);
CREATE INDEX idx_roadmap_theme_workspace ON roadmap_themes(workspace_id);

-- ── Cap W · Idea capture inbox (I15-S10) ─────────────────────────────────────────────
-- Lightweight inbox; auto-classified by area; promoted to a story when ready.
CREATE TABLE ideas (
    id                    VARCHAR(36) PRIMARY KEY,
    workspace_id          VARCHAR(36) NOT NULL,
    project_id            VARCHAR(36),
    title                 VARCHAR(500) NOT NULL,
    description           TEXT,
    area                  VARCHAR(80),
    status                VARCHAR(30) NOT NULL DEFAULT 'NEW', -- NEW | REVIEWING | PROMOTED | ARCHIVED
    submitted_by          VARCHAR(36),
    votes                 INTEGER NOT NULL DEFAULT 0,
    promoted_work_item_id VARCHAR(36),
    created_by            VARCHAR(36) NOT NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at            TIMESTAMPTZ
);
CREATE INDEX idx_idea_workspace ON ideas(workspace_id);

-- ── Cap W · Customer feedback aggregation (I15-S11) ──────────────────────────────────
-- Pulled from portal/email/comments/interviews; clustered into themes with sentiment.
CREATE TABLE customer_feedback_items (
    id                  VARCHAR(36) PRIMARY KEY,
    workspace_id        VARCHAR(36) NOT NULL,
    project_id          VARCHAR(36),
    source              VARCHAR(40) NOT NULL DEFAULT 'PORTAL', -- PORTAL | EMAIL | COMMENT | INTERVIEW
    customer            VARCHAR(200),
    content             TEXT NOT NULL,
    sentiment           VARCHAR(20),                            -- POSITIVE | NEUTRAL | NEGATIVE
    theme               VARCHAR(120),
    status              VARCHAR(30) NOT NULL DEFAULT 'NEW',     -- NEW | TRIAGED | LINKED | CLOSED
    linked_work_item_id VARCHAR(36),
    created_by          VARCHAR(36) NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ
);
CREATE INDEX idx_customer_feedback_workspace ON customer_feedback_items(workspace_id);

-- ── Cap W · Stakeholder communication (I15-S14) ──────────────────────────────────────
-- Targeted release/status communication built on the existing stakeholder map — not blast email.
CREATE TABLE stakeholder_communications (
    id                 VARCHAR(36) PRIMARY KEY,
    workspace_id       VARCHAR(36) NOT NULL,
    project_id         VARCHAR(36) NOT NULL,
    subject            VARCHAR(500) NOT NULL,
    body               TEXT,
    channel            VARCHAR(30) NOT NULL DEFAULT 'EMAIL', -- EMAIL | MEETING | PORTAL | CALL
    related_release_id VARCHAR(36),
    stakeholder_ids    JSONB NOT NULL DEFAULT '[]',
    status             VARCHAR(20) NOT NULL DEFAULT 'DRAFT', -- DRAFT | SENT
    sent_at            TIMESTAMPTZ,
    created_by         VARCHAR(36) NOT NULL,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at         TIMESTAMPTZ
);
CREATE INDEX idx_stakeholder_comm_workspace ON stakeholder_communications(workspace_id);
CREATE INDEX idx_stakeholder_comm_project ON stakeholder_communications(project_id);
