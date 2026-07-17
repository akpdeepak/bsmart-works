package com.bcits.works.ai;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/** Custom AI assistants, always workspace-scoped (RB-40 §1). */
public interface AiAssistantRepository extends JpaRepository<AiAssistant, String> {

    List<AiAssistant> findByWorkspaceIdOrderByCreatedAtDesc(String workspaceId);

    List<AiAssistant> findByWorkspaceIdAndEnabledTrueOrderByName(String workspaceId);

    Optional<AiAssistant> findByWorkspaceIdAndId(String workspaceId, String id);
}
