-- V53: Iteration 20 — Customer chat support (Capability N).
-- Real-time chat on the customer portal with AI tier-1 auto-response + human escalation. A
-- conversation is opened by a customer from the portal; the first message runs through the AI
-- Control Plane (capability "support_chat", RB-40 §2) for a deterministic tier-1 answer, and falls
-- back to a canned holding reply + auto-escalation to a human agent when AI is off or over budget.
-- Both tables carry workspace_id so a customer of one DISCOM workspace can never see another's chat
-- (RB-40 §1). Append-only message history; conversations carry the lifecycle status. Forward-only.

-- ── Conversations: one chat thread, owned by a workspace (and optionally a customer account) ──
CREATE TABLE chat_conversations (
    id                VARCHAR(50)  PRIMARY KEY,
    workspace_id      VARCHAR(100) NOT NULL,                  -- the BCITS workspace serving the customer
    account_id        VARCHAR(50),                            -- customer_accounts.id (nullable: anonymous/portal guest)
    customer_name     TEXT,
    subject           TEXT,
    status            VARCHAR(20)  NOT NULL DEFAULT 'OPEN',   -- OPEN | AI_HANDLED | ESCALATED | RESOLVED
    assigned_agent_id VARCHAR(100),                           -- internal agent (users.id) once claimed
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    last_message_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_chat_conversations_workspace      ON chat_conversations(workspace_id);
CREATE INDEX idx_chat_conversations_status         ON chat_conversations(workspace_id, status);
CREATE INDEX idx_chat_conversations_account        ON chat_conversations(account_id);
CREATE INDEX idx_chat_conversations_last_message   ON chat_conversations(workspace_id, last_message_at DESC);

-- ── Messages: append-only turns in a conversation (customer / AI / agent) ──────────────────────
CREATE TABLE chat_messages (
    id              VARCHAR(50)  PRIMARY KEY,
    workspace_id    VARCHAR(100) NOT NULL,
    conversation_id VARCHAR(50)  NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    sender_type     VARCHAR(20)  NOT NULL,                    -- CUSTOMER | AI | AGENT
    sender_id       VARCHAR(100),                             -- customer_users.id or users.id (null for AI)
    body            TEXT,
    ai_meta         VARCHAR(255),                             -- AI policy state / tier when AI authored the turn
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_chat_messages_conversation ON chat_messages(conversation_id, created_at);
CREATE INDEX idx_chat_messages_workspace    ON chat_messages(workspace_id);
