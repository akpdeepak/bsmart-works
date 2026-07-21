package com.bcits.works.sla;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

/**
 * Data access for SLA escalation steps. Loaded through their owning policy, which is workspace-scoped
 * (RB-40 §1).
 */
public interface SlaEscalationRepository extends JpaRepository<SlaEscalation, String> {

    List<SlaEscalation> findByPolicyIdOrderBySortOrderAsc(String policyId);

    void deleteByPolicyId(String policyId);
}
