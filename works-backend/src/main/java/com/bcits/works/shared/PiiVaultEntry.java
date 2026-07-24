package com.bcits.works.shared;
import com.bcits.works.workspaces.api.Workspace;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;
import org.hibernate.annotations.Filter;

/**
 * An encrypted PII record (RB-40 §3). Raw personal data (email, phone, name, address) is never
 * stored in events, projections, or indexes — only an opaque {@code subjectId} token that maps
 * to this vault entry. On right-to-be-forgotten, this row and the per-subject encryption key are
 * destroyed; the event history stays intact (crypto-shredding). Workspace-scoped (RB-40 §1).
 */
@Entity
@Table(name = "pii_vault_entries")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME, condition = "workspace_id = :workspaceId")
public class PiiVaultEntry {

    @Id
    private String id;

    @Column(name = "workspace_id", nullable = false)
    private String workspaceId;

    @Column(name = "subject_id", nullable = false)
    private String subjectId;

    @Column(name = "pii_type", nullable = false)
    private String piiType;

    @Column(name = "encrypted_value", nullable = false)
    private String encryptedValue;

    @Column(name = "key_version")
    private String keyVersion;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }

    public String getSubjectId() { return subjectId; }
    public void setSubjectId(String subjectId) { this.subjectId = subjectId; }

    public String getPiiType() { return piiType; }
    public void setPiiType(String piiType) { this.piiType = piiType; }

    public String getEncryptedValue() { return encryptedValue; }
    public void setEncryptedValue(String encryptedValue) { this.encryptedValue = encryptedValue; }

    public String getKeyVersion() { return keyVersion; }
    public void setKeyVersion(String keyVersion) { this.keyVersion = keyVersion; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
