package com.bcits.works.messaging;

import com.bcits.works.messaging.api.ConversationParticipantRepository;
import com.bcits.works.messaging.api.MessageReactionRepository;
import com.bcits.works.messaging.api.PinnedMessageRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Owns the transactional delete boundaries for internal-messaging mutations. */
@Service
public class InternalMessagingMutationService {

    private final ConversationParticipantRepository participantRepo;
    private final MessageReactionRepository reactionRepo;
    private final PinnedMessageRepository pinRepo;

    public InternalMessagingMutationService(ConversationParticipantRepository participantRepo,
                                            MessageReactionRepository reactionRepo,
                                            PinnedMessageRepository pinRepo) {
        this.participantRepo = participantRepo;
        this.reactionRepo = reactionRepo;
        this.pinRepo = pinRepo;
    }

    @Transactional
    public void removeParticipant(String conversationId, String userId) {
        participantRepo.deleteByConversationIdAndUserId(conversationId, userId);
    }

    @Transactional
    public void removeReaction(String messageId, String userId, String emoji) {
        reactionRepo.deleteByMessageIdAndUserIdAndEmoji(messageId, userId, emoji);
    }

    @Transactional
    public void unpinMessage(String conversationId, String messageId, String workspaceId) {
        pinRepo.deleteByConversationIdAndMessageIdAndWorkspaceId(conversationId, messageId, workspaceId);
    }
}
