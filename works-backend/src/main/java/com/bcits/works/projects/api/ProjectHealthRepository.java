package com.bcits.works.projects.api;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ProjectHealthRepository extends JpaRepository<ProjectHealth, String> {
    Optional<ProjectHealth> findFirstByProjectIdOrderByCreatedAtDesc(String projectId);
}
