package com.bcits.works;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ImpedimentRepository extends JpaRepository<Impediment, String> {
    List<Impediment> findByWorkspaceIdAndDeletedAtIsNullOrderByCreatedAtDesc(String workspaceId);
    List<Impediment> findByProjectIdAndDeletedAtIsNullOrderByCreatedAtDesc(String projectId);
    List<Impediment> findBySprintIdAndDeletedAtIsNullOrderByCreatedAtDesc(String sprintId);
}
