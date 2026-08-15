-- EPIC-9 full scope: conversation participants, reactions, read receipts, pinned messages.
-- All tables carry workspace_id for the Hibernate tenant filter (RB-40 §1).
-- Migration is additive only — no existing columns or rows are changed.

-- Conversation participants (who is in a DIRECT/GROUP/PROJECT conversation)
CREATE TABLE conversation_participants (
    id              VARCHAR(36)  NOT NULL PRIMARY KEY,
    conversation_id VARCHAR(36)  NOT NULL,
    workspace_id    VARCHAR(255) NOT NULL,
    user_id         VARCHAR(36)  NOT NULL,
    role            VARCHAR(32)  NOT NULL DEFAULT 'MEMBER', -- MEMBER | OWNER
    joined_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_participant UNIQUE (conversation_id, user_id)
);

CREATE INDEX idx_conv_participants_conv   ON conversation_participants (conversation_id);
CREATE INDEX idx_conv_participants_ws     ON conversation_participants (workspace_id);
CREATE INDEX idx_conv_participants_user   ON conversation_participants (user_id);

-- Message reactions (emoji reactions on a message)
CREATE TABLE message_reactions (
    id          VARCHAR(36)  NOT NULL PRIMARY KEY,
    message_id  VARCHAR(36)  NOT NULL,
    workspace_id VARCHAR(255) NOT NULL,
    user_id     VARCHAR(36)  NOT NULL,
    emoji       VARCHAR(64)  NOT NULL,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_reaction UNIQUE (message_id, user_id, emoji)
);

CREATE INDEX idx_reactions_message  ON message_reactions (message_id);
CREATE INDEX idx_reactions_ws       ON message_reactions (workspace_id);

-- Message read receipts (per-user read watermark per conversation)
CREATE TABLE message_reads (
    id                  VARCHAR(36)  NOT NULL PRIMARY KEY,
    conversation_id     VARCHAR(36)  NOT NULL,
    workspace_id        VARCHAR(255) NOT NULL,
    user_id             VARCHAR(36)  NOT NULL,
    last_read_message_id VARCHAR(36) NOT NULL,
    read_at             TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_read_receipt UNIQUE (conversation_id, user_id)
);

CREATE INDEX idx_reads_conversation ON message_reads (conversation_id);
CREATE INDEX idx_reads_ws           ON message_reads (workspace_id);
CREATE INDEX idx_reads_user         ON message_reads (user_id);

-- Pinned messages (pins are per-conversation)
CREATE TABLE pinned_messages (
    id              VARCHAR(36)  NOT NULL PRIMARY KEY,
    conversation_id VARCHAR(36)  NOT NULL,
    workspace_id    VARCHAR(255) NOT NULL,
    message_id      VARCHAR(36)  NOT NULL,
    pinned_by       VARCHAR(36)  NOT NULL,
    pinned_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_pin UNIQUE (conversation_id, message_id)
);

CREATE INDEX idx_pins_conversation ON pinned_messages (conversation_id);
CREATE INDEX idx_pins_ws           ON pinned_messages (workspace_id);
