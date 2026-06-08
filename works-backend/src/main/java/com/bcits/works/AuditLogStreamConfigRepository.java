package com.bcits.works;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

/** SIEM streaming configs — every finder is workspace-scoped (RB-40 §1). */
public interface AuditLogStreamConfigRepository extends JpaRepository<AuditLogStreamConfig, String> {
    List<AuditLogStreamConfig> findByWorkspaceIdOrderByCreatedAtAsc(String workspaceId);
}
