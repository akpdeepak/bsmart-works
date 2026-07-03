package com.bcits.works;

import com.bcits.works.shared.WorkspaceFilterActivator;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;
import org.hibernate.annotations.Filter;

/**
 * The envelope-wrapped data key (DEK) for one data subject (RB-40 §3, EPIC-P1-pii-vault). Each
 * subject's {@link PiiVaultEntry} rows are encrypted under this subject's AES-256 DEK; the DEK
 * itself is stored only as {@link #wrappedDek} — envelope-encrypted under the workspace KEK held by
 * the {@link KmsProvider} — never in plaintext.
 *
 * <p><b>Crypto-shred:</b> {@code PiiVaultService.forget(...)} sets {@link #keyState} to
 * {@code SHREDDED}, NULLs {@link #wrappedDek}, and hard-deletes the subject's vault rows. The DEK is
 * then unrecoverable, so any ciphertext lingering in a backup is permanently undecryptable
 * (RB-40 §3 rule 2). The surrogate id + subject token survive so events stay re-derivable (rule 3).
 *
 * <p>Workspace-scoped (RB-40 §1). Global-by-design user identity is keyed under the reserved
 * {@code PLATFORM} scope (see {@link PiiVaultService#PLATFORM_SCOPE}).
 */
@Entity
@Table(name = "subject_data_keys")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME, condition = "workspace_id = :workspaceId")
public class SubjectDataKey {

    /** ACTIVE — the DEK exists and PII can be read/written. */
    public static final String STATE_ACTIVE = "ACTIVE";
    /** SHREDDED — the DEK has been destroyed (right-to-be-forgotten); PII resolves to "[erased]". */
    public static final String STATE_SHREDDED = "SHREDDED";

    @Id
    private String id;

    @Column(name = "workspace_id", nullable = false)
    private String workspaceId;

    @Column(name = "subject_id", nullable = false)
    private String subjectId;

    @Column(name = "wrapped_dek")
    private String wrappedDek;

    @Column(name = "key_ref")
    private String keyRef;

    @Column(name = "key_state", nullable = false)
    private String keyState = STATE_ACTIVE;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @Column(name = "shredded_at")
    private OffsetDateTime shreddedAt;

    public boolean isShredded() { return STATE_SHREDDED.equals(keyState) || wrappedDek == null; }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }

    public String getSubjectId() { return subjectId; }
    public void setSubjectId(String subjectId) { this.subjectId = subjectId; }

    public String getWrappedDek() { return wrappedDek; }
    public void setWrappedDek(String wrappedDek) { this.wrappedDek = wrappedDek; }

    public String getKeyRef() { return keyRef; }
    public void setKeyRef(String keyRef) { this.keyRef = keyRef; }

    public String getKeyState() { return keyState; }
    public void setKeyState(String keyState) { this.keyState = keyState; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }

    public OffsetDateTime getShreddedAt() { return shreddedAt; }
    public void setShreddedAt(OffsetDateTime shreddedAt) { this.shreddedAt = shreddedAt; }
}
