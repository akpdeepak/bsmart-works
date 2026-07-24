package com.bcits.works.automation;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

/**
 * Data access for automation rules. Workspace-scoped (RB-40 §1); the trigger query is the engine's
 * working set across all workspaces and is filtered by tenant before any action runs.
 */
public interface AutomationRuleRepository extends JpaRepository<AutomationRule, String> {

    List<AutomationRule> findByWorkspaceIdOrderByUpdatedAtDesc(String workspaceId);

    List<AutomationRule> findByWorkspaceIdAndEnabledTrueAndTriggerType(String workspaceId, String triggerType);

    List<AutomationRule> findByEnabledTrueAndTriggerType(String triggerType);
}
