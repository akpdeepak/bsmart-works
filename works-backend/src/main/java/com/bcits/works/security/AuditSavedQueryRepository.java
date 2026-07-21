package com.bcits.works.security;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AuditSavedQueryRepository extends JpaRepository<AuditSavedQuery, String> {
    List<AuditSavedQuery> findByWorkspaceIdOrderByCreatedAtDesc(String workspaceId);
}
