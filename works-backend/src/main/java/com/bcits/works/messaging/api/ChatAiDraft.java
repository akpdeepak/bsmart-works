package com.bcits.works.messaging.api;

import com.bcits.works.shared.WorkspaceFilterActivator;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import org.hibernate.annotations.Filter;

/**
 * A tier-1 AI reply held for human review before it can reach a customer.
 *
 * <p>The transformation roadmap's AI guardrail is that AI may "summarize, draft, recommend, explain,
 * and prepare actions for review" but "must not automatically … send customer-visible messages".
 * A draft is therefore never part of the customer transcript: it lives in this separate, mutable
 * table, and only an agent's explicit approval appends the corresponding turn to the append-only
 * {@link ChatMessage} history. That separation is structural, not a flag — the customer-facing read
 * path never touches this table, so a pending draft cannot leak by omission of a filter.
 *
 * <p>{@code status} is PENDING → APPROVED / DISCARDED / SUPERSEDED. SUPERSEDED is set when the
 * customer writes again before an agent has acted, so no agent can approve a reply that was drafted
 * against stale context. Unlike {@link ChatMessage} this row is deliberately mutable — the decision
 * is recorded on the draft, while the audit trail of what actually happened lives in {@code events}
 * and in the AI Control Plane invocation log. Tenant-scoped by {@code workspaceId} (RB-40 §1).
 */
@Entity
@Table(name = "chat_ai_drafts")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME, condition = "workspace_id = :workspaceId")
public class ChatAiDraft {

    @Id
    private String id;

    @Column(name = "workspace_id")
    private String workspaceId;

    @Column(name = "conversation_id")
    private String conversationId;

    private String body;

    @Column(name = "ai_meta")
    private String aiMeta;

    private String status;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "decided_by")
    private String decidedBy;

    @Column(name = "decided_at")
    private OffsetDateTime decidedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getConversationId() { return conversationId; }
    public void setConversationId(String conversationId) { this.conversationId = conversationId; }
    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }
    public String getAiMeta() { return aiMeta; }
    public void setAiMeta(String aiMeta) { this.aiMeta = aiMeta; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public String getDecidedBy() { return decidedBy; }
    public void setDecidedBy(String decidedBy) { this.decidedBy = decidedBy; }
    public OffsetDateTime getDecidedAt() { return decidedAt; }
    public void setDecidedAt(OffsetDateTime decidedAt) { this.decidedAt = decidedAt; }
}
