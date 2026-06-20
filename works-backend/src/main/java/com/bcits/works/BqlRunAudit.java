package com.bcits.works;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import org.hibernate.annotations.Filter;

/**
 * One audit row per BQL run triggered by a saved view or an automated subscription
 * ("saved/automated runs only" — RB-20 §5). Ad-hoc {@code /bql/execute} runs are not recorded
 * here, and automations keep their own {@code automation_runs} log. Written once, never updated.
 */
@Entity
@Table(name = "bql_run_audits")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME, condition = "workspace_id = :workspaceId")
public class BqlRunAudit {

    /** Run source. */
    public enum Source { SAVED_VIEW, SUBSCRIPTION }

    @Id
    private String id;
    private String workspaceId;
    private String userId;     // null for a scheduler-driven run (no human actor)
    private String source;     // Source.name()
    private String sourceId;
    private String bql;
    private Integer resultCount = 0;
    private OffsetDateTime occurredAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
    public String getSourceId() { return sourceId; }
    public void setSourceId(String sourceId) { this.sourceId = sourceId; }
    public String getBql() { return bql; }
    public void setBql(String bql) { this.bql = bql; }
    public Integer getResultCount() { return resultCount; }
    public void setResultCount(Integer resultCount) { this.resultCount = resultCount; }
    public OffsetDateTime getOccurredAt() { return occurredAt; }
    public void setOccurredAt(OffsetDateTime occurredAt) { this.occurredAt = occurredAt; }
}
