package com.bcits.works.workspaces;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Configuration templates. The visible library for a workspace is its own templates plus every
 * shareable one (RB-40 §1 — a workspace never sees another workspace's private templates).
 */
public interface ConfigTemplateRepository extends JpaRepository<ConfigTemplate, String> {

    @Query("SELECT t FROM ConfigTemplate t WHERE t.shareable = true OR t.ownerWorkspaceId = :ws "
            + "ORDER BY t.createdAt DESC")
    List<ConfigTemplate> findVisibleTo(@Param("ws") String workspaceId);
}
