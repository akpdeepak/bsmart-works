package com.bcits.works;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

/** One ordered step of a multi-step agent run (Cap O, iteration 20). Workspace-scoped (RB-40 §1). */
@Entity
@Table(name = "ai_agent_steps")
public class AiAgentStep {

    @Id
    private String id;

    @Column(name = "run_id")
    private String runId;

    @Column(name = "workspace_id")
    private String workspaceId;

    private Integer seq;
    private String capability;
    private String description;
    private String status;

    @Column(name = "result_summary")
    private String resultSummary;

    @Column(name = "used_ai")
    private Boolean usedAi;

    @Column(name = "policy_state")
    private String policyState;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getRunId() { return runId; }
    public void setRunId(String runId) { this.runId = runId; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public Integer getSeq() { return seq; }
    public void setSeq(Integer seq) { this.seq = seq; }
    public String getCapability() { return capability; }
    public void setCapability(String capability) { this.capability = capability; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getResultSummary() { return resultSummary; }
    public void setResultSummary(String resultSummary) { this.resultSummary = resultSummary; }
    public Boolean getUsedAi() { return usedAi; }
    public void setUsedAi(Boolean usedAi) { this.usedAi = usedAi; }
    public String getPolicyState() { return policyState; }
    public void setPolicyState(String policyState) { this.policyState = policyState; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
