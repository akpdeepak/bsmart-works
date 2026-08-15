package com.bcits.works.messaging.api;

import com.bcits.works.shared.WorkspaceFilterActivator;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.Filter;
import java.time.OffsetDateTime;

/**
 * A pinned message within an internal conversation (EPIC-9).
 * The unique constraint on (conversation_id, message_id) in V128 prevents
 * duplicate pins. Tenant-scoped (RB-40 §1).
 */
@Entity
@Table(name = "pinned_messages")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME, condition = "workspace_id = :workspaceId")
public class PinnedMessage {

    @Id
    private String id;

    @Column(name = "conversation_id", nullable = false)
    private String conversationId;

    @Column(name = "workspace_id", nullable = false)
    private String workspaceId;

    @Column(name = "message_id", nullable = false)
    private String messageId;

    @Column(name = "pinned_by", nullable = false)
    private String pinnedBy;

    @Column(name = "pinned_at")
    private OffsetDateTime pinnedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getConversationId() { return conversationId; }
    public void setConversationId(String conversationId) { this.conversationId = conversationId; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getMessageId() { return messageId; }
    public void setMessageId(String messageId) { this.messageId = messageId; }
    public String getPinnedBy() { return pinnedBy; }
    public void setPinnedBy(String pinnedBy) { this.pinnedBy = pinnedBy; }
    public OffsetDateTime getPinnedAt() { return pinnedAt; }
    public void setPinnedAt(OffsetDateTime pinnedAt) { this.pinnedAt = pinnedAt; }
}
