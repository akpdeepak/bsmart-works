package com.bcits.works.messaging.api;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

/**
 * Data access for customer-chat messages. Reads are by conversation (already workspace-checked by
 * the service before the messages are loaded) and ordered oldest-first so the transcript renders in
 * sequence. Append-only — messages are never updated or deleted (RB-10 §3).
 */
public interface ChatMessageRepository extends JpaRepository<ChatMessage, String> {

    List<ChatMessage> findByConversationIdOrderByCreatedAtAsc(String conversationId);
}
