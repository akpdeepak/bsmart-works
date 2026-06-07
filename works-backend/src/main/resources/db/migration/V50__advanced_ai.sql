-- Iteration 20 — Advanced AI (Capability O): workspace-defined custom assistants, multi-step AI
-- agents, AI memory/context, and conversational (natural-language) dashboards. Every one of these
-- routes its model calls through the AI Control Plane (RB-40 §2) so scope / budget / cache / audit
-- and the deterministic fallback apply centrally; these tables hold only the durable state each
-- feature owns. Forward-only (RB-10 §3); every table is workspace-scoped (RB-40 §1).

-- Custom AI assistants — a workspace persona ("BCITS Compliance Assistant", "AMR Domain Expert").
-- The persona is the system-prompt the control plane conditions the answer on; a disabled assistant
-- is hidden and never invoked.
CREATE TABLE ai_assistants (
    id            VARCHAR(40)  PRIMARY KEY,
    workspace_id  VARCHAR(100) NOT NULL,
    name          VARCHAR(160) NOT NULL,
    description   VARCHAR(500),
    persona       TEXT         NOT NULL,
    enabled       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_by    VARCHAR(100),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ai_assistants_ws ON ai_assistants (workspace_id);

-- AI memory / context — preferences, conversation context and history the assistant remembers
-- across sessions, scoped to (workspace, user) and optionally a specific assistant. mem_key is the
-- slot; kind separates durable PREFERENCE from rolling CONTEXT/HISTORY. No raw PII is stored here
-- beyond what the user themselves typed into their own private memory (RB-40 §3 applies to event
-- payloads and projections, which this is not).
CREATE TABLE ai_memories (
    id            VARCHAR(40)  PRIMARY KEY,
    workspace_id  VARCHAR(100) NOT NULL,
    user_id       VARCHAR(100) NOT NULL,
    assistant_id  VARCHAR(40),
    kind          VARCHAR(20)  NOT NULL DEFAULT 'CONTEXT',
    mem_key       VARCHAR(160) NOT NULL,
    mem_value     TEXT,
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ai_memories_scope ON ai_memories (workspace_id, user_id);
CREATE UNIQUE INDEX uq_ai_memories_slot ON ai_memories (workspace_id, user_id, COALESCE(assistant_id, ''), kind, mem_key);

-- Multi-step AI agents — a goal ("Triage all P0 customer requests from last 24 hours") is planned
-- into ordered steps that each reuse an existing capability, then executed and audited. The run is an
-- auditable, read-only suggestion artifact (it drafts/categorises; it does not silently mutate data).
CREATE TABLE ai_agent_runs (
    id            VARCHAR(40)  PRIMARY KEY,
    workspace_id  VARCHAR(100) NOT NULL,
    user_id       VARCHAR(100) NOT NULL,
    goal          TEXT         NOT NULL,
    status        VARCHAR(20)  NOT NULL DEFAULT 'PLANNED',
    step_count    INTEGER      NOT NULL DEFAULT 0,
    summary       TEXT,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    completed_at  TIMESTAMPTZ
);
CREATE INDEX idx_ai_agent_runs_ws ON ai_agent_runs (workspace_id, created_at DESC);

CREATE TABLE ai_agent_steps (
    id             VARCHAR(40)  PRIMARY KEY,
    run_id         VARCHAR(40)  NOT NULL,
    workspace_id   VARCHAR(100) NOT NULL,
    seq            INTEGER      NOT NULL,
    capability     VARCHAR(60)  NOT NULL,
    description    VARCHAR(500),
    status         VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    result_summary TEXT,
    used_ai        BOOLEAN      NOT NULL DEFAULT FALSE,
    policy_state   VARCHAR(40),
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ai_agent_steps_run ON ai_agent_steps (run_id, seq);

-- Conversational dashboards — a natural-language ask ("Show velocity per team, last 6 sprints, with
-- predictability composite") compiled into a structured widget spec the dashboard renders. The spec
-- is saved so the dashboard is reproducible; the prompt is kept for provenance.
CREATE TABLE conversational_dashboards (
    id            VARCHAR(40)  PRIMARY KEY,
    workspace_id  VARCHAR(100) NOT NULL,
    user_id       VARCHAR(100) NOT NULL,
    title         VARCHAR(200) NOT NULL,
    prompt        TEXT         NOT NULL,
    spec_json     TEXT         NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_conv_dashboards_ws ON conversational_dashboards (workspace_id, created_at DESC);

-- Seed two first-party assistants for the primary workspace so the panel is not empty out of the box.
INSERT INTO ai_assistants (id, workspace_id, name, description, persona, created_by) VALUES
    ('AST-compliance01', 'WS-001', 'BCITS Compliance Assistant',
     'Answers compliance and regulatory questions with citations to workspace rules and articles.',
     'You are the BCITS Compliance Assistant. Answer using the workspace''s compliance rules, SLA policies and knowledge-base articles. Always cite the rule or article you relied on and never speculate beyond workspace data. If unsure, say so and point to the relevant compliance owner.',
     'USR-001'),
    ('AST-amrexpert01', 'WS-001', 'AMR Domain Expert',
     'Explains AMR (Automatic Meter Reading) domain concepts and how they map to Works items.',
     'You are the AMR Domain Expert for a power-distribution (DISCOM) context. Explain metering, billing and field-operations concepts in plain language and relate them to the work items, projects and KPIs in this workspace.',
     'USR-001');
