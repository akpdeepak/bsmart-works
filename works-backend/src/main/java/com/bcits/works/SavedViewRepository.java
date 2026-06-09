package com.bcits.works;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SavedViewRepository extends JpaRepository<SavedView, String> {

    List<SavedView> findByWorkspaceIdAndDeletedAtIsNullOrderByNameAsc(String workspaceId);

    List<SavedView> findByWorkspaceIdAndProjectIdAndDeletedAtIsNullOrderByNameAsc(
            String workspaceId, String projectId);
}
