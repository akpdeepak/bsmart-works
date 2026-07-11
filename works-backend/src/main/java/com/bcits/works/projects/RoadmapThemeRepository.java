package com.bcits.works.projects;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RoadmapThemeRepository extends JpaRepository<RoadmapTheme, String> {
    List<RoadmapTheme> findByWorkspaceIdAndDeletedAtIsNullOrderByDisplayOrderAscCreatedAtAsc(String workspaceId);
}
