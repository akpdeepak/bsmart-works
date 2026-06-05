package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

/**
 * Data access for SLA policies. All lookups are workspace-scoped so a policy can never be read
 * across tenants (RB-40 §1); the scheduler's working set ({@link #findByActiveTrue()}) is the one
 * deliberate cross-workspace read, used only to drive evaluation and never returned to a caller.
 */
public interface SlaPolicyRepository extends JpaRepository<SlaPolicy, String> {

    List<SlaPolicy> findByWorkspaceIdOrderByUpdatedAtDesc(String workspaceId);

    List<SlaPolicy> findByWorkspaceIdAndActiveTrue(String workspaceId);

    /** Active policies across all workspaces — the evaluation scheduler's working set. */
    List<SlaPolicy> findByActiveTrue();
}
