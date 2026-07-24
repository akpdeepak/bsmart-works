package com.bcits.works.knowledge.api;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface KnowledgeSpaceRepository extends JpaRepository<KnowledgeSpace, String> {
    List<KnowledgeSpace> findAllByOrderByNameAsc();
    Page<KnowledgeSpace> findAllByOrderByNameAsc(Pageable pageable);
    List<KnowledgeSpace> findByWorkspaceIdOrderByNameAsc(String workspaceId);
    Page<KnowledgeSpace> findByWorkspaceIdOrderByNameAsc(String workspaceId, Pageable pageable);

    /** Workspace-scoped space list (RB-40 §1): spaces in the caller's workspaces only. */
    @Query(nativeQuery = true,
           value = "SELECT ks.* FROM knowledge_spaces ks " +
                   "WHERE ks.workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = :userId) " +
                   "ORDER BY ks.name ASC",
           countQuery = "SELECT COUNT(*) FROM knowledge_spaces ks " +
                        "WHERE ks.workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = :userId)")
    Page<KnowledgeSpace> findAllScopedToUser(@Param("userId") String userId, Pageable pageable);
}
