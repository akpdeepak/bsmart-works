package com.bcits.works.messaging.api;

import com.bcits.works.shared.WorkspaceFilterActivator;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.Filter;
import java.time.OffsetDateTime;

/**
 * Per-user read watermark for a conversation (EPIC-9 read receipts).
 * Records the {@code lastReadMessageId} so the UI can compute unread counts.
 * Tenant-scoped (RB-40 §1). The unique constraint on (conversation_id, user_id)
 * is enforced in V128; an upsert is used so only one row exists per user/conversation.
 */
@Entity
@Table(name = "message_reads")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME, condition = "workspace_id = :workspaceId")
public class MessageRead {

    @Id
    private String id;

    @Column(name = "conversation_id", nullable = false)
    private String conversationId;

    @Column(name = "workspace_id", nullable = false)
    private String workspaceId;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "last_read_message_id", nullable = false)
    private String lastReadMessageId;

    @Column(name = "read_at")
    private OffsetDateTime readAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getConversationId() { return conversationId; }
    public void setConversationId(String conversationId) { this.conversationId = conversationId; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getLastReadMessageId() { return lastReadMessageId; }
    public void setLastReadMessageId(String lastReadMessageId) { this.lastReadMessageId = lastReadMessageId; }
    public OffsetDateTime getReadAt() { return readAt; }
    public void setReadAt(OffsetDateTime readAt) { this.readAt = readAt; }
}
