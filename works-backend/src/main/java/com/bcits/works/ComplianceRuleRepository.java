package com.bcits.works;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

/**
 * Data access for compliance rules. All lookups are workspace-scoped so a rule can
 * never be read across tenants (RB-40 §1); template lookups are global by design.
 */
public interface ComplianceRuleRepository extends JpaRepository<ComplianceRule, String> {

    List<ComplianceRule> findByWorkspaceId(String workspaceId);

    List<ComplianceRule> findByWorkspaceIdOrderByUpdatedAtDesc(String workspaceId);

    List<ComplianceRule> findByWorkspaceIdAndProjectId(String workspaceId, String projectId);

    List<ComplianceRule> findByWorkspaceIdAndActiveTrue(String workspaceId);

    /** Active rules of a given evaluation mode across all workspaces — the scheduler's working set. */
    List<ComplianceRule> findByActiveTrueAndEvaluationMode(String evaluationMode);

    List<ComplianceRule> findByIsTemplateTrue();

    List<ComplianceRule> findByIsTemplateTrueOrderByNameAsc();
}
