-- V41 · Iteration 14 — Developer Workspace + IDE / CLI surfaces
-- Cap U. Introduces the code domain (PRs + code links), focus mode / time-blocking,
-- and Definition-of-Done checklists. Every tenant-scoped table carries workspace_id and is
-- indexed on it (RB-40 §1). Plural snake_case tables (RB-10 §3). Forward-only.
--
-- Iterations 12 (KPI) and 13 (Automation/Integrations) are not yet built, so this iteration
-- ships a self-contained code domain rather than depending on an integrations layer that does
-- not exist. When the integrations iteration lands, the git provider becomes a writer into
-- these same tables — the read surfaces (code review queue, code context, standup) do not change.

-- ── Pull requests (code review queue + code context on work items) ───────────────────────────
CREATE TABLE pull_requests (
    id              VARCHAR(64)  PRIMARY KEY,
    workspace_id    VARCHAR(100) NOT NULL,
    repo            VARCHAR(200) NOT NULL,
    number          INTEGER      NOT NULL,
    title           TEXT         NOT NULL,
    author_id       VARCHAR(100) NOT NULL,
    status          VARCHAR(20)  NOT NULL DEFAULT 'OPEN',   -- OPEN | DRAFT | MERGED | CLOSED
    url             TEXT,
    work_item_id    VARCHAR(64),
    additions       INTEGER      NOT NULL DEFAULT 0,
    deletions       INTEGER      NOT NULL DEFAULT 0,
    files_changed   INTEGER      NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_pull_requests_workspace ON pull_requests(workspace_id);
CREATE INDEX idx_pull_requests_work_item ON pull_requests(work_item_id);
CREATE INDEX idx_pull_requests_status    ON pull_requests(workspace_id, status);

CREATE TABLE pull_request_reviewers (
    id               BIGSERIAL    PRIMARY KEY,
    pull_request_id  VARCHAR(64)  NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,
    reviewer_id      VARCHAR(100) NOT NULL,
    state            VARCHAR(20)  NOT NULL DEFAULT 'REQUESTED', -- REQUESTED | APPROVED | CHANGES_REQUESTED | COMMENTED
    requested_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (pull_request_id, reviewer_id)
);
CREATE INDEX idx_pr_reviewers_reviewer ON pull_request_reviewers(reviewer_id, state);

-- ── Code context on a work item: commits / branches / PR refs (IDE + CLI inline linking) ──────
CREATE TABLE code_links (
    id              BIGSERIAL    PRIMARY KEY,
    workspace_id    VARCHAR(100) NOT NULL,
    work_item_id    VARCHAR(64)  NOT NULL,
    kind            VARCHAR(20)  NOT NULL,    -- COMMIT | BRANCH | PR
    ref             VARCHAR(300) NOT NULL,    -- sha / branch name / pr id
    message         TEXT,
    author_id       VARCHAR(100),
    url             TEXT,
    files_touched   TEXT,                     -- newline-separated file paths
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_code_links_work_item ON code_links(work_item_id);
CREATE INDEX idx_code_links_workspace ON code_links(workspace_id);

-- ── Focus mode + time blocking (private to the user) ──────────────────────────────────────────
CREATE TABLE focus_blocks (
    id              BIGSERIAL    PRIMARY KEY,
    workspace_id    VARCHAR(100) NOT NULL,
    user_id         VARCHAR(100) NOT NULL,
    title           VARCHAR(200) NOT NULL DEFAULT 'Focus',
    starts_at       TIMESTAMPTZ  NOT NULL,
    ends_at         TIMESTAMPTZ  NOT NULL,
    status          VARCHAR(20)  NOT NULL DEFAULT 'SCHEDULED', -- SCHEDULED | CANCELLED
    source          VARCHAR(20)  NOT NULL DEFAULT 'MANUAL',    -- MANUAL | CALENDAR
    allow_p0        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_focus_blocks_user ON focus_blocks(workspace_id, user_id, starts_at);

-- ── Definition-of-Done checklists (per type or per epic) ──────────────────────────────────────
CREATE TABLE dod_checklists (
    id              VARCHAR(64)  PRIMARY KEY,
    workspace_id    VARCHAR(100) NOT NULL,
    scope_type      VARCHAR(20)  NOT NULL,    -- TYPE | EPIC
    scope_ref       VARCHAR(100) NOT NULL,    -- work item type name, or epic id
    name            VARCHAR(200) NOT NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (workspace_id, scope_type, scope_ref)
);
CREATE INDEX idx_dod_checklists_workspace ON dod_checklists(workspace_id);

CREATE TABLE dod_checklist_items (
    id              BIGSERIAL    PRIMARY KEY,
    checklist_id    VARCHAR(64)  NOT NULL REFERENCES dod_checklists(id) ON DELETE CASCADE,
    label           VARCHAR(300) NOT NULL,
    position        INTEGER      NOT NULL DEFAULT 0,
    required        BOOLEAN      NOT NULL DEFAULT TRUE
);
CREATE INDEX idx_dod_checklist_items_checklist ON dod_checklist_items(checklist_id);

CREATE TABLE dod_checklist_states (
    id                 BIGSERIAL    PRIMARY KEY,
    work_item_id       VARCHAR(64)  NOT NULL,
    checklist_item_id  BIGINT       NOT NULL REFERENCES dod_checklist_items(id) ON DELETE CASCADE,
    checked            BOOLEAN      NOT NULL DEFAULT FALSE,
    checked_by         VARCHAR(100),
    checked_at         TIMESTAMPTZ,
    UNIQUE (work_item_id, checklist_item_id)
);
CREATE INDEX idx_dod_states_work_item ON dod_checklist_states(work_item_id);

-- ── Demo seed (WS-001 only) — gives the Developer Workspace a populated walking skeleton ──────
INSERT INTO pull_requests (id, workspace_id, repo, number, title, author_id, status, url, work_item_id, additions, deletions, files_changed, created_at, updated_at) VALUES
    ('PR-WS001-101', 'WS-001', 'bcits/works', 101, 'WRK-001: stateless JWT auth filter', 'USR-DEV2', 'OPEN',  'https://git.bcits.in/bcits/works/pull/101', 'WRK-001', 240,  35, 9, NOW() - INTERVAL '5 hours',  NOW() - INTERVAL '1 hour'),
    ('PR-WS001-102', 'WS-001', 'bcits/works', 102, 'WRK-002: board drag-drop persistence',  'USR-001',  'OPEN',  'https://git.bcits.in/bcits/works/pull/102', 'WRK-002', 96,   12, 4, NOW() - INTERVAL '2 days',   NOW() - INTERVAL '20 hours'),
    ('PR-WS001-103', 'WS-001', 'bcits/works', 103, 'WRK-003: backlog rank API',             'USR-DEV2', 'DRAFT', 'https://git.bcits.in/bcits/works/pull/103', 'WRK-003', 410, 120, 18, NOW() - INTERVAL '6 hours',  NOW() - INTERVAL '6 hours');

INSERT INTO pull_request_reviewers (pull_request_id, reviewer_id, state, requested_at) VALUES
    ('PR-WS001-101', 'USR-DEV1', 'REQUESTED', NOW() - INTERVAL '5 hours'),
    ('PR-WS001-102', 'USR-DEV1', 'REQUESTED', NOW() - INTERVAL '2 days'),
    ('PR-WS001-101', 'USR-001',  'APPROVED',  NOW() - INTERVAL '3 hours');

INSERT INTO code_links (workspace_id, work_item_id, kind, ref, message, author_id, url, files_touched, created_at) VALUES
    ('WS-001', 'WRK-001', 'BRANCH', 'feature/WRK-001-jwt-auth', 'WRK-001 working branch', 'USR-DEV2', 'https://git.bcits.in/bcits/works/tree/feature/WRK-001-jwt-auth', 'src/SecurityConfig.java, src/JwtUtil.java', NOW() - INTERVAL '6 hours'),
    ('WS-001', 'WRK-001', 'COMMIT', 'a1b2c3d', 'WRK-001: fix CSRF refresh on token rotation', 'USR-DEV2', 'https://git.bcits.in/bcits/works/commit/a1b2c3d', 'src/JwtUtil.java', NOW() - INTERVAL '4 hours'),
    ('WS-001', 'WRK-001', 'PR',     'PR-WS001-101', 'WRK-001: stateless JWT auth filter', 'USR-DEV2', 'https://git.bcits.in/bcits/works/pull/101', NULL, NOW() - INTERVAL '5 hours');

INSERT INTO focus_blocks (workspace_id, user_id, title, starts_at, ends_at, status, source, allow_p0, created_at) VALUES
    ('WS-001', 'USR-DEV1', 'Deep work — auth refactor', NOW() + INTERVAL '1 hour', NOW() + INTERVAL '3 hours', 'SCHEDULED', 'MANUAL', TRUE, NOW());

INSERT INTO dod_checklists (id, workspace_id, scope_type, scope_ref, name, created_at) VALUES
    ('DOD-WS001-STORY', 'WS-001', 'TYPE', 'Story', 'Story Definition of Done', NOW());
INSERT INTO dod_checklist_items (checklist_id, label, position, required) VALUES
    ('DOD-WS001-STORY', 'Acceptance criteria met', 0, TRUE),
    ('DOD-WS001-STORY', 'Unit + integration tests pass', 1, TRUE),
    ('DOD-WS001-STORY', 'Code reviewed and approved', 2, TRUE),
    ('DOD-WS001-STORY', 'Documentation updated', 3, FALSE);
