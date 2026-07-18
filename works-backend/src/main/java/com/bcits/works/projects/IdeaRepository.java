package com.bcits.works.projects;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface IdeaRepository extends JpaRepository<Idea, String> {
    List<Idea> findByWorkspaceIdAndDeletedAtIsNullOrderByCreatedAtDesc(String workspaceId);
    List<Idea> findByWorkspaceIdAndStatusAndDeletedAtIsNullOrderByCreatedAtDesc(String workspaceId, String status);
}
