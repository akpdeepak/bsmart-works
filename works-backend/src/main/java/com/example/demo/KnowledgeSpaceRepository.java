package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface KnowledgeSpaceRepository extends JpaRepository<KnowledgeSpace, String> {
    List<KnowledgeSpace> findAllByOrderByNameAsc();
    List<KnowledgeSpace> findByWorkspaceIdOrderByNameAsc(String workspaceId);
}
