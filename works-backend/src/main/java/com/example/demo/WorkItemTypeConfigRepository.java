package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface WorkItemTypeConfigRepository extends JpaRepository<WorkItemTypeConfig, String> {
    List<WorkItemTypeConfig> findByWorkspaceId(String workspaceId);
    List<WorkItemTypeConfig> findByProjectId(String projectId);
}
