package com.bcits.works;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface WorkItemRepository extends JpaRepository<WorkItem, String> {
    List<WorkItem> findByAssigneeId(String assigneeId);
    List<WorkItem> findByProjectId(String projectId);

    @Query("SELECT w FROM WorkItem w WHERE LOWER(w.title) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(COALESCE(w.description, '')) LIKE LOWER(CONCAT('%', :q, '%'))")
    List<WorkItem> search(@Param("q") String query);
}
