package com.bcits.works.shared;

import org.springframework.data.jpa.repository.JpaRepository;

/** Per-workspace security settings, keyed by workspace id (workspace-scoped by construction). */
public interface WorkspaceSecuritySettingsRepository extends JpaRepository<WorkspaceSecuritySettings, String> {
}
