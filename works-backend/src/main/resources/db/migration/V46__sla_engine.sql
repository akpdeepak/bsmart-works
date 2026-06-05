-- V44: Iteration 8 — SLA Engine (Cap M), the unified internal SLA engine.
-- "One SLA engine, two contexts" (architectural commitment 2): the same engine that tracks
-- internal delivery commitments here is reused for customer-facing SLAs in iteration 9.
--
-- A POLICY scopes work items via BQL (scope_bql) and carries one or more TARGETS (first
-- response, resolution, …), each a business-minute budget measured against an optional
-- business-hours CALENDAR. When a scoped item exists, an INSTANCE (a live clock) is created
-- per target; the clock accrues business minutes while RUNNING, pauses on configured statuses,
-- and transitions to MET / BREACHED. ESCALATIONS fire at a consumed-percent threshold or on
-- breach. Every lifecycle transition is recorded to the append-only `events` table (RB-10 §3),
-- so the SLA audit log is rebuildable from the event store.
--
-- Policies start inactive (active = FALSE): "test-before-activate", mirroring compliance rules.
-- All tenant-scoped tables carry workspace_id (RB-40 §1): no clock can ever cross a tenant.

-- ── Permission: managing SLA policies, calendars, targets, escalations (LEAD tier) ──
INSERT INTO permissions (id, description, min_tier) VALUES
    ('manage_sla', 'Define SLA policies, calendars and escalations; apply policies to items', 3)
ON CONFLICT (id) DO NOTHING;

-- ── Business-hours calendars ──────────────────────────────────────────────────
CREATE TABLE sla_calendars (
    id           VARCHAR(50)  PRIMARY KEY,
    workspace_id VARCHAR(100),
    name         TEXT         NOT NULL,
    timezone     VARCHAR(64)  NOT NULL DEFAULT 'Asia/Kolkata',
    -- Per-weekday working windows, e.g. {"MON":[["09:00","18:00"]], "SAT":[]} (24h "HH:mm").
    work_week    JSONB        NOT NULL DEFAULT '{}',
    holidays     JSONB        NOT NULL DEFAULT '[]',   -- array of ISO dates ("2026-01-26")
    created_by   VARCHAR(100) REFERENCES users(id),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_sla_calendars_workspace ON sla_calendars(workspace_id);

-- ── SLA policies ──────────────────────────────────────────────────────────────
CREATE TABLE sla_policies (
    id            VARCHAR(50)  PRIMARY KEY,
    workspace_id  VARCHAR(100),
    name          TEXT         NOT NULL,
    description   TEXT,
    scope_bql     TEXT         NOT NULL DEFAULT '',     -- BQL selecting the items the policy applies to
    calendar_id   VARCHAR(50)  REFERENCES sla_calendars(id), -- NULL = 24x7 (every minute counts)
    customer_tier VARCHAR(50),                          -- NULL internal; set for multi-tier (iter 9)
    active        BOOLEAN      NOT NULL DEFAULT FALSE,   -- test-before-activate
    created_by    VARCHAR(100) REFERENCES users(id),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_sla_policies_workspace ON sla_policies(workspace_id);
CREATE INDEX idx_sla_policies_active    ON sla_policies(active);

-- ── SLA targets (multiple per policy) ─────────────────────────────────────────
CREATE TABLE sla_targets (
    id             VARCHAR(50)  PRIMARY KEY,
    policy_id      VARCHAR(50)  NOT NULL REFERENCES sla_policies(id) ON DELETE CASCADE,
    workspace_id   VARCHAR(100),                        -- denormalized for tenant-scoped lookups
    metric         VARCHAR(40)  NOT NULL,               -- FIRST_RESPONSE | RESOLUTION | <custom>
    target_minutes INTEGER      NOT NULL CHECK (target_minutes > 0),
    start_status   VARCHAR(60),                         -- clock starts entering this status (NULL = in-scope/created)
    stop_status    VARCHAR(60),                         -- clock met when item reaches this status
    pause_statuses JSONB        NOT NULL DEFAULT '[]',  -- statuses that pause the clock
    sort_order     INTEGER      NOT NULL DEFAULT 0
);
CREATE INDEX idx_sla_targets_policy ON sla_targets(policy_id);

-- ── SLA instances (a live clock on a work item, per target) ───────────────────
CREATE TABLE sla_instances (
    id               VARCHAR(50)  PRIMARY KEY,
    workspace_id     VARCHAR(100) NOT NULL,
    work_item_id     VARCHAR(50)  NOT NULL,
    policy_id        VARCHAR(50)  NOT NULL,
    target_id        VARCHAR(50)  NOT NULL,
    metric           VARCHAR(40)  NOT NULL,
    state            VARCHAR(20)  NOT NULL DEFAULT 'RUNNING', -- RUNNING|PAUSED|MET|BREACHED|STOPPED
    target_minutes   INTEGER      NOT NULL,
    elapsed_minutes  INTEGER      NOT NULL DEFAULT 0,    -- accrued business minutes while RUNNING
    started_at       TIMESTAMPTZ  NOT NULL,
    last_resumed_at  TIMESTAMPTZ,                        -- wall-clock of last RUNNING entry (accrual basis)
    paused_at        TIMESTAMPTZ,
    due_at           TIMESTAMPTZ,                        -- projected breach deadline (countdown display)
    breached_at      TIMESTAMPTZ,
    completed_at     TIMESTAMPTZ,
    escalated_steps  JSONB        NOT NULL DEFAULT '[]', -- escalation ids already fired (idempotency)
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (work_item_id, target_id)                     -- one clock per item per target
);
CREATE INDEX idx_sla_instances_workspace ON sla_instances(workspace_id);
CREATE INDEX idx_sla_instances_workitem  ON sla_instances(work_item_id);
CREATE INDEX idx_sla_instances_state     ON sla_instances(state);
CREATE INDEX idx_sla_instances_policy    ON sla_instances(policy_id);

-- ── SLA escalations (steps per policy) ────────────────────────────────────────
CREATE TABLE sla_escalations (
    id                VARCHAR(50)  PRIMARY KEY,
    policy_id         VARCHAR(50)  NOT NULL REFERENCES sla_policies(id) ON DELETE CASCADE,
    workspace_id      VARCHAR(100),
    target_id         VARCHAR(50),                       -- NULL = all targets of the policy
    threshold_percent INTEGER,                           -- fire when consumed >= this % (NULL with on_breach)
    on_breach         BOOLEAN      NOT NULL DEFAULT FALSE,
    action            VARCHAR(20)  NOT NULL DEFAULT 'NOTIFY', -- NOTIFY | REASSIGN
    action_target     JSONB        NOT NULL DEFAULT '[]', -- routing targets / reassignee
    sort_order        INTEGER      NOT NULL DEFAULT 0
);
CREATE INDEX idx_sla_escalations_policy ON sla_escalations(policy_id);
