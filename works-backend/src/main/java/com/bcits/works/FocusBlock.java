package com.bcits.works;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

/** A scheduled focus / deep-work block (Cap U — focus mode + time blocking). Private to its owner:
 *  only the owning user may read or mutate their own blocks (enforced in {@link FocusModeService}). */
@Entity
@Table(name = "focus_blocks")
public class FocusBlock {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "workspace_id") private String workspaceId;
    @Column(name = "user_id") private String userId;
    private String title;
    @Column(name = "starts_at") private OffsetDateTime startsAt;
    @Column(name = "ends_at") private OffsetDateTime endsAt;
    private String status;   // SCHEDULED | CANCELLED
    private String source;   // MANUAL | CALENDAR
    @Column(name = "allow_p0") private boolean allowP0 = true;
    @Column(name = "created_at") private OffsetDateTime createdAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public OffsetDateTime getStartsAt() { return startsAt; }
    public void setStartsAt(OffsetDateTime startsAt) { this.startsAt = startsAt; }
    public OffsetDateTime getEndsAt() { return endsAt; }
    public void setEndsAt(OffsetDateTime endsAt) { this.endsAt = endsAt; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
    public boolean isAllowP0() { return allowP0; }
    public void setAllowP0(boolean allowP0) { this.allowP0 = allowP0; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
