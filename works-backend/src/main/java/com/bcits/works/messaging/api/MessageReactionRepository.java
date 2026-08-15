package com.bcits.works.messaging.api;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface MessageReactionRepository extends JpaRepository<MessageReaction, String> {

    List<MessageReaction> findByMessageIdAndWorkspaceId(String messageId, String workspaceId);

    Optional<MessageReaction> findByMessageIdAndUserIdAndEmoji(String messageId, String userId, String emoji);

    void deleteByMessageIdAndUserIdAndEmoji(String messageId, String userId, String emoji);
}
