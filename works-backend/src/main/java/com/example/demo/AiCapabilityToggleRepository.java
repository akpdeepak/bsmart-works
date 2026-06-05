package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

/**
 * Data access for {@link AiCapabilityToggle}. All lookups are workspace-scoped (RB-40 §1): a toggle
 * is an explicit per-capability override within one tenant, absence meaning "inherit the workspace
 * policy".
 */
public interface AiCapabilityToggleRepository extends JpaRepository<AiCapabilityToggle, String> {

    List<AiCapabilityToggle> findByWorkspaceId(String workspaceId);

    Optional<AiCapabilityToggle> findByWorkspaceIdAndCapability(String workspaceId, String capability);
}
