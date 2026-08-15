package com.bcits.works.messaging.api;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PinnedMessageRepository extends JpaRepository<PinnedMessage, String> {

    List<PinnedMessage> findByConversationIdAndWorkspaceIdOrderByPinnedAtDesc(
            String conversationId, String workspaceId);

    Optional<PinnedMessage> findByConversationIdAndMessageIdAndWorkspaceId(
            String conversationId, String messageId, String workspaceId);

    void deleteByConversationIdAndMessageIdAndWorkspaceId(
            String conversationId, String messageId, String workspaceId);
}
