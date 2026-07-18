package com.bcits.works.security;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

/** Access anomalies — every finder is workspace-scoped (RB-40 §1). */
public interface AccessAnomalyRepository extends JpaRepository<AccessAnomaly, String> {
    List<AccessAnomaly> findByWorkspaceIdOrderByDetectedAtDesc(String workspaceId);
    List<AccessAnomaly> findByWorkspaceIdAndStatusOrderByDetectedAtDesc(String workspaceId, String status);
}
