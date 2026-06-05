package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

/**
 * Data access for metric definitions. Workspace-scoped lookups never cross tenants (RB-40 §1);
 * the default catalog (workspaceId == null) is global by design.
 */
public interface MetricDefinitionRepository extends JpaRepository<MetricDefinition, String> {

    List<MetricDefinition> findByWorkspaceIdOrderByCategoryAscNameAsc(String workspaceId);

    List<MetricDefinition> findByWorkspaceIdAndActiveTrue(String workspaceId);

    /** The seeded global default catalog (no workspace). */
    List<MetricDefinition> findByWorkspaceIdIsNullOrderByNameAsc();

    List<MetricDefinition> findByIsDefaultTrueOrderByNameAsc();

    Optional<MetricDefinition> findByWorkspaceIdAndMetricKey(String workspaceId, String metricKey);
}
