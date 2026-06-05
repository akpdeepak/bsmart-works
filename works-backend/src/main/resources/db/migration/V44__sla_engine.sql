-- V36: Iteration 8 — SLA Engine (Cap M), internal & generalized.
-- One unified SLA engine (same tables power external customer SLAs in iteration 9).
-- A policy scopes work items (project + optional BQL), references a business-hours
-- calendar, lists pause statuses, and owns one or more targets (first response,
-- resolution, …) and escalation steps. A running clock per (work item, target) is an
-- sla_instance; every start/pause/resume/breach is also recorded in the append-only
-- event store (RB-10 §3) so the SLA audit log is sourced from events, not a side table.
-- Policies start inactive (test-before-activate), mirroring compliance_rules (V34).

-- ── Business-hours calendars (I08-S02) ─────────────────────────────────────────
-- work_week: { "MON": {"start":"09:00","end":"18:00"}, ... } — absent day = non-working.
-- holidays:  ["2026-01-26", ...] full non-working dates in the calendar timezone.
CREATE TABLE business_calendars (
    id           VARCHAR(50)  PRIMARY KEY,
    workspace_id VARCHAR(100),
    name         TEXT         NOT NULL,
    timezone     VARCHAR(64)  NOT NULL DEFAULT 'Asia/Kolkata',
    work_week    JSONB        NOT NULL DEFAULT '{}',
    holidays     JSONB        NOT NULL DEFAULT '[]',
    is_default   BOOLEAN      NOT NULL DEFAULT FALSE,
    created_by   VARCHAR(100) REFERENCES users(id),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_business_calendars_workspace ON business_calendars(workspace_id);

-- ── SLA policies (I08-S01) ─────────────────────────────────────────────────────
CREATE TABLE sla_policies (
    id             VARCHAR(50)  PRIMARY KEY,
    workspace_id   VARCHAR(100),
    project_id     VARCHAR(100),                       -- NULL = all projects in the workspace
    name           TEXT         NOT NULL,
    description    TEXT,
    scope_bql      TEXT         NOT NULL DEFAULT '',    -- BQL refining which items the policy covers
    calendar_id    VARCHAR(50)  REFERENCES business_calendars(id),
    pause_statuses JSONB        NOT NULL DEFAULT '[]',  -- statuses that auto-pause the clock
    active         BOOLEAN      NOT NULL DEFAULT FALSE, -- test-before-activate
    is_template    BOOLEAN      NOT NULL DEFAULT FALSE,
    created_by     VARCHAR(100) REFERENCES users(id),
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_sla_policies_workspace ON sla_policies(workspace_id);
CREATE INDEX idx_sla_policies_project   ON sla_policies(project_id);
CREATE INDEX idx_sla_policies_active    ON sla_policies(active);

-- ── Multiple targets per policy (I08-S03) ──────────────────────────────────────
-- start_status NULL = clock starts when the policy is applied / the item is created.
-- stop_status  = comma-separated statuses that fulfil this target (MET on reaching one).
CREATE TABLE sla_targets (
    id             VARCHAR(50)  PRIMARY KEY,
    policy_id      VARCHAR(50)  NOT NULL REFERENCES sla_policies(id) ON DELETE CASCADE,
    workspace_id   VARCHAR(100),
    metric         VARCHAR(40)  NOT NULL DEFAULT 'RESOLUTION', -- FIRST_RESPONSE | RESOLUTION | CUSTOM
    name           TEXT         NOT NULL,
    target_minutes INT          NOT NULL,                      -- business minutes
    start_status   VARCHAR(100),
    stop_status    VARCHAR(255) NOT NULL DEFAULT 'Done',
    sort_order     INT          NOT NULL DEFAULT 0
);
CREATE INDEX idx_sla_targets_policy ON sla_targets(policy_id);

-- ── Escalation steps (I08-S06) ─────────────────────────────────────────────────
-- Fires when consumed % crosses threshold_pct (100 = breach). target_id NULL = all targets.
CREATE TABLE sla_escalations (
    id            VARCHAR(50)  PRIMARY KEY,
    policy_id     VARCHAR(50)  NOT NULL REFERENCES sla_policies(id) ON DELETE CASCADE,
    target_id     VARCHAR(50)  REFERENCES sla_targets(id) ON DELETE CASCADE,
    workspace_id  VARCHAR(100),
    threshold_pct INT          NOT NULL DEFAULT 80,
    action        VARCHAR(20)  NOT NULL DEFAULT 'NOTIFY',  -- NOTIFY | REASSIGN
    notify_to     JSONB        NOT NULL DEFAULT '[]',       -- user ids to notify
    reassign_to   VARCHAR(100) REFERENCES users(id),
    sort_order    INT          NOT NULL DEFAULT 0
);
CREATE INDEX idx_sla_escalations_policy ON sla_escalations(policy_id);

-- ── Running clocks (I08-S04, S05) ──────────────────────────────────────────────
-- consumed_seconds freezes accumulated business-time at each pause; running_since is
-- the anchor while RUNNING. due_at is the recomputed absolute deadline.
CREATE TABLE sla_instances (
    id                  VARCHAR(50)  PRIMARY KEY,
    workspace_id        VARCHAR(100),
    work_item_id        VARCHAR(100) NOT NULL,
    policy_id           VARCHAR(50)  NOT NULL,
    target_id           VARCHAR(50)  NOT NULL,
    metric              VARCHAR(40)  NOT NULL,
    target_minutes      INT          NOT NULL,
    status              VARCHAR(20)  NOT NULL DEFAULT 'PENDING', -- PENDING|RUNNING|PAUSED|MET|BREACHED|STOPPED
    started_at          TIMESTAMPTZ,
    running_since       TIMESTAMPTZ,
    paused_at           TIMESTAMPTZ,
    due_at              TIMESTAMPTZ,
    consumed_seconds    BIGINT       NOT NULL DEFAULT 0,
    completed_at        TIMESTAMPTZ,
    breached_at         TIMESTAMPTZ,
    last_escalation_pct INT          NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_sla_instance UNIQUE (work_item_id, target_id)
);
CREATE INDEX idx_sla_instances_workitem  ON sla_instances(work_item_id);
CREATE INDEX idx_sla_instances_policy    ON sla_instances(policy_id);
CREATE INDEX idx_sla_instances_status    ON sla_instances(status);
CREATE INDEX idx_sla_instances_due       ON sla_instances(due_at);

-- ── RBAC: configuring SLAs is an admin-tier capability ─────────────────────────
INSERT INTO permissions (id, description, min_tier) VALUES
    ('manage_sla', 'Define SLA policies, calendars, targets and escalations', 4);

-- ── Seed: a default Mon–Fri 09:00–18:00 IST calendar for every existing workspace ─
INSERT INTO business_calendars (id, workspace_id, name, timezone, work_week, holidays, is_default)
SELECT 'CAL-' || w.id, w.id, 'Standard business hours (IST)', 'Asia/Kolkata',
       '{"MON":{"start":"09:00","end":"18:00"},"TUE":{"start":"09:00","end":"18:00"},"WED":{"start":"09:00","end":"18:00"},"THU":{"start":"09:00","end":"18:00"},"FRI":{"start":"09:00","end":"18:00"}}'::jsonb,
       '[]'::jsonb, TRUE
FROM workspaces w;

-- ── Seed: starter SLA policy templates (global, cloned into a workspace on use) ─
INSERT INTO sla_policies (id, workspace_id, project_id, name, description, scope_bql, pause_statuses, active, is_template)
VALUES
    ('SLA-TPL-P0', NULL, NULL, 'P0 Incident response',
     'Acknowledge P0 incidents fast and resolve within four business hours.',
     'priority = Highest', '["Waiting on customer","Blocked"]'::jsonb, FALSE, TRUE),
    ('SLA-TPL-REVIEW', NULL, NULL, 'Code review turnaround',
     'Pull requests reviewed within one business day; escalate before breach.',
     'type = Review', '[]'::jsonb, FALSE, TRUE);

INSERT INTO sla_targets (id, policy_id, workspace_id, metric, name, target_minutes, start_status, stop_status, sort_order)
VALUES
    ('SLT-TPL-P0-ACK', 'SLA-TPL-P0', NULL, 'FIRST_RESPONSE', 'Acknowledge', 15, NULL, 'In Progress', 0),
    ('SLT-TPL-P0-RES', 'SLA-TPL-P0', NULL, 'RESOLUTION', 'Resolve', 240, NULL, 'Done,Resolved', 1),
    ('SLT-TPL-REVIEW', 'SLA-TPL-REVIEW', NULL, 'RESOLUTION', 'Review complete', 480, NULL, 'Done,Approved', 0);
