package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

/**
 * Data access for SLA targets. Targets are always loaded through their owning policy, which is
 * itself workspace-scoped (RB-40 §1).
 */
public interface SlaTargetRepository extends JpaRepository<SlaTarget, String> {

    List<SlaTarget> findByPolicyIdOrderBySortOrderAsc(String policyId);

    void deleteByPolicyId(String policyId);
}
