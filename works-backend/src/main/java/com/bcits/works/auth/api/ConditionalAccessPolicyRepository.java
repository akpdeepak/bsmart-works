package com.bcits.works.auth.api;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

/** Conditional-access policies — every finder is workspace-scoped (RB-40 §1). */
public interface ConditionalAccessPolicyRepository extends JpaRepository<ConditionalAccessPolicy, String> {
    List<ConditionalAccessPolicy> findByWorkspaceIdOrderByCreatedAtAsc(String workspaceId);
    List<ConditionalAccessPolicy> findByWorkspaceIdAndEnabledTrue(String workspaceId);
}
