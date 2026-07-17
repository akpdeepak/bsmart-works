package com.bcits.works.ai;

import com.bcits.works.shared.WorkspaceFilterActivator;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import org.hibernate.annotations.Filter;

/**
 * One row of the AI audit log (RB-40 §2): who invoked which capability, on what workspace, at what
 * model tier, with token counts, cost, whether it was a cache hit, whether the deterministic
 * fallback was served, and the AI-policy state at call time. This is core data (RB-20 §5) — it is
 * what makes AI invocations regulator-verifiable.
 */
@Entity
@Table(name = "ai_invocations")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME, condition = "workspace_id = :workspaceId")
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
    private Integer costCents = 0;
    private Boolean cacheHit = false;
    private Boolean fallbackUsed = false;
    private String policyState;
    private String status = "OK";
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
    public Integer getCostCents() { return costCents; }
    public void setCostCents(Integer costCents) { this.costCents = costCents; }
    public Boolean getCacheHit() { return cacheHit; }
    public void setCacheHit(Boolean cacheHit) { this.cacheHit = cacheHit; }
    public Boolean getFallbackUsed() { return fallbackUsed; }
    public void setFallbackUsed(Boolean fallbackUsed) { this.fallbackUsed = fallbackUsed; }
    public String getPolicyState() { return policyState; }
    public void setPolicyState(String policyState) { this.policyState = policyState; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
