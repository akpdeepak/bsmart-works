package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/** AI memory slots, always scoped to (workspace, user) (RB-40 §1). */
public interface AiMemoryRepository extends JpaRepository<AiMemory, String> {

    List<AiMemory> findByWorkspaceIdAndUserIdOrderByUpdatedAtDesc(String workspaceId, String userId);

    List<AiMemory> findByWorkspaceIdAndUserIdAndKindOrderByUpdatedAtDesc(String workspaceId, String userId, String kind);

    Optional<AiMemory> findByWorkspaceIdAndUserIdAndAssistantIdAndKindAndMemKey(
        String workspaceId, String userId, String assistantId, String kind, String memKey);
}
