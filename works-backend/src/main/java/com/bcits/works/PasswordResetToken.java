package com.bcits.works;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;

/**
 * Single-use, time-boxed token backing the forgot-password flow.
 * Table created in V4__iteration1_complete.sql — no new migration needed.
 */
@Entity
@Table(name = "password_reset_tokens")
public class PasswordResetToken {

    @Id
    private String token;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "expires_at", nullable = false)
    private OffsetDateTime expiresAt;

    @Column(nullable = false)
    private boolean used = false;

    public String getToken()                       { return token; }
    public void   setToken(String token)           { this.token = token; }

    public String getUserId()                      { return userId; }
    public void   setUserId(String userId)         { this.userId = userId; }

    public OffsetDateTime getExpiresAt()           { return expiresAt; }
    public void setExpiresAt(OffsetDateTime e)     { this.expiresAt = e; }

    public boolean isUsed()                        { return used; }
    public void    setUsed(boolean used)           { this.used = used; }
}
