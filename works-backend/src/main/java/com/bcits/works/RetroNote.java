package com.bcits.works;

import org.hibernate.annotations.Filter;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import java.time.OffsetDateTime;

/**
 * Cap V · Retro toolkit (I15-S05). A single sticky note on a {@link RetroSession} board, placed in a
 * template column. {@code authorId} is null when the session is anonymous.
 */
@Entity
@Table(name = "retro_notes")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME,
        condition = "session_id IN (SELECT s.id FROM retro_sessions s WHERE s.workspace_id = :workspaceId)")
public class RetroNote {
    @Id private String id;
    @NotBlank private String sessionId;
    @NotBlank private String columnKey; // START|STOP|CONTINUE|LIKED|LEARNED|LACKED|LONGED_FOR|MAD|SAD|GLAD
    @NotBlank @Column(columnDefinition = "TEXT") private String content;
    private String authorId;
    private int votes = 0;
    private String convertedActionItemId;
    private OffsetDateTime createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }
    public String getColumnKey() { return columnKey; }
    public void setColumnKey(String columnKey) { this.columnKey = columnKey; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getAuthorId() { return authorId; }
    public void setAuthorId(String authorId) { this.authorId = authorId; }
    public int getVotes() { return votes; }
    public void setVotes(int votes) { this.votes = votes; }
    public String getConvertedActionItemId() { return convertedActionItemId; }
    public void setConvertedActionItemId(String convertedActionItemId) { this.convertedActionItemId = convertedActionItemId; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
