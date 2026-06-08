package com.bcits.works;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;

/**
 * A Web Push subscription — one per user browser/device (iteration 18, Cap S). Stores the push
 * endpoint and the keys the server would use to encrypt a push payload. Per-user; the endpoint is
 * unique so a re-subscribing browser upserts its existing row rather than duplicating it.
 */
@Entity
@Table(name = "push_subscriptions")
public class PushSubscription {

    @Id
    private String id;

    @Column(name = "user_id")
    private String userId;

    // TEXT columns — mirror the AppEvent pattern so Hibernate ddl-auto=validate matches the schema.
    @Column(columnDefinition = "TEXT")
    private String endpoint;
    @Column(columnDefinition = "TEXT")
    private String p256dh;
    @Column(columnDefinition = "TEXT")
    private String auth;

    @Column(name = "user_agent")
    private String userAgent;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "last_seen_at")
    private OffsetDateTime lastSeenAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getEndpoint() { return endpoint; }
    public void setEndpoint(String endpoint) { this.endpoint = endpoint; }
    public String getP256dh() { return p256dh; }
    public void setP256dh(String p256dh) { this.p256dh = p256dh; }
    public String getAuth() { return auth; }
    public void setAuth(String auth) { this.auth = auth; }
    public String getUserAgent() { return userAgent; }
    public void setUserAgent(String userAgent) { this.userAgent = userAgent; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getLastSeenAt() { return lastSeenAt; }
    public void setLastSeenAt(OffsetDateTime lastSeenAt) { this.lastSeenAt = lastSeenAt; }
}
