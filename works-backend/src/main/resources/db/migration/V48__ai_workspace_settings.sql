-- AI workspace settings: the default model tier and the data-boundary flags surfaced on the AI
-- Control page (mockup 09 / RB-40 §2). One row per workspace; a missing row means the system
-- defaults (Sonnet, block PII + financial). Workspace-scoped (RB-40 §1) — workspace_id is the key.
CREATE TABLE ai_workspace_settings (
    workspace_id       VARCHAR(100) PRIMARY KEY,
    default_model_tier VARCHAR(20)  NOT NULL DEFAULT 'SONNET',
    block_pii          BOOLEAN      NOT NULL DEFAULT TRUE,
    block_financial    BOOLEAN      NOT NULL DEFAULT TRUE,
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
