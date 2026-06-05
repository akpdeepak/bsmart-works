package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

/**
 * Data access for {@link AiDataBoundary}. The id is the workspace id, so the single boundary row is
 * inherently workspace-scoped (RB-40 §1). Conservative defaults (block PII + financial) apply when
 * no row exists, so a workspace is private by default.
 */
public interface AiDataBoundaryRepository extends JpaRepository<AiDataBoundary, String> {

    Optional<AiDataBoundary> findByWorkspaceId(String workspaceId);
}
