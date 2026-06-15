package com.bcits.works;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface SavedViewRepository extends JpaRepository<SavedView, String> {

    List<SavedView> findByWorkspaceIdAndDeletedAtIsNullOrderByDisplayOrderAscNameAsc(String workspaceId);

    List<SavedView> findByWorkspaceIdAndProjectIdAndDeletedAtIsNullOrderByDisplayOrderAscNameAsc(
            String workspaceId, String projectId);

    @Query("SELECT COALESCE(MAX(v.displayOrder), -1) FROM SavedView v WHERE v.workspaceId = :workspaceId AND v.deletedAt IS NULL")
    int maxDisplayOrder(String workspaceId);
}
