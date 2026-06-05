package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

/**
 * Data access for {@link AiWorkspacePolicy}. The id <em>is</em> the workspace id, so every lookup is
 * inherently workspace-scoped (RB-40 §1) — there is exactly one policy row per tenant.
 */
public interface AiWorkspacePolicyRepository extends JpaRepository<AiWorkspacePolicy, String> {

    Optional<AiWorkspacePolicy> findByWorkspaceId(String workspaceId);
}
