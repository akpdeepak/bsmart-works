package com.bcits.works;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/** Saved conversational dashboards, always workspace-scoped (RB-40 §1). */
public interface ConversationalDashboardRepository extends JpaRepository<ConversationalDashboard, String> {

    List<ConversationalDashboard> findByWorkspaceIdOrderByCreatedAtDesc(String workspaceId);

    Optional<ConversationalDashboard> findByWorkspaceIdAndId(String workspaceId, String id);
}
