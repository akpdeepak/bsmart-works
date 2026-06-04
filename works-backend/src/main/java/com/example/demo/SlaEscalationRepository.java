package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

/** Data access for SLA escalation steps, always read through their owning policy. */
public interface SlaEscalationRepository extends JpaRepository<SlaEscalation, String> {

    List<SlaEscalation> findByPolicyIdOrderByThresholdPctAscSortOrderAsc(String policyId);
}
