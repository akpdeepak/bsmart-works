package com.bcits.works;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface StandupSessionRepository extends JpaRepository<StandupSession, String> {
    List<StandupSession> findByProjectIdOrderByCreatedAtDesc(String projectId);
    List<StandupSession> findByWorkspaceIdOrderByCreatedAtDesc(String workspaceId);
}
