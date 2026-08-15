package com.bcits.works.projects.api;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ProjectRiskRepository extends JpaRepository<ProjectRisk, String> {
    List<ProjectRisk> findByProjectIdOrderByCreatedAtDesc(String projectId);
}
