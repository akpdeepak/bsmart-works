package com.bcits.works.messaging;

import com.bcits.works.shared.WorkspaceFilterActivator;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import org.hibernate.annotations.Filter;

/**
 * One turn in a customer-portal chat conversation (iteration 20, Cap N). The message history is
 * append-only — turns are never updated or deleted. {@code senderType} is CUSTOMER / AI / AGENT;
 * {@code aiMeta} records the control-plane policy state and model tier when AI authored the turn,
 * so the UI can honestly show whether the tier-1 answer was real AI or a fallback (RB-40 §2).
 * Tenant-scoped by {@code workspaceId} (RB-40 §1).
 */
@Entity
@Table(name = "chat_messages")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME, condition = "workspace_id = :workspaceId")
public class ChatMessage {

    @Id
    private String id;

    @Column(name = "workspace_id")
    private String workspaceId;

    @Column(name = "conversation_id")
    private String conversationId;

    @Column(name = "sender_type")
    private String senderType;

    @Column(name = "sender_id")
    private String senderId;

    private String body;

    @Column(name = "ai_meta")
    private String aiMeta;

    @Column(name = "artifact_type")
    private String artifactType;

    @Column(name = "artifact_ref")
    private String artifactRef;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getConversationId() { return conversationId; }
    public void setConversationId(String conversationId) { this.conversationId = conversationId; }
    public String getSenderType() { return senderType; }
    public void setSenderType(String senderType) { this.senderType = senderType; }
    public String getSenderId() { return senderId; }
    public void setSenderId(String senderId) { this.senderId = senderId; }
    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }
    public String getAiMeta() { return aiMeta; }
    public void setAiMeta(String aiMeta) { this.aiMeta = aiMeta; }
    public String getArtifactType() { return artifactType; }
    public void setArtifactType(String artifactType) { this.artifactType = artifactType; }
    public String getArtifactRef() { return artifactRef; }
    public void setArtifactRef(String artifactRef) { this.artifactRef = artifactRef; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
