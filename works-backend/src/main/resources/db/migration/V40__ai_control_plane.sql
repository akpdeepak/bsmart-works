-- V40: Iteration 10 — AI Orchestration Foundation + AI Control Plane (Cap O + Cap Z).
-- AI is ONE orchestration layer with one budget, one audit trail, one fallback contract — no
-- capability calls a model on its own terms (RB-40 §2). This migration lays down the control
-- plane's data model: workspace policy, per-capability + per-user toggles, monthly budget caps,
-- the data-boundary config, and the per-call audit/usage source (`ai_invocations`).
--
-- The whole plane is functional WITHOUT a live LLM key: the orchestration falls back to a
-- deterministic provider (NL→BQL rule parser, extractive summarizer) and records the call with
-- fallback_used = TRUE. Cost discipline is built in (RB-40 §2): at 80% of the cap the workspace
-- degrades to the cheap tier (Haiku); at 100% AI auto-disables and serves fallbacks only.
--
-- All tenant-scoped tables carry workspace_id (RB-40 §1): no usage row, audit row, policy, or
-- preference can ever cross a tenant. Policy/budget/boundary are admin-controlled (`manage_ai`,
-- ADMIN tier); a user sets only their own preference.

-- ── Permission: managing the AI control plane (policy, budget, boundary) — ADMIN tier ──
INSERT INTO permissions (id, description, min_tier) VALUES
    ('manage_ai', 'Set AI policy, per-capability toggles, model tiers, budgets and data boundaries', 4)
ON CONFLICT (id) DO NOTHING;

-- ── Workspace AI policy (one row per workspace; the top of the scope hierarchy) ──
-- mode: ENABLED (AI on by default) | DISABLED (off everywhere downstream) | OPT_IN (off until a
-- user opts in). default_model_tier is the capable tier used while under budget.
CREATE TABLE ai_workspace_policies (
    workspace_id       VARCHAR(100) PRIMARY KEY,
    mode               VARCHAR(20)  NOT NULL DEFAULT 'OPT_IN',   -- ENABLED | DISABLED | OPT_IN
    default_model_tier VARCHAR(20)  NOT NULL DEFAULT 'SONNET',   -- HAIKU | SONNET | OPUS
    updated_by         VARCHAR(100) REFERENCES users(id),
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Per-capability toggle (admin disables AI for specific capabilities) ──
-- A row is an explicit override for one capability; absence = inherit the workspace policy.
CREATE TABLE ai_capability_toggles (
    id           VARCHAR(50)  PRIMARY KEY,
    workspace_id VARCHAR(100) NOT NULL,
    capability   VARCHAR(60)  NOT NULL,                 -- NL_TO_BQL | SUMMARIZATION | <future>
    enabled      BOOLEAN      NOT NULL DEFAULT TRUE,
    updated_by   VARCHAR(100) REFERENCES users(id),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (workspace_id, capability)
);
CREATE INDEX idx_ai_capability_toggles_workspace ON ai_capability_toggles(workspace_id);

-- ── Per-user AI preference (user toggles AI for themselves within admin bounds) ──
CREATE TABLE ai_user_preferences (
    id           VARCHAR(50)  PRIMARY KEY,
    workspace_id VARCHAR(100) NOT NULL,
    user_id      VARCHAR(100) NOT NULL,
    enabled      BOOLEAN      NOT NULL DEFAULT TRUE,
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (workspace_id, user_id)
);
CREATE INDEX idx_ai_user_preferences_workspace ON ai_user_preferences(workspace_id);

-- ── Budget caps (per workspace, per calendar month) ──
-- spent_amount accrues from ai_invocations.cost; the budget state (NORMAL/DEGRADED/DISABLED) is
-- computed from cap vs spent (RB-40 §2): <80% NORMAL, 80–<100% DEGRADED (Haiku), ≥100% DISABLED.
CREATE TABLE ai_budgets (
    id            VARCHAR(50)  PRIMARY KEY,
    workspace_id  VARCHAR(100) NOT NULL,
    period_month  VARCHAR(7)   NOT NULL,                 -- "YYYY-MM"
    cap_amount    NUMERIC(14,2) NOT NULL DEFAULT 0,
    spent_amount  NUMERIC(14,2) NOT NULL DEFAULT 0,
    currency      VARCHAR(8)   NOT NULL DEFAULT 'INR',
    updated_by    VARCHAR(100) REFERENCES users(id),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (workspace_id, period_month)
);
CREATE INDEX idx_ai_budgets_workspace ON ai_budgets(workspace_id);

-- ── Data boundary controls (which data types may leave the server to a model) ──
-- One row per workspace. When a flag is set, the matching fields are redacted server-side before
-- anything is sent to a model (RB-40 §2 data boundary); AI calls are server-side only.
CREATE TABLE ai_data_boundaries (
    workspace_id    VARCHAR(100) PRIMARY KEY,
    block_pii       BOOLEAN      NOT NULL DEFAULT TRUE,   -- emails, phone numbers, names
    block_financial BOOLEAN      NOT NULL DEFAULT TRUE,   -- amounts, account numbers
    updated_by      VARCHAR(100) REFERENCES users(id),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── AI invocations (the per-call audit + usage source) ──
-- Every orchestration call writes exactly one row: who, where, which capability, which tier, token
-- counts, cost, the policy state at call time, and whether the deterministic fallback was used.
-- This is core data (RB-20 §5) and the single source the usage dashboard and audit log read from.
CREATE TABLE ai_invocations (
    id           VARCHAR(50)  PRIMARY KEY,
    workspace_id VARCHAR(100) NOT NULL,
    user_id      VARCHAR(100) NOT NULL,
    capability   VARCHAR(60)  NOT NULL,                  -- NL_TO_BQL | SUMMARIZATION
    model_tier   VARCHAR(30)  NOT NULL,                  -- HAIKU | SONNET | OPUS | DETERMINISTIC
    prompt_chars INTEGER      NOT NULL DEFAULT 0,
    tokens_in    INTEGER      NOT NULL DEFAULT 0,
    tokens_out   INTEGER      NOT NULL DEFAULT 0,
    cost         NUMERIC(14,4) NOT NULL DEFAULT 0,
    policy_state VARCHAR(20)  NOT NULL,                  -- NORMAL | DEGRADED | DISABLED | OFF
    fallback_used BOOLEAN     NOT NULL DEFAULT FALSE,
    outcome      VARCHAR(20)  NOT NULL DEFAULT 'OK',     -- OK | LOW_CONFIDENCE | ERROR
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ai_invocations_workspace  ON ai_invocations(workspace_id);
CREATE INDEX idx_ai_invocations_user       ON ai_invocations(user_id);
CREATE INDEX idx_ai_invocations_capability ON ai_invocations(capability);
CREATE INDEX idx_ai_invocations_created    ON ai_invocations(created_at);
