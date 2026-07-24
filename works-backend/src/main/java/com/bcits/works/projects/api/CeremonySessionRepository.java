package com.bcits.works.projects.api;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CeremonySessionRepository extends JpaRepository<CeremonySession, String> {
    List<CeremonySession> findByProjectIdOrderByCreatedAtDesc(String projectId);
    List<CeremonySession> findByProjectIdAndStatusOrderByCreatedAtDesc(String projectId, String status);
}
