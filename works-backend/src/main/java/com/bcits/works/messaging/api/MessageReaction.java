package com.bcits.works.messaging.api;

import com.bcits.works.shared.WorkspaceFilterActivator;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.Filter;
import java.time.OffsetDateTime;

/**
 * Emoji reaction on a single internal message (EPIC-9).
 * Tenant-scoped (RB-40 §1); the unique constraint on (message_id, user_id, emoji)
 * is enforced at the DB layer (V128 migration).
 */
@Entity
@Table(name = "message_reactions")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME, condition = "workspace_id = :workspaceId")
public class MessageReaction {

    @Id
    private String id;

    @Column(name = "message_id", nullable = false)
    private String messageId;

    @Column(name = "workspace_id", nullable = false)
    private String workspaceId;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "emoji", nullable = false)
    private String emoji;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getMessageId() { return messageId; }
    public void setMessageId(String messageId) { this.messageId = messageId; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getEmoji() { return emoji; }
    public void setEmoji(String emoji) { this.emoji = emoji; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
