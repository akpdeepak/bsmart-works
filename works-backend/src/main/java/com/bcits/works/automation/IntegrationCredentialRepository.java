package com.bcits.works.automation;
import com.bcits.works.workspaces.api.Workspace;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/** Spring Data JPA repository for {@link IntegrationCredential}. Workspace-scoped (RB-40 §1). */
public interface IntegrationCredentialRepository extends JpaRepository<IntegrationCredential, String> {

    Optional<IntegrationCredential> findByWorkspaceIdAndProvider(String workspaceId, String provider);
}
