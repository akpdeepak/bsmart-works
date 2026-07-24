package com.bcits.works.ai;
import com.bcits.works.workspaces.api.Workspace;

import org.springframework.data.jpa.repository.JpaRepository;

/** Workspace-scoped (RB-40 §1) access to per-workspace AI settings (primary key = workspace id). */
public interface AiWorkspaceSettingsRepository extends JpaRepository<AiWorkspaceSettings, String> {
}
