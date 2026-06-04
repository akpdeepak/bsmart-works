-- V35: Iteration 7 — Compliance Rules Engine (Cap K), the evaluation engine.
-- Builds on V34 (rule definitions) with the runtime half: per-item violations,
-- the rule's evaluation mode (continuous vs scheduled), and escalation policy.
-- Violations are the output of evaluating an active rule: a scoped work item that
-- fails the rule's assertion. They move through a lifecycle and are auto-resolved
-- when the item starts passing again. Routing/audit ride the existing notifications
-- + events backbone (RB-10 §3), so no new audit table is introduced.

-- ── Rule: evaluation mode + escalation policy ─────────────────────────────────
ALTER TABLE compliance_rules
    ADD COLUMN IF NOT EXISTS evaluation_mode     VARCHAR(20)  NOT NULL DEFAULT 'CONTINUOUS', -- CONTINUOUS | SCHEDULED
    ADD COLUMN IF NOT EXISTS escalate_after_hours INTEGER,                                    -- NULL = no escalation
    ADD COLUMN IF NOT EXISTS escalate_to         JSONB        NOT NULL DEFAULT '[]',          -- routing targets for escalation
    ADD COLUMN IF NOT EXISTS last_evaluated_at   TIMESTAMPTZ;

-- ── Permission: managing compliance rules + acting on violations (LEAD tier) ──
INSERT INTO permissions (id, description, min_tier) VALUES
    ('manage_compliance', 'Define compliance rules and act on violations', 3)
ON CONFLICT (id) DO NOTHING;

-- ── Violations ────────────────────────────────────────────────────────────────
CREATE TABLE compliance_violations (
    id              VARCHAR(50) PRIMARY KEY,
    rule_id         VARCHAR(50)  NOT NULL REFERENCES compliance_rules(id) ON DELETE CASCADE,
    workspace_id    VARCHAR(100),                          -- denormalized from the rule for tenant-scoped reads
    project_id      VARCHAR(100),
    work_item_id    VARCHAR(50)  NOT NULL,
    work_item_title TEXT,
    severity        VARCHAR(20)  NOT NULL DEFAULT 'MEDIUM', -- snapshot of the rule severity at detection
    status          VARCHAR(20)  NOT NULL DEFAULT 'OPEN',   -- OPEN | ACKNOWLEDGED | RESOLVED | WONT_FIX
    resolution      VARCHAR(30),                            -- AUTO_RESOLVED | MANUAL | WONT_FIX
    detected_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by VARCHAR(100),
    resolved_at     TIMESTAMPTZ,
    resolved_by     VARCHAR(100),
    note            TEXT,
    escalated       BOOLEAN      NOT NULL DEFAULT FALSE,
    escalated_at    TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_compliance_violations_rule      ON compliance_violations(rule_id);
CREATE INDEX idx_compliance_violations_workspace ON compliance_violations(workspace_id);
CREATE INDEX idx_compliance_violations_project   ON compliance_violations(project_id);
CREATE INDEX idx_compliance_violations_status    ON compliance_violations(status);
CREATE INDEX idx_compliance_violations_item      ON compliance_violations(work_item_id);

-- One rule raises at most one *active* violation per work item; re-evaluation that
-- finds the same item still failing must not stack duplicates. RESOLVED/WONT_FIX rows
-- are historical and excluded, so an item can legitimately be flagged again later.
CREATE UNIQUE INDEX uq_compliance_violation_active
    ON compliance_violations(rule_id, work_item_id)
    WHERE status IN ('OPEN', 'ACKNOWLEDGED');
