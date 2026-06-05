package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

/**
 * Data access for {@link AiUserPreference}. Workspace-scoped (RB-40 §1): a preference is keyed by
 * (workspace, user) and is the only AI-plane setting a non-admin may change, only for their own id.
 */
public interface AiUserPreferenceRepository extends JpaRepository<AiUserPreference, String> {

    Optional<AiUserPreference> findByWorkspaceIdAndUserId(String workspaceId, String userId);
}
