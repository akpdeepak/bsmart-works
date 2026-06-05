package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

/**
 * Data access for public-API tokens. Workspace-scoped for management (RB-40 §1); verification looks
 * up by the non-secret prefix and then compares hashes.
 */
public interface ApiTokenRepository extends JpaRepository<ApiToken, String> {

    List<ApiToken> findByWorkspaceIdOrderByCreatedAtDesc(String workspaceId);

    List<ApiToken> findByTokenPrefixAndRevokedFalse(String tokenPrefix);
}
