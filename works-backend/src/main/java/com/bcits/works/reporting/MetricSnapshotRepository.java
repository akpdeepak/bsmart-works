package com.bcits.works.reporting;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

/**
 * Data access for immutable metric snapshots. Workspace-scoped (RB-40 §1); snapshots are never
 * updated or deleted in normal operation (audit-safe history, RB-20 §5).
 */
public interface MetricSnapshotRepository extends JpaRepository<MetricSnapshot, String> {

    List<MetricSnapshot> findByWorkspaceIdAndMetricKeyAndScopeLevelAndScopeIdOrderByPeriodAsc(
        String workspaceId, String metricKey, String scopeLevel, String scopeId);

    List<MetricSnapshot> findByWorkspaceIdOrderByCreatedAtDesc(String workspaceId);
}
