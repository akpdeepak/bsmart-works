package com.bcits.works.auth;

import com.bcits.works.shared.WorkspaceFilterActivator;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import org.hibernate.annotations.Filter;

/** A user's registered passkey (WebAuthn credential). The private key never leaves the device;
 *  we keep only the public key + signature counter (iteration 19 Cap T, RB-40 §4). */
@Entity
@Table(name = "webauthn_credentials")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME, condition = "workspace_id = :workspaceId")
public class WebAuthnCredential {

    @Id
    private String id;

    @Column(name = "user_id")
    private String userId;

    @Column(name = "workspace_id")
    private String workspaceId;

    @Column(name = "credential_id")
    private String credentialId;

    /** Pre-cutover signed-nonce public key (V52). Always null for FIDO2 rows; retained only so any
     *  orphaned legacy row is recognisable (and rejected) until a CONTRACT migration drops the column. */
    @Column(name = "public_key_pem")
    private String publicKeyPem;

    /** The serialized {@code AttestedCredentialData} (aaguid + credentialId + COSE public key) produced
     *  by webauthn4j's {@code AttestedCredentialDataConverter} — the FIDO2 credential material. */
    @Column(name = "cose_credential")
    private byte[] coseCredential;

    /** FIDO2 authenticator model id (aaguid, UUID string). Null for legacy rows. */
    private String aaguid;

    /** FIDO2 attestation statement format (e.g. {@code none}). Null for legacy rows. */
    private String fmt;

    /** WebAuthn {@code user.id} handle (base64url) bound to this credential. Null for legacy rows. */
    @Column(name = "user_handle")
    private String userHandle;

    /** Whether user verification (biometric/PIN) was performed when the credential was registered. */
    @Column(name = "uv_initialized")
    private boolean uvInitialized = false;

    private String algorithm = "ES256";

    @Column(name = "sign_count")
    private long signCount = 0;

    private String label = "Passkey";

    private String transports;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "last_used_at")
    private OffsetDateTime lastUsedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getCredentialId() { return credentialId; }
    public void setCredentialId(String credentialId) { this.credentialId = credentialId; }
    public String getPublicKeyPem() { return publicKeyPem; }
    public void setPublicKeyPem(String publicKeyPem) { this.publicKeyPem = publicKeyPem; }
    public byte[] getCoseCredential() { return coseCredential; }
    public void setCoseCredential(byte[] coseCredential) { this.coseCredential = coseCredential; }
    public String getAaguid() { return aaguid; }
    public void setAaguid(String aaguid) { this.aaguid = aaguid; }
    public String getFmt() { return fmt; }
    public void setFmt(String fmt) { this.fmt = fmt; }
    public String getUserHandle() { return userHandle; }
    public void setUserHandle(String userHandle) { this.userHandle = userHandle; }
    public boolean isUvInitialized() { return uvInitialized; }
    public void setUvInitialized(boolean uvInitialized) { this.uvInitialized = uvInitialized; }
    public String getAlgorithm() { return algorithm; }
    public void setAlgorithm(String algorithm) { this.algorithm = algorithm; }
    public long getSignCount() { return signCount; }
    public void setSignCount(long signCount) { this.signCount = signCount; }
    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }
    public String getTransports() { return transports; }
    public void setTransports(String transports) { this.transports = transports; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getLastUsedAt() { return lastUsedAt; }
    public void setLastUsedAt(OffsetDateTime lastUsedAt) { this.lastUsedAt = lastUsedAt; }
}
