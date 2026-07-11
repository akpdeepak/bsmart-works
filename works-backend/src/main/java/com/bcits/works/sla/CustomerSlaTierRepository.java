package com.bcits.works.sla;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

/**
 * Data access for customer SLA tiers. Always workspace-scoped (RB-40 §1); a request's targets are
 * resolved via {@code findByWorkspaceIdAndTier}.
 */
public interface CustomerSlaTierRepository extends JpaRepository<CustomerSlaTier, String> {

    List<CustomerSlaTier> findByWorkspaceIdOrderByResolutionMinutesAsc(String workspaceId);

    Optional<CustomerSlaTier> findByWorkspaceIdAndTier(String workspaceId, String tier);
}
