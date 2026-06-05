package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

/**
 * Data access for {@link AiInvocation} — the per-call audit + usage source. Every lookup is
 * workspace-scoped (RB-40 §1); the usage dashboard and audit log read from here only within a
 * tenant.
 */
public interface AiInvocationRepository extends JpaRepository<AiInvocation, String> {

    List<AiInvocation> findByWorkspaceIdOrderByCreatedAtDesc(String workspaceId);
}
