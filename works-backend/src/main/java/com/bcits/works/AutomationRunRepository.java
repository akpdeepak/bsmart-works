package com.bcits.works;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Data access for automation run records (the audit log). Workspace-scoped (RB-40 §1).
 */
public interface AutomationRunRepository extends JpaRepository<AutomationRun, String> {

    Page<AutomationRun> findByWorkspaceIdOrderByCreatedAtDesc(String workspaceId, Pageable pageable);
}
