package com.bcits.works.projects;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RetroSessionRepository extends JpaRepository<RetroSession, String> {
    List<RetroSession> findByProjectIdAndDeletedAtIsNullOrderByCreatedAtDesc(String projectId);
}
