package com.bcits.works;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ExecutiveBriefingRepository extends JpaRepository<ExecutiveBriefing, String> {
    List<ExecutiveBriefing> findByWorkspaceIdOrderByCreatedAtDesc(String workspaceId);
}
