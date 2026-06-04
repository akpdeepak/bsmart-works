package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

/**
 * Data access for SLA policies. All workspace lookups are tenant-scoped (RB-40 §1);
 * template lookups are global by design (cloned into workspace-owned policies on use).
 */
public interface SlaPolicyRepository extends JpaRepository<SlaPolicy, String> {

    List<SlaPolicy> findByWorkspaceIdOrderByNameAsc(String workspaceId);

    List<SlaPolicy> findByWorkspaceIdAndActiveTrue(String workspaceId);

    List<SlaPolicy> findByIsTemplateTrueOrderByNameAsc();
}
