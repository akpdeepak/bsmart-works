package com.bcits.works;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

/**
 * Data access for voluntary individual-metric shares. Workspace-scoped (RB-40 §1).
 */
public interface MetricShareRepository extends JpaRepository<MetricShare, String> {

    List<MetricShare> findByWorkspaceIdAndOwnerUserId(String workspaceId, String ownerUserId);

    List<MetricShare> findByWorkspaceIdAndViewerUserId(String workspaceId, String viewerUserId);

    Optional<MetricShare> findByWorkspaceIdAndOwnerUserIdAndViewerUserId(
        String workspaceId, String ownerUserId, String viewerUserId);
}
