package com.bcits.works.projects.api;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Collection;
import java.util.List;

public interface ProjectRepository extends JpaRepository<Project, String> {
    List<Project> findByWorkspaceId(String workspaceId);
    List<Project> findByWorkspaceIdIn(Collection<String> workspaceIds);
    java.util.Optional<Project> findBySlug(String slug);
}
