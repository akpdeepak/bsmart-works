package com.bcits.works.sla;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

/**
 * Data access for SLA clocks. All caller-facing lookups are workspace-scoped so a clock can never
 * be read across tenants (RB-40 §1); {@link #findByStateIn} is the scheduler's working set and is
 * never returned to a caller.
 */
public interface SlaInstanceRepository extends JpaRepository<SlaInstance, String> {

    List<SlaInstance> findByWorkspaceIdAndWorkItemId(String workspaceId, String workItemId);

    List<SlaInstance> findByWorkspaceIdOrderByDueAtAsc(String workspaceId);

    Optional<SlaInstance> findByWorkItemIdAndTargetId(String workItemId, String targetId);

    /** Running/paused clocks across all workspaces — the clock scheduler's working set. */
    List<SlaInstance> findByStateIn(List<String> states);

    long countByWorkspaceIdAndState(String workspaceId, String state);
}
