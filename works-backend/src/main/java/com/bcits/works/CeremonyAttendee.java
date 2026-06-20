package com.bcits.works;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import java.time.OffsetDateTime;
import org.hibernate.annotations.Filter;

/**
 * Cap V · Per-member ceremony attendance: EXPECTED when scheduled, JOINED on an explicit
 * Join while the session is LIVE, EXCUSED by the facilitator, and remaining EXPECTED rows
 * flip to ABSENT when the ceremony completes — so "who joined, who didn't" is a record,
 * not a memory.
 */
@Entity
@Table(name = "ceremony_attendees")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME, condition = "workspace_id = :workspaceId")
public class CeremonyAttendee {
    @Id private String id;
    private String workspaceId;
    @NotBlank private String sessionId;
    @NotBlank private String userId;
    private String status = "EXPECTED";   // EXPECTED | JOINED | ABSENT | EXCUSED
    private OffsetDateTime joinedAt;
    private OffsetDateTime leftAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public OffsetDateTime getJoinedAt() { return joinedAt; }
    public void setJoinedAt(OffsetDateTime joinedAt) { this.joinedAt = joinedAt; }
    public OffsetDateTime getLeftAt() { return leftAt; }
    public void setLeftAt(OffsetDateTime leftAt) { this.leftAt = leftAt; }
}
