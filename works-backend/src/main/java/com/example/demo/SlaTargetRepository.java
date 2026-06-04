package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

/** Data access for SLA targets, always read through their owning policy. */
public interface SlaTargetRepository extends JpaRepository<SlaTarget, String> {

    List<SlaTarget> findByPolicyIdOrderBySortOrderAsc(String policyId);
}
