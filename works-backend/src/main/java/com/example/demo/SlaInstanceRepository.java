package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

/**
 * Data access for running SLA clocks. Reads are workspace- or work-item-scoped (RB-40 §1).
 */
public interface SlaInstanceRepository extends JpaRepository<SlaInstance, String> {

    List<SlaInstance> findByWorkItemIdOrderByMetricAsc(String workItemId);

    Optional<SlaInstance> findByWorkItemIdAndTargetId(String workItemId, String targetId);

    List<SlaInstance> findByWorkspaceId(String workspaceId);

    List<SlaInstance> findByStatusIn(List<String> statuses);
}
