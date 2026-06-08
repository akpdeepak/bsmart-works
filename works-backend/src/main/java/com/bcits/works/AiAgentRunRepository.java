package com.bcits.works;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/** Agent runs, always workspace-scoped (RB-40 §1). */
public interface AiAgentRunRepository extends JpaRepository<AiAgentRun, String> {

    List<AiAgentRun> findByWorkspaceIdOrderByCreatedAtDesc(String workspaceId);

    Optional<AiAgentRun> findByWorkspaceIdAndId(String workspaceId, String id);
}
