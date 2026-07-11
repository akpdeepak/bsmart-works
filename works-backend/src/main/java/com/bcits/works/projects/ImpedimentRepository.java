package com.bcits.works.projects;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ImpedimentRepository extends JpaRepository<Impediment, String> {
    List<Impediment> findByWorkspaceIdAndDeletedAtIsNullOrderByCreatedAtDesc(String workspaceId);
    List<Impediment> findByProjectIdAndDeletedAtIsNullOrderByCreatedAtDesc(String projectId);
    List<Impediment> findBySprintIdAndDeletedAtIsNullOrderByCreatedAtDesc(String sprintId);

    /**
     * Candidates for the SLA-breach sweep: severity X, not in the given (resolved) status, live.
     * Deliberately cross-workspace — the SLA notifier is a system job that scans every tenant
     * (like {@code SlaClockScheduler}); the notifications it raises go only to each impediment's
     * own project/workspace members, so there is no cross-tenant leak (RB-40 §1).
     */
    List<Impediment> findBySeverityAndStatusNotAndDeletedAtIsNull(String severity, String status);
}
