package com.example.demo;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

/**
 * One AI invocation (iteration 10, Cap Z) — the per-call audit + usage row written by
 * {@link AiOrchestrationService} on every request (RB-40 §2). It records who, where, which
 * capability and model tier, token counts, cost, the policy state at call time, and whether the
 * deterministic fallback was used. This is core, append-style data (RB-20 §5): the single source
 * the usage dashboard and audit log both read from.
 */
@Entity
@Table(name = "ai_invocations")
public class AiInvocation {

    @Id
    private String id;
    private String workspaceId;
    private String userId;
    private String capability;
    private String modelTier;
    private Integer promptChars = 0;
    private Integer tokensIn = 0;
    private Integer tokensOut = 0;
    private BigDecimal cost = BigDecimal.ZERO;
    private String policyState;
    private Boolean fallbackUsed = false;
    private String outcome = "OK";
    private OffsetDateTime createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getCapability() { return capability; }
    public void setCapability(String capability) { this.capability = capability; }
    public String getModelTier() { return modelTier; }
    public void setModelTier(String modelTier) { this.modelTier = modelTier; }
    public Integer getPromptChars() { return promptChars; }
    public void setPromptChars(Integer promptChars) { this.promptChars = promptChars; }
    public Integer getTokensIn() { return tokensIn; }
    public void setTokensIn(Integer tokensIn) { this.tokensIn = tokensIn; }
    public Integer getTokensOut() { return tokensOut; }
    public void setTokensOut(Integer tokensOut) { this.tokensOut = tokensOut; }
    public BigDecimal getCost() { return cost; }
    public void setCost(BigDecimal cost) { this.cost = cost; }
    public String getPolicyState() { return policyState; }
    public void setPolicyState(String policyState) { this.policyState = policyState; }
    public Boolean getFallbackUsed() { return fallbackUsed; }
    public void setFallbackUsed(Boolean fallbackUsed) { this.fallbackUsed = fallbackUsed; }
    public String getOutcome() { return outcome; }
    public void setOutcome(String outcome) { this.outcome = outcome; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
