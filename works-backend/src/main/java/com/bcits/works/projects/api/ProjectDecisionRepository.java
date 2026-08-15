package com.bcits.works.projects.api;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ProjectDecisionRepository extends JpaRepository<ProjectDecision, String> {
    List<ProjectDecision> findByProjectIdOrderByCreatedAtDesc(String projectId);
}
