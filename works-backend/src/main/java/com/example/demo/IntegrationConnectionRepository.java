package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

/**
 * Data access for integration connections. Workspace-scoped (RB-40 §1).
 */
public interface IntegrationConnectionRepository extends JpaRepository<IntegrationConnection, String> {

    List<IntegrationConnection> findByWorkspaceIdOrderByProviderAsc(String workspaceId);

    List<IntegrationConnection> findByWorkspaceIdAndProvider(String workspaceId, String provider);

    Optional<IntegrationConnection> findByWorkspaceIdAndProviderAndName(
        String workspaceId, String provider, String name);
}
