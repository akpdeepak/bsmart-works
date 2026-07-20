ALTER TABLE chat_conversations
ADD COLUMN conversation_type VARCHAR(50) NOT NULL DEFAULT 'SUPPORT';

ALTER TABLE chat_messages
ADD COLUMN artifact_type VARCHAR(50),
ADD COLUMN artifact_ref VARCHAR(255);
