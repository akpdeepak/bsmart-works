package com.bcits.works.reporting;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

/**
 * Data access for KPI metric definitions. Every lookup is workspace-scoped so a definition can never
 * be read across tenants (RB-40 §1).
 */
public interface MetricDefinitionRepository extends JpaRepository<MetricDefinition, String> {

    List<MetricDefinition> findByWorkspaceIdOrderByNameAsc(String workspaceId);

    Optional<MetricDefinition> findByWorkspaceIdAndMetricKey(String workspaceId, String metricKey);
}
