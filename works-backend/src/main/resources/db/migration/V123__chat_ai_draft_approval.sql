-- V123: Customer chat — AI replies are drafts held for human approval.
--
-- The transformation roadmap's AI guardrail allows AI to draft and "prepare actions for review" but
-- forbids it from automatically sending customer-visible messages. Tier-1 support chat previously
-- appended the AI answer straight into chat_messages, which is the customer transcript. This
-- migration introduces the review queue that closes that gap.
--
-- Drafts deliberately live outside chat_messages: that table is append-only (RB-10 §3) and is what
-- the customer portal reads. Keeping unapproved AI text in a separate table makes the guarantee
-- structural — the customer read path never queries chat_ai_drafts, so a pending draft cannot leak
-- through a forgotten predicate. Approval appends a normal AI turn to chat_messages, carrying the
-- approving agent's id, so the transcript stays append-only and attributable. Forward-only.

CREATE TABLE chat_ai_drafts (
    id              VARCHAR(50)  PRIMARY KEY,
    workspace_id    VARCHAR(100) NOT NULL,                     -- RB-40 §1 tenant boundary
    conversation_id VARCHAR(50)  NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    body            TEXT,                                      -- the proposed reply, never customer-visible while PENDING
    ai_meta         VARCHAR(255),                              -- control-plane policy state / model tier at draft time
    status          VARCHAR(20)  NOT NULL DEFAULT 'PENDING',   -- PENDING | APPROVED | DISCARDED | SUPERSEDED
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    decided_by      VARCHAR(100),                              -- users.id of the agent who approved/discarded
    decided_at      TIMESTAMPTZ
);

-- The agent inbox asks "does this conversation have something waiting for me?" on every open.
CREATE INDEX idx_chat_ai_drafts_conversation ON chat_ai_drafts(conversation_id, status, created_at);
CREATE INDEX idx_chat_ai_drafts_workspace    ON chat_ai_drafts(workspace_id, status);
