package com.bcits.works.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

/** A short-lived, single-use WebAuthn ceremony challenge (iteration 19 Cap T). Binding the
 *  signature to this server-issued nonce is what makes passkey auth phishing-resistant. */
@Entity
@Table(name = "webauthn_challenges")
public class WebAuthnChallenge {

    @Id
    private String id;

    @Column(name = "user_id")
    private String userId;

    private String challenge;

    private String ceremony;   // REGISTER | AUTHENTICATE

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "expires_at")
    private OffsetDateTime expiresAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getChallenge() { return challenge; }
    public void setChallenge(String challenge) { this.challenge = challenge; }
    public String getCeremony() { return ceremony; }
    public void setCeremony(String ceremony) { this.ceremony = ceremony; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(OffsetDateTime expiresAt) { this.expiresAt = expiresAt; }
}
