package com.bcits.works;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

/**
 * Data access for compliance violations. All lookups are workspace-scoped so a violation can
 * never be read across tenants (RB-40 §1). "Active" means OPEN or ACKNOWLEDGED — the states a
 * re-evaluation reconciles against.
 */
public interface ComplianceViolationRepository extends JpaRepository<ComplianceViolation, String> {

    List<ComplianceViolation> findByWorkspaceIdOrderByDetectedAtDesc(String workspaceId);

    List<ComplianceViolation> findByWorkspaceIdAndStatusOrderByDetectedAtDesc(String workspaceId, String status);

    List<ComplianceViolation> findByWorkspaceIdAndProjectIdOrderByDetectedAtDesc(String workspaceId, String projectId);

    List<ComplianceViolation> findByRuleIdOrderByDetectedAtDesc(String ruleId);

    /** Currently-active violations for a rule — the set a re-evaluation reconciles against. */
    List<ComplianceViolation> findByRuleIdAndStatusIn(String ruleId, List<String> statuses);

    /** Open, un-escalated violations across all rules — the escalation runner's candidate set. */
    List<ComplianceViolation> findByStatusAndEscalatedFalse(String status);
}
