package com.bcits.works;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import java.time.OffsetDateTime;

/**
 * Cap V · Standup facilitator (I15-S02). One per-member turn within a {@link StandupSession}:
 * yesterday / today / blockers, ordered by {@code displayOrder}, with a recording lifecycle.
 */
@Entity
@Table(name = "standup_entries")
public class StandupEntry {
    @Id private String id;
    private String sessionId;
    @NotBlank private String memberId;
    @Column(columnDefinition = "TEXT") private String yesterday;
    @Column(columnDefinition = "TEXT") private String today;
    @Column(columnDefinition = "TEXT") private String blockers;
    private String status = "PENDING";   // PENDING | RECORDED | SKIPPED | MISSING
    private OffsetDateTime recordedAt;
    private int displayOrder = 0;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }
    public String getMemberId() { return memberId; }
    public void setMemberId(String memberId) { this.memberId = memberId; }
    public String getYesterday() { return yesterday; }
    public void setYesterday(String yesterday) { this.yesterday = yesterday; }
    public String getToday() { return today; }
    public void setToday(String today) { this.today = today; }
    public String getBlockers() { return blockers; }
    public void setBlockers(String blockers) { this.blockers = blockers; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public OffsetDateTime getRecordedAt() { return recordedAt; }
    public void setRecordedAt(OffsetDateTime recordedAt) { this.recordedAt = recordedAt; }
    public int getDisplayOrder() { return displayOrder; }
    public void setDisplayOrder(int displayOrder) { this.displayOrder = displayOrder; }
}
