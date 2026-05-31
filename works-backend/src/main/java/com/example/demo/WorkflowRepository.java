package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface WorkflowRepository extends JpaRepository<Workflow, String> {
    List<Workflow> findByWorkspaceId(String workspaceId);
    List<Workflow> findByProjectId(String projectId);
    List<Workflow> findByWorkspaceIdAndProjectId(String workspaceId, String projectId);
}
