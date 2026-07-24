package com.bcits.works.ai;
import com.bcits.works.workspaces.api.Workspace;

import com.bcits.works.shared.WorkspaceFilterActivator;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import org.hibernate.annotations.Filter;

/**
 * A single slot of AI memory (Cap O, iteration 20) — a preference, conversation context or history
 * line the AI remembers across sessions, scoped to (workspace, user) and optionally a specific
 * assistant. Workspace- and user-scoped (RB-40 §1): a user only ever reads their own memory within
 * their own workspace.
 */
@Entity
@Table(name = "ai_memories")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME, condition = "workspace_id = :workspaceId")
public class AiMemory {

    @Id
    private String id;

    @Column(name = "workspace_id")
    private String workspaceId;

    @Column(name = "user_id")
    private String userId;

    @Column(name = "assistant_id")
    private String assistantId;

    private String kind;

    @Column(name = "mem_key")
    private String memKey;

    @Column(name = "mem_value")
    private String memValue;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getAssistantId() { return assistantId; }
    public void setAssistantId(String assistantId) { this.assistantId = assistantId; }
    public String getKind() { return kind; }
    public void setKind(String kind) { this.kind = kind; }
    public String getMemKey() { return memKey; }
    public void setMemKey(String memKey) { this.memKey = memKey; }
    public String getMemValue() { return memValue; }
    public void setMemValue(String memValue) { this.memValue = memValue; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
