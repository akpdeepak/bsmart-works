-- Iteration 16 — Leadership Console (Cap X) + Admin Operations Center (Cap Y).
--
-- Most of iteration 16 is read-only aggregation over data that already exists (teams, work_items,
-- risk, customer_accounts, sla_instances, csat_responses, objectives/key_results/okr_links,
-- roadmap_themes, ai_invocations/ai_budgets, integration_connections, webhook_deliveries,
-- workspace_members, events). The only genuinely new state is: the schedulable/editable executive
-- briefing card (Cap X · AI executive briefing), the user-lifecycle playbooks + runs (Cap Y), the
-- per-workspace license/seat config (Cap Y), saved audit-explorer queries (Cap Y), access-review
-- records (Cap Y), and generated compliance-evidence packages (Cap Y).
--
-- Tenant isolation (RB-40 §1): every table carries workspace_id and is indexed on it; every query
-- in the services filters by it. Plural snake_case tables (RB-10 §3). Forward-only.

-- ── Cap X · AI executive briefing — schedulable, editable narrative card ──────────────
CREATE TABLE executive_briefings (
    id            VARCHAR(50)  PRIMARY KEY,
    workspace_id  VARCHAR(100) NOT NULL,
    title         VARCHAR(300) NOT NULL,
    focus         TEXT,                       -- the leader's priorities, fed to the AI
    tone          VARCHAR(30)  NOT NULL DEFAULT 'EXECUTIVE',  -- EXECUTIVE | CONVERSATIONAL | TERSE
    length        VARCHAR(20)  NOT NULL DEFAULT 'MEDIUM',     -- SHORT | MEDIUM | LONG
    cadence       VARCHAR(20)  NOT NULL DEFAULT 'WEEKLY',     -- WEEKLY | MONTHLY | MANUAL
    status        VARCHAR(20)  NOT NULL DEFAULT 'DRAFT',      -- DRAFT | PUBLISHED
    period        VARCHAR(20),
    content       TEXT,                       -- the editable narrative (markdown)
    generated_at  TIMESTAMPTZ,
    created_by    VARCHAR(100),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_exec_briefings_ws ON executive_briefings (workspace_id, created_at DESC);

-- ── Cap Y · User lifecycle automation — onboarding / offboarding playbooks ────────────
CREATE TABLE onboarding_playbooks (
    id            VARCHAR(50)  PRIMARY KEY,
    workspace_id  VARCHAR(100) NOT NULL,
    name          VARCHAR(200) NOT NULL,
    description   TEXT,
    kind          VARCHAR(20)  NOT NULL DEFAULT 'ONBOARD',  -- ONBOARD | OFFBOARD
    active        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_by    VARCHAR(100),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_onboarding_playbooks_ws ON onboarding_playbooks (workspace_id);

CREATE TABLE onboarding_playbook_steps (
    id            VARCHAR(50)  PRIMARY KEY,
    playbook_id   VARCHAR(50)  NOT NULL,
    workspace_id  VARCHAR(100) NOT NULL,
    title         VARCHAR(300) NOT NULL,
    description   TEXT,
    action_type   VARCHAR(40)  NOT NULL DEFAULT 'MANUAL',   -- CREATE_USER | ASSIGN_ROLE | ADD_TEAM | PROVISION_INTEGRATION | REVOKE_ACCESS | MANUAL
    role_hint     VARCHAR(40),
    sort_order    INTEGER      NOT NULL DEFAULT 0
);
CREATE INDEX idx_onboarding_steps_playbook ON onboarding_playbook_steps (playbook_id, sort_order);
CREATE INDEX idx_onboarding_steps_ws ON onboarding_playbook_steps (workspace_id);

CREATE TABLE onboarding_runs (
    id              VARCHAR(50)  PRIMARY KEY,
    workspace_id    VARCHAR(100) NOT NULL,
    playbook_id     VARCHAR(50)  NOT NULL,
    kind            VARCHAR(20)  NOT NULL DEFAULT 'ONBOARD',
    subject_name    VARCHAR(200) NOT NULL,
    subject_email   VARCHAR(255),
    subject_user_id VARCHAR(100),
    status          VARCHAR(20)  NOT NULL DEFAULT 'IN_PROGRESS',  -- IN_PROGRESS | COMPLETED | CANCELLED
    started_by      VARCHAR(100),
    started_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_onboarding_runs_ws ON onboarding_runs (workspace_id, started_at DESC);

CREATE TABLE onboarding_run_steps (
    id            VARCHAR(50)  PRIMARY KEY,
    run_id        VARCHAR(50)  NOT NULL,
    workspace_id  VARCHAR(100) NOT NULL,
    title         VARCHAR(300) NOT NULL,
    action_type   VARCHAR(40)  NOT NULL DEFAULT 'MANUAL',
    status        VARCHAR(20)  NOT NULL DEFAULT 'PENDING',   -- PENDING | DONE | SKIPPED
    sort_order    INTEGER      NOT NULL DEFAULT 0,
    completed_by  VARCHAR(100),
    completed_at  TIMESTAMPTZ,
    note          TEXT
);
CREATE INDEX idx_onboarding_run_steps_run ON onboarding_run_steps (run_id, sort_order);
CREATE INDEX idx_onboarding_run_steps_ws ON onboarding_run_steps (workspace_id);

-- ── Cap Y · License / seat management — one config row per workspace ──────────────────
CREATE TABLE license_seats (
    workspace_id        VARCHAR(100) PRIMARY KEY,
    plan_name           VARCHAR(120) NOT NULL DEFAULT 'Standard',
    total_seats         INTEGER      NOT NULL DEFAULT 0,
    cost_per_seat_cents INTEGER      NOT NULL DEFAULT 0,
    renewal_date        DATE,
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Cap Y · Audit log explorer — saved queries ───────────────────────────────────────
CREATE TABLE audit_saved_queries (
    id            VARCHAR(50)  PRIMARY KEY,
    workspace_id  VARCHAR(100) NOT NULL,
    name          VARCHAR(200) NOT NULL,
    event_type    VARCHAR(100),
    actor_id      VARCHAR(100),
    aggregate_id  VARCHAR(100),
    search_text   VARCHAR(300),
    created_by    VARCHAR(100),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_saved_queries_ws ON audit_saved_queries (workspace_id, created_at DESC);

-- ── Cap Y · Access review — periodic review of who still has access ───────────────────
CREATE TABLE access_reviews (
    id                       VARCHAR(50)  PRIMARY KEY,
    workspace_id             VARCHAR(100) NOT NULL,
    status                   VARCHAR(20)  NOT NULL DEFAULT 'OPEN',  -- OPEN | COMPLETED
    inactive_threshold_days  INTEGER      NOT NULL DEFAULT 90,
    reviewed_count           INTEGER      NOT NULL DEFAULT 0,
    deactivated_count        INTEGER      NOT NULL DEFAULT 0,
    summary                  TEXT,
    started_by               VARCHAR(100),
    started_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    completed_at             TIMESTAMPTZ,
    created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_access_reviews_ws ON access_reviews (workspace_id, started_at DESC);

-- ── Cap Y · Compliance evidence package — on-demand audit-ready bundle ────────────────
CREATE TABLE evidence_packages (
    id            VARCHAR(50)  PRIMARY KEY,
    workspace_id  VARCHAR(100) NOT NULL,
    framework     VARCHAR(40)  NOT NULL DEFAULT 'SOC2',  -- SOC2 | ISO27001
    period        VARCHAR(20),
    status        VARCHAR(20)  NOT NULL DEFAULT 'GENERATED',
    summary       TEXT,
    content       TEXT,                                  -- the assembled bundle (markdown)
    generated_by  VARCHAR(100),
    generated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_evidence_packages_ws ON evidence_packages (workspace_id, generated_at DESC);

-- ── Walking-skeleton seed for WS-001 (the BCITS master workspace) ─────────────────────
INSERT INTO license_seats (workspace_id, plan_name, total_seats, cost_per_seat_cents, renewal_date)
VALUES ('WS-001', 'Enterprise', 50, 1500, DATE '2026-12-31');

INSERT INTO onboarding_playbooks (id, workspace_id, name, description, kind, created_by) VALUES
  ('PB-ONBOARD-1', 'WS-001', 'Engineer onboarding',
   'Role-aware steps to bring a new engineer fully online — account, roles, teams, integrations.', 'ONBOARD', 'USR-DEV1'),
  ('PB-OFFBOARD-1', 'WS-001', 'Standard offboarding',
   'Reliable, audited revocation of all access when someone leaves.', 'OFFBOARD', 'USR-DEV1');

INSERT INTO onboarding_playbook_steps (id, playbook_id, workspace_id, title, action_type, role_hint, sort_order) VALUES
  ('PBS-ON-1', 'PB-ONBOARD-1', 'WS-001', 'Create user account',                 'CREATE_USER',           NULL,     0),
  ('PBS-ON-2', 'PB-ONBOARD-1', 'WS-001', 'Assign workspace role',               'ASSIGN_ROLE',           'MEMBER', 1),
  ('PBS-ON-3', 'PB-ONBOARD-1', 'WS-001', 'Add to delivery team',                'ADD_TEAM',              NULL,     2),
  ('PBS-ON-4', 'PB-ONBOARD-1', 'WS-001', 'Provision Slack + GitHub access',     'PROVISION_INTEGRATION', NULL,     3),
  ('PBS-ON-5', 'PB-ONBOARD-1', 'WS-001', 'Share onboarding knowledge space',    'MANUAL',                NULL,     4),
  ('PBS-OFF-1', 'PB-OFFBOARD-1', 'WS-001', 'Revoke integration access',         'REVOKE_ACCESS',         NULL,     0),
  ('PBS-OFF-2', 'PB-OFFBOARD-1', 'WS-001', 'Remove from all teams',             'REVOKE_ACCESS',         NULL,     1),
  ('PBS-OFF-3', 'PB-OFFBOARD-1', 'WS-001', 'Reassign open work items',          'MANUAL',                NULL,     2),
  ('PBS-OFF-4', 'PB-OFFBOARD-1', 'WS-001', 'Deactivate workspace membership',   'REVOKE_ACCESS',         NULL,     3);

INSERT INTO executive_briefings (id, workspace_id, title, focus, tone, length, cadence, status, period, content, generated_at, created_by) VALUES
  ('EB-001', 'WS-001', 'Weekly delivery briefing',
   'Delivery velocity, customer SLA health, and top risks.', 'EXECUTIVE', 'MEDIUM', 'WEEKLY', 'PUBLISHED', '2026-W23',
   '# Weekly delivery briefing\n\n_Generate to refresh with current data._', NOW(), 'USR-DEV1');
