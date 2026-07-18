package com.bcits.works.messaging;

import com.bcits.works.shared.WorkspaceFilterActivator;

import org.hibernate.annotations.Filter;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

@Entity
@Table(name = "meeting_note")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME,
        condition = "meeting_id IN (SELECT m.id FROM meeting m WHERE m.workspace_id = :workspaceId)")
public class MeetingNote {
    @Id private String id;
    private String meetingId;
    private String section; // AGENDA | NOTES | DECISIONS | ACTIONS
    @Column(columnDefinition = "TEXT") private String content;
    private String createdBy;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getMeetingId() { return meetingId; }
    public void setMeetingId(String meetingId) { this.meetingId = meetingId; }
    public String getSection() { return section; }
    public void setSection(String section) { this.section = section; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
