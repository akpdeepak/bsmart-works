package com.bcits.works.messaging.api;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface MessageReadRepository extends JpaRepository<MessageRead, String> {

    Optional<MessageRead> findByConversationIdAndUserIdAndWorkspaceId(
            String conversationId, String userId, String workspaceId);
}
