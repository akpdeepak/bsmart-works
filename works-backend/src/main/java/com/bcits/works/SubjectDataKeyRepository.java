package com.bcits.works;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/** Spring Data JPA repository for {@link SubjectDataKey}. Workspace-scoped (RB-40 §1) — every
 *  finder takes an explicit {@code workspaceId} so it is correct whether or not the central tenant
 *  filter is active (the vault is also written from system-context backfill/erasure paths). */
public interface SubjectDataKeyRepository extends JpaRepository<SubjectDataKey, String> {

    /** The single data-key row for a subject in a workspace (UNIQUE(workspace_id, subject_id)). */
    Optional<SubjectDataKey> findByWorkspaceIdAndSubjectId(String workspaceId, String subjectId);

    /** All active+shredded data-key rows for a workspace — used by {@link KeyRotationService}. */
    List<SubjectDataKey> findByWorkspaceId(String workspaceId);
}
