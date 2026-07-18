package com.bcits.works.projects;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PmIssueRepository extends JpaRepository<PmIssue, String> {
    List<PmIssue> findByProjectIdAndDeletedAtIsNull(String projectId);
    List<PmIssue> findByWorkspaceIdAndDeletedAtIsNull(String workspaceId);

    /** Bounded to a project within its owning workspace (RB-40 §1) — a foreign projectId cannot leak rows. */
    List<PmIssue> findByProjectIdAndWorkspaceIdAndDeletedAtIsNull(String projectId, String workspaceId);
}
