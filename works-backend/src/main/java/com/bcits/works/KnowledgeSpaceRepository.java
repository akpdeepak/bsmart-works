package com.bcits.works;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface KnowledgeSpaceRepository extends JpaRepository<KnowledgeSpace, String> {
    List<KnowledgeSpace> findAllByOrderByNameAsc();
    Page<KnowledgeSpace> findAllByOrderByNameAsc(Pageable pageable);
    List<KnowledgeSpace> findByWorkspaceIdOrderByNameAsc(String workspaceId);
    Page<KnowledgeSpace> findByWorkspaceIdOrderByNameAsc(String workspaceId, Pageable pageable);
}
