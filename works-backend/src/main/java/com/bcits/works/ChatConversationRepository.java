package com.bcits.works;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

/**
 * Data access for customer-chat conversations. Every finder is workspace-scoped (RB-40 §1) so a
 * query can never return another tenant's threads; {@link #findByWorkspaceIdAndId} is the
 * cross-tenant guard used before any read or mutation of a single conversation.
 */
public interface ChatConversationRepository extends JpaRepository<ChatConversation, String> {

    List<ChatConversation> findByWorkspaceIdOrderByLastMessageAtDesc(String workspaceId);

    List<ChatConversation> findByWorkspaceIdAndStatusOrderByLastMessageAtDesc(String workspaceId, String status);

    Optional<ChatConversation> findByWorkspaceIdAndId(String workspaceId, String id);

    /** Backfill guard (RB-40 §3, Slice 3): conversations whose denormalised customer_name has not yet
     *  been tokenized into the vault. Runs in system scope so the workspace @Filter does not narrow it. */
    List<ChatConversation> findByCustomerSubjectTokenIsNullAndCustomerNameIsNotNull();
}
