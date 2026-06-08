package com.bcits.works;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

/**
 * Data access for SCIM provisioning tokens. Workspace-scoped (RB-40 §1).
 */
public interface ScimTokenRepository extends JpaRepository<ScimToken, String> {

    List<ScimToken> findByWorkspaceIdAndRevokedAtIsNull(String workspaceId);

    Optional<ScimToken> findByTokenHashAndRevokedAtIsNull(String tokenHash);
}
