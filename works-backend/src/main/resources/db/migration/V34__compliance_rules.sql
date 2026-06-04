-- V34: Iteration 7 — Compliance Rules Engine (Cap K), rule definitions.
-- A rule scopes a set of work items via BQL (scope_bql) and asserts a condition
-- the scoped items must satisfy (assertion_bql). Items in scope that fail the
-- assertion become violations — evaluation + the violation table land in later PRs.
-- Rules start inactive (active = FALSE): "test-before-activate". Templates
-- (is_template = TRUE, no owner) are cloned into workspace-owned rules.

CREATE TABLE compliance_rules (
    id            VARCHAR(50)  PRIMARY KEY,
    workspace_id  VARCHAR(100),
    project_id    VARCHAR(100),                          -- NULL = all projects in the workspace
    name          TEXT         NOT NULL,
    description   TEXT,
    scope_bql     TEXT         NOT NULL DEFAULT '',       -- BQL selecting the items the rule applies to
    assertion_bql TEXT         NOT NULL,                  -- BQL the scoped items must satisfy
    severity      VARCHAR(20)  NOT NULL DEFAULT 'MEDIUM', -- CRITICAL | HIGH | MEDIUM | LOW | INFO
    notify_to     JSONB        NOT NULL DEFAULT '[]',     -- routing targets (consumed by a later PR)
    active        BOOLEAN      NOT NULL DEFAULT FALSE,    -- test-before-activate: new rules start inactive
    is_template   BOOLEAN      NOT NULL DEFAULT FALSE,
    created_by    VARCHAR(100) REFERENCES users(id),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_compliance_rules_workspace ON compliance_rules(workspace_id);
CREATE INDEX idx_compliance_rules_project   ON compliance_rules(project_id);
CREATE INDEX idx_compliance_rules_active    ON compliance_rules(active);
