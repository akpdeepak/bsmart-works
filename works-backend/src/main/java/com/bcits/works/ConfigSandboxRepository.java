package com.bcits.works;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/** Sandbox configurations — every query is workspace-scoped (RB-40 §1). */
public interface ConfigSandboxRepository extends JpaRepository<ConfigSandbox, String> {

    List<ConfigSandbox> findByWorkspaceIdOrderByCreatedAtDesc(String workspaceId);

    /** Fetch by id but scoped to the workspace so a sandbox can never be read across tenants. */
    Optional<ConfigSandbox> findByIdAndWorkspaceId(String id, String workspaceId);
}
