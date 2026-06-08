package com.bcits.works;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/** Spring Data JPA repository for {@link PiiVaultEntry}. Workspace-scoped (RB-40 §1). */
public interface PiiVaultRepository extends JpaRepository<PiiVaultEntry, String> {

    /** All PII entries for a workspace — used by {@link KeyRotationService} during key rotation. */
    List<PiiVaultEntry> findByWorkspaceId(String workspaceId);

    /** All PII entries for a specific data subject in a workspace — used for right-to-be-forgotten. */
    List<PiiVaultEntry> findByWorkspaceIdAndSubjectId(String workspaceId, String subjectId);
}
