package com.bcits.works.messaging;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/**
 * Data access for held-for-review AI chat drafts. Every lookup an agent can act on is
 * workspace-scoped explicitly (RB-40 §1) so a draft belonging to another tenant reads as absent.
 * The by-conversation read is used after the conversation itself has been workspace-checked.
 */
public interface ChatAiDraftRepository extends JpaRepository<ChatAiDraft, String> {

    List<ChatAiDraft> findByConversationIdAndStatusOrderByCreatedAtAsc(String conversationId, String status);

    Optional<ChatAiDraft> findByWorkspaceIdAndId(String workspaceId, String id);
}
