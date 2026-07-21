package com.bcits.works.messenger;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import org.hibernate.annotations.Filter;
import com.bcits.works.shared.WorkspaceFilterActivator;

@Entity
@Table(name = "messages")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME, condition = "channel_id IN (SELECT c.id FROM channels c WHERE c.workspace_id = :workspaceId)")
public class Message {
    @Id
    private String id;
    private String channelId;
    private String senderId;
    private String content;
    private OffsetDateTime createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getChannelId() { return channelId; }
    public void setChannelId(String channelId) { this.channelId = channelId; }
    public String getSenderId() { return senderId; }
    public void setSenderId(String senderId) { this.senderId = senderId; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
