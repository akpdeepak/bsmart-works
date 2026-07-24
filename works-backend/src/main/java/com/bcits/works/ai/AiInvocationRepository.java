package com.bcits.works.ai;
import com.bcits.works.workspaces.api.Workspace;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/** Workspace-scoped (RB-40 §1) access to the append-only AI audit log. */
public interface AiInvocationRepository extends JpaRepository<AiInvocation, String> {

    Page<AiInvocation> findByWorkspaceIdOrderByCreatedAtDesc(String workspaceId, Pageable pageable);
}
