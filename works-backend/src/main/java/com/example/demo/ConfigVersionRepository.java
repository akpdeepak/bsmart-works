package com.example.demo;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/** Config version history — every query is workspace-scoped (RB-40 §1). */
public interface ConfigVersionRepository extends JpaRepository<ConfigVersion, String> {

    List<ConfigVersion> findByWorkspaceIdOrderByVersionNumberDesc(String workspaceId);

    Optional<ConfigVersion> findByWorkspaceIdAndVersionNumber(String workspaceId, Integer versionNumber);

    Optional<ConfigVersion> findTopByWorkspaceIdOrderByVersionNumberDesc(String workspaceId);
}
