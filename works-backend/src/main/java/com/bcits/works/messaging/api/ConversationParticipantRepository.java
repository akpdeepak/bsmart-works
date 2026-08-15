package com.bcits.works.messaging.api;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ConversationParticipantRepository extends JpaRepository<ConversationParticipant, String> {

    /** All participants for a conversation, narrowed to a workspace (defence-in-depth). */
    List<ConversationParticipant> findByConversationIdAndWorkspaceId(String conversationId, String workspaceId);

    /** Check if a user is already a participant (avoids duplicate constraint). */
    Optional<ConversationParticipant> findByConversationIdAndUserId(String conversationId, String userId);

    /** Remove a specific participant from a conversation. */
    void deleteByConversationIdAndUserId(String conversationId, String userId);
}
