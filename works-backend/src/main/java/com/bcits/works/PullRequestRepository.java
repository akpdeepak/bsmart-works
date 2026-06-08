package com.bcits.works;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PullRequestRepository extends JpaRepository<PullRequest, String> {
    // Every finder is workspace-scoped (RB-40 §1) — no method returns rows across workspaces.
    List<PullRequest> findByWorkspaceIdOrderByUpdatedAtDesc(String workspaceId);
    List<PullRequest> findByWorkspaceIdAndStatusOrderByUpdatedAtDesc(String workspaceId, String status);
    List<PullRequest> findByWorkItemIdOrderByCreatedAtDesc(String workItemId);
    List<PullRequest> findByWorkspaceIdAndAuthorIdOrderByUpdatedAtDesc(String workspaceId, String authorId);
}
