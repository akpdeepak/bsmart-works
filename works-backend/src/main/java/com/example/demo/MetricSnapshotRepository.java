package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

/**
 * Data access for immutable metric snapshots. All lookups are workspace-scoped (RB-40 §1).
 * There is intentionally no update/delete-by-id method — snapshots are append-only.
 */
public interface MetricSnapshotRepository extends JpaRepository<MetricSnapshot, String> {

    List<MetricSnapshot> findByWorkspaceIdAndMetricKeyAndScopeAndScopeRefOrderByPeriodStartAsc(
        String workspaceId, String metricKey, String scope, String scopeRef);

    List<MetricSnapshot> findByWorkspaceIdAndScopeAndScopeRefOrderByPeriodStartAsc(
        String workspaceId, String scope, String scopeRef);

    boolean existsByWorkspaceIdAndMetricKeyAndScopeAndScopeRefAndPeriodLabel(
        String workspaceId, String metricKey, String scope, String scopeRef, String periodLabel);

    /** ORG snapshots have a null scopeRef — Spring Data needs an explicit "Null" finder. */
    boolean existsByWorkspaceIdAndMetricKeyAndScopeAndScopeRefIsNullAndPeriodLabel(
        String workspaceId, String metricKey, String scope, String periodLabel);

    List<MetricSnapshot> findByWorkspaceIdAndScopeAndScopeRefIsNullOrderByPeriodStartAsc(
        String workspaceId, String scope);
}
