package com.bcits.works.messaging.api;

import com.bcits.works.shared.WorkspaceFilterActivator;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.Filter;
import java.time.OffsetDateTime;

/**
 * A member of an internal conversation (EPIC-9). Every participant row is
 * workspace-scoped (RB-40 §1) and covered by the Hibernate tenant filter.
 * {@code role} is MEMBER | OWNER; only OWNER may remove other participants or
 * delete the conversation (enforced in the service layer, never the controller).
 */
@Entity
@Table(name = "conversation_participants")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME, condition = "workspace_id = :workspaceId")
public class ConversationParticipant {

    @Id
    private String id;

    @Column(name = "conversation_id", nullable = false)
    private String conversationId;

    @Column(name = "workspace_id", nullable = false)
    private String workspaceId;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "role", nullable = false)
    private String role = "MEMBER";

    @Column(name = "joined_at")
    private OffsetDateTime joinedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getConversationId() { return conversationId; }
    public void setConversationId(String conversationId) { this.conversationId = conversationId; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public OffsetDateTime getJoinedAt() { return joinedAt; }
    public void setJoinedAt(OffsetDateTime joinedAt) { this.joinedAt = joinedAt; }
}
