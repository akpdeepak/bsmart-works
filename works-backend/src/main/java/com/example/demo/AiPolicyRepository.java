package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

/**
 * Data access for AI scope policies. Every lookup is workspace-scoped (RB-40 §1) so one
 * workspace can never read or alter another's AI configuration.
 */
public interface AiPolicyRepository extends JpaRepository<AiPolicy, String> {

    // Resolution and upsert both load the workspace's policy set and match in Java — derived
    // finders with null capability/userId would compile to "= NULL" and never match a WORKSPACE row.
    List<AiPolicy> findByWorkspaceId(String workspaceId);
}
