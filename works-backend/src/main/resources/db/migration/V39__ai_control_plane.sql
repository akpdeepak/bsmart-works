-- V39: Iteration 11 — AI Control Plane (RB-40 §2).
-- The single AI orchestration layer that iteration 11's broad AI expansion is built on
-- (it is the iteration-10 foundation): ONE policy hierarchy, ONE budget, ONE audit trail,
-- ONE fallback contract. No capability calls a model on its own terms — every AI feature
-- routes through this layer, so scope, cost, caching, audit and the deterministic fallback
-- are enforced centrally and cannot be forgotten per-feature.

-- ── Permission: configure AI policy/budget + read the AI audit log (ADMIN tier) ───────────
INSERT INTO permissions (id, description, min_tier) VALUES
    ('manage_ai', 'Configure AI policies and budgets, and view the AI audit log', 4)
ON CONFLICT (id) DO NOTHING;

-- ── Policies — the scope hierarchy (most-restrictive-wins): WORKSPACE > CAPABILITY > USER ──
-- The in-context (4th) scope is request-time only and is never persisted. Absence of a row
-- means "inherit / enabled"; a row with enabled=false at any scope turns AI off downstream.
CREATE TABLE ai_policies (
    id           VARCHAR(50)  PRIMARY KEY,
    workspace_id VARCHAR(100) NOT NULL,
    scope_type   VARCHAR(20)  NOT NULL,                 -- WORKSPACE | CAPABILITY | USER
    capability   VARCHAR(50),                           -- NULL for WORKSPACE / USER-wide scope
    user_id      VARCHAR(100),                          -- NULL unless USER scope
    enabled      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ai_policies_workspace ON ai_policies(workspace_id);
-- One row per distinct scope; COALESCE keeps the uniqueness well-defined when columns are NULL.
CREATE UNIQUE INDEX uq_ai_policies_scope
    ON ai_policies(workspace_id, scope_type, COALESCE(capability, ''), COALESCE(user_id, ''));

-- ── Budget — per-workspace, per-month spend cap and running total (in cents) ───────────────
-- At 80% spend the layer degrades to the cheap model tier; at 100% it auto-disables AI for the
-- workspace and serves fallbacks (RB-40 §2 cost discipline).
CREATE TABLE ai_budgets (
    id                VARCHAR(50)  PRIMARY KEY,
    workspace_id      VARCHAR(100) NOT NULL,
    period            VARCHAR(7)   NOT NULL,            -- YYYY-MM
    monthly_cap_cents BIGINT       NOT NULL DEFAULT 10000,  -- default $100.00 / month
    spent_cents       BIGINT       NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX uq_ai_budgets_ws_period ON ai_budgets(workspace_id, period);

-- ── Invocations — the AI audit log (RB-40 §2; core data, RB-20 §5). Append-only in spirit ──
-- Every invocation is logged with the policy state at call time, model tier, token counts,
-- cost, whether it was a cache hit, and whether the deterministic fallback was served.
CREATE TABLE ai_invocations (
    id            VARCHAR(50)  PRIMARY KEY,
    workspace_id  VARCHAR(100) NOT NULL,
    user_id       VARCHAR(100),
    capability    VARCHAR(50)  NOT NULL,
    model_tier    VARCHAR(20),                          -- HAIKU | SONNET | NONE (fallback / disabled)
    prompt_chars  INTEGER      NOT NULL DEFAULT 0,
    tokens_in     INTEGER      NOT NULL DEFAULT 0,
    tokens_out    INTEGER      NOT NULL DEFAULT 0,
    cost_cents    INTEGER      NOT NULL DEFAULT 0,
    cache_hit     BOOLEAN      NOT NULL DEFAULT FALSE,
    fallback_used BOOLEAN      NOT NULL DEFAULT FALSE,
    policy_state  VARCHAR(30),                          -- ENABLED | DISABLED_* | BUDGET_EXCEEDED | DEGRADED
    status        VARCHAR(20)  NOT NULL DEFAULT 'OK',
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ai_invocations_ws          ON ai_invocations(workspace_id);
CREATE INDEX idx_ai_invocations_ws_created  ON ai_invocations(workspace_id, created_at);
CREATE INDEX idx_ai_invocations_capability  ON ai_invocations(capability);

-- ── Response cache — repeated prompts served without re-spending (RB-40 §2) ────────────────
CREATE TABLE ai_cache_entries (
    id           VARCHAR(120) PRIMARY KEY,             -- workspace : capability : key-hash
    workspace_id VARCHAR(100) NOT NULL,
    capability   VARCHAR(50)  NOT NULL,
    cache_key    VARCHAR(120) NOT NULL,
    response     TEXT,
    model_tier   VARCHAR(20),
    hits         INTEGER      NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ai_cache_ws ON ai_cache_entries(workspace_id);
